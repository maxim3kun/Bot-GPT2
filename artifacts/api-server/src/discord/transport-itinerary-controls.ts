import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits,
  type APIEmbed, type Message, type MessageComponentInteraction,
} from "discord.js";
import type { TransportConversation, TravelReply } from "./transport-conversation.js";
import { comparisonPage, hasMapPreview, itineraryPages, itinerarySource, journeyMapMode, mapsDirectionsUrl, routeMapCaption } from "./transport-itinerary-presentation.js";
import { ROAD_SOURCE } from "./ign-road-planner.js";
import { BIKE_SOURCE, OSM_ATTRIBUTION } from "./osm-bike-planner.js";
import { ITINERARY_SOURCE } from "./transport-itinerary-presentation.js";
import type { JourneyComparison, VerifiedJourney } from "./transport-planner-types.js";
import { renderRouteMap, ROUTE_MAP_FILENAME } from "./transport-route-map.js";

export type TransportAuthorization = (message: Message, language: string) => Promise<boolean>;
type Payload = {
  content: string; embeds: APIEmbed[]; components: ActionRowBuilder<ButtonBuilder>[];
  allowedMentions: { parse: [] };
  files?: AttachmentBuilder[];
};
type RouteMapRenderer = (journey: VerifiedJourney) => Promise<Buffer | undefined>;
function applyRouteMap(pages: ReturnType<typeof itineraryPages>, journey: VerifiedJourney,
  image: Buffer | undefined, french: boolean) {
  const caption = image ? routeMapCaption(journey, french) : "";
  const failure = !image && hasMapPreview(journey)
    ? (french ? "Aperçu de la carte indisponible."
      : "Map preview unavailable.")
    : "";
  return pages.map(item => {
    const note = caption || failure;
    return {
      ...item,
      embed: {
        ...item.embed,
        ...(image ? { image: { url: `attachment://${ROUTE_MAP_FILENAME}` } } : {}),
        ...(note && !item.embed.footer?.text?.includes(note)
          ? { footer: { text: [item.embed.footer?.text, note].filter(Boolean).join(" · ") } } : {}),
      },
      ...(failure ? { content: `${item.content}\n\n${failure}` } : {}),
    };
  });
}
function canEmbed(message: Message) {
  return !message.guildId || "permissionsFor" in message.channel &&
    !!message.client.user && !!message.channel.permissionsFor(message.client.user)?.has(PermissionFlagsBits.EmbedLinks);
}
const missingPermissions = (error: unknown) => error && typeof error === "object" && "code" in error && error.code === 50013;

/** Each card owns one immutable route ticket, not the latest mutable conversation. */
export class ItineraryControls {
  private active = new Map<string, { stop: (reason: string) => void }>();
  constructor(private service: TransportConversation, private authorize: TransportAuthorization,
    private mapRenderer: RouteMapRenderer = renderRouteMap) {}
  invalidate(scope: string) { this.active.get(scope)?.stop("replaced"); }

  async sendComparison(message: Message, comparison: JourneyComparison, language: string) {
    const fr = language === "fr", t = (a: string, b: string) => fr ? a : b;
    const page = comparisonPage(comparison, fr);
    const recommended = comparison.entries.find(entry => entry.mode === comparison.recommended && entry.journey)
      ?? comparison.entries.find(entry => entry.journey);
    const mapBuffer = recommended?.journey && hasMapPreview(recommended.journey)
      ? await this.mapRenderer(recommended.journey).catch(() => undefined) : undefined;
    const mapLabel = recommended ? ({
      walk: t("Carte · à pied", "Map · walking"),
      car: t("Carte · voiture", "Map · driving"),
      bike: t("Carte · vélo", "Map · cycling"),
      transit: t("Carte · transports", "Map · transit"),
    } as const)[recommended.mode] : "";
    const map = recommended && new ButtonBuilder().setStyle(ButtonStyle.Link)
      .setLabel(mapLabel)
      .setURL(mapsDirectionsUrl(recommended.origin, recommended.destination, recommended.mode));
    const components = [new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("IGN").setURL(ROAD_SOURCE),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Vélo OSM").setURL(BIKE_SOURCE),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("© OpenStreetMap").setURL(OSM_ATTRIBUTION),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(t("Transports", "Transit")).setURL(ITINERARY_SOURCE),
      ...(map ? [map] : []),
    )];
    const embedded = canEmbed(message);
    let content = embedded ? "" : page.content;
    let embed = page.embed;
    if (mapBuffer && recommended?.journey) {
      const caption = routeMapCaption(recommended.journey, fr);
      embed = { ...embed, image: { url: `attachment://${ROUTE_MAP_FILENAME}` },
        footer: { text: embed.footer?.text?.includes(caption) ? embed.footer.text
          : [embed.footer?.text, caption].filter(Boolean).join(" · ") } };
      content = page.content;
    } else if (recommended?.journey && hasMapPreview(recommended.journey)) {
      const notice = t("Aperçu indisponible : le fond IGN n’a pas pu être chargé. Aucun aperçu de remplacement n’est affiché.",
        "Preview unavailable: the IGN basemap could not be loaded. No substitute map is shown.");
      embed = { ...embed, footer: { text: [embed.footer?.text, notice].filter(Boolean).join(" · ") } };
      content = `${page.content}\n\n${notice}`;
    }
    const payload = {
      content: embedded ? "" : content,
      embeds: embedded ? [embed] : [],
      components,
      allowedMentions: { parse: [] as [] },
      files: mapBuffer ? [new AttachmentBuilder(mapBuffer, { name: ROUTE_MAP_FILENAME })] : [],
    };
    try { await message.reply(payload); }
    catch (error) {
      if (!embedded || !missingPermissions(error)) throw error;
      await message.reply({ content, embeds: [], components, allowedMentions: { parse: [] },
        files: mapBuffer ? [new AttachmentBuilder(mapBuffer, { name: ROUTE_MAP_FILENAME })] : [] });
    }
  }

  async send(message: Message, scope: string, result: TravelReply, language: string) {
    const view = result.itinerary;
    if (!view || !this.service.remaining(scope, view.ticket)) return;
    const ticket = view.ticket, fr = language === "fr", t = (a: string, b: string) => fr ? a : b;
    const id = `transport-trip:${randomUUID()}`;
    let mapBuffer = hasMapPreview(view.journey) ? await this.mapRenderer(view.journey).catch(() => undefined) : undefined;
    let pages = applyRouteMap(itineraryPages(view, fr), view.journey, mapBuffer, fr), page = 0, expanded = false;
    let compactRoad = !!view.journey.road && pages.length > 1;
    let lastText = pages[0]!.content;
    let embedded = canEmbed(message), live = true, busy = false;
    const sourceLabel = view.journey.road?.source === "openstreetmap" ? "OSM" : view.journey.road ? "IGN" : "IDFM";
    const source = () => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(sourceLabel).setURL(itinerarySource(view.journey));
    const map = () => new ButtonBuilder().setStyle(ButtonStyle.Link)
      .setEmoji({ id: "1574083298232111215", name: "Maps" })
      .setURL(mapsDirectionsUrl(view.origin, view.destination, journeyMapMode(view.journey)));
    const button = (name: string, label: string, style = ButtonStyle.Secondary) =>
      new ButtonBuilder().setCustomId(`${id}:${name}`).setLabel(label).setStyle(style);
    const rows = (closed = false) => {
      if (closed) return [new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...(compactRoad ? [map()] : [source(), map()]),
      )];
      const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(button("refresh", t("Actualiser", "Refresh"), ButtonStyle.Primary));
      if (compactRoad) {
        const detailCount = pages.length - 1;
        if (expanded && detailCount > 1) {
          primary.addComponents(button("prev", "←").setDisabled(page === 0), button("next", "→").setDisabled(page >= detailCount - 1));
          return [primary, new ActionRowBuilder<ButtonBuilder>().addComponents(
            map(), button("summary", t("Résumé", "Summary")), button("close", t("Fermer", "Close")),
          )];
        }
        return [new ActionRowBuilder<ButtonBuilder>().addComponents(
          button("refresh", t("Actualiser", "Refresh"), ButtonStyle.Primary), map(),
          button(expanded ? "summary" : "details", expanded ? t("Résumé", "Summary") : "🗺️"),
          button("close", t("Fermer", "Close")),
        )];
      } else if (pages.length > 1) primary.addComponents(
        button("prev", "←").setDisabled(page === 0), button("next", "→").setDisabled(page === pages.length - 1));
      const secondary = [source(), map()];
      secondary.push(button("close", t("Fermer", "Close")));
      if (pages.length <= 1) { primary.addComponents(...secondary); return [primary]; }
      if (compactRoad && (!expanded || pages.length === 2)) { primary.addComponents(...secondary); return [primary]; }
      return [primary, new ActionRowBuilder<ButtonBuilder>().addComponents(...secondary)];
    };
    const visiblePage = () => pages[compactRoad ? (expanded ? page + 1 : 0) : page];
    const payload = (notice = "", closed = false): Payload => ({
      content: [embedded && visiblePage() ? "" : lastText, notice].filter(Boolean).join("\n\n"),
      embeds: embedded && visiblePage() ? [visiblePage()!.embed] : [],
      components: rows(closed), allowedMentions: { parse: [] },
      files: mapBuffer ? [new AttachmentBuilder(mapBuffer, { name: ROUTE_MAP_FILENAME })] : [],
    });
    const write = async (writer: (data: Payload) => Promise<Message>, notice = "", closed = false) => {
      if (embedded && !canEmbed(message)) embedded = false;
      try { return await writer(payload(notice, closed)); }
      catch (error) {
        if (!embedded || !missingPermissions(error)) throw error;
        embedded = false;
        return writer(payload(notice, closed));
      }
    };
    const prompt = await write(data => message.reply(data));
    if (!this.service.remaining(scope, ticket)) {
      await write(data => prompt.edit(data), t("Recherche remplacée ou expirée.", "Search replaced or expired."), true).catch(() => undefined);
      return;
    }
    // A fixed deadline: refreshing never keeps a card alive indefinitely.
    const collector = prompt.createMessageComponentCollector({ time: Math.min(5 * 60_000, this.service.remaining(scope, ticket)) });
    let editTail: Promise<unknown> = Promise.resolve();
    const edit = (notice = "", closed = false) => {
      // Serializing edits ensures a late refresh can never restore closed controls.
      const work = editTail.catch(() => undefined).then(async () => {
        if (!closed && (!live || !this.service.remaining(scope, ticket))) return;
        await write(data => prompt.edit(data), notice, closed);
      });
      editTail = work;
      return work;
    };
    const entry = { stop: (reason: string) => collector.stop(reason) };
    if (this.active.size >= 100 && !this.active.has(scope)) this.active.values().next().value?.stop("capacity");
    this.active.get(scope)?.stop("replaced");
    this.active.set(scope, entry);
    const ephemeral = (interaction: MessageComponentInteraction, content: string) =>
      interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    const interact = async (interaction: MessageComponentInteraction) => {
      if (!interaction.isButton() || !interaction.customId.startsWith(`${id}:`)) return;
      if (interaction.user.id !== message.author.id || interaction.channelId !== message.channelId ||
        interaction.guildId !== message.guildId || interaction.message.id !== prompt.id) {
        await ephemeral(interaction, t("Cette carte appartient à la personne qui a demandé ce trajet.", "This card belongs to the person who requested this journey."));
        return;
      }
      const action = interaction.customId.slice(id.length + 1);
       if (!["refresh", "prev", "next", "details", "summary", "close"].includes(action)) return;
      if (!live || !this.service.remaining(scope, ticket)) {
        await ephemeral(interaction, t("Cette recherche est expirée ou remplacée. Demande un nouveau trajet.", "This search expired or was replaced. Request a new journey."));
        collector.stop("replaced");
        return;
      }
      if (action === "close") {
        await interaction.deferUpdate();
        collector.stop("closed");
        return;
      }
      if (busy) { await ephemeral(interaction, t("Le calcul est en cours. Patiente un instant.", "The calculation is running. Please wait.")); return; }
      busy = true;
      try {
        await interaction.deferUpdate();
        if (!await this.authorize(message, language)) { collector.stop("denied"); return; }
        if (!live || !this.service.remaining(scope, ticket)) { collector.stop("replaced"); return; }
        if (compactRoad && action === "details") {
          expanded = true; page = 0; lastText = pages[1]?.content ?? lastText;
          await edit(); return;
        }
        if (compactRoad && action === "summary") {
          expanded = false; page = 0; lastText = pages[0]?.content ?? lastText;
          await edit(); return;
        }
        if (action === "prev" || action === "next") {
          const lastPage = compactRoad ? pages.length - 2 : pages.length - 1;
          page = Math.max(0, Math.min(lastPage, page + (action === "next" ? 1 : -1)));
          lastText = pages[compactRoad ? page + 1 : page]?.content ?? lastText;
          await edit(); return;
        }
        const updated = await this.service.refresh(scope, ticket, language);
        if (!await this.authorize(message, language)) { collector.stop("denied"); return; }
        if (!live || !this.service.remaining(scope, ticket) || !updated?.content) {
          collector.stop("replaced"); return;
        }
        mapBuffer = updated.itinerary && hasMapPreview(updated.itinerary.journey)
          ? await this.mapRenderer(updated.itinerary.journey).catch(() => undefined) : undefined;
        pages = updated.itinerary ? applyRouteMap(itineraryPages(updated.itinerary, fr),
          updated.itinerary.journey, mapBuffer, fr) : [];
        compactRoad = !!updated.itinerary?.journey.road && pages.length > 1;
        expanded = false; page = 0; lastText = pages[0]?.content ?? updated.content;
        await edit();
      } finally { busy = false; }
    };
    collector.on("collect", async interaction => {
      try { await interact(interaction); }
      catch {
        if (!live || !this.service.remaining(scope, ticket)) return;
        pages = []; compactRoad = false; expanded = false; page = 0;
        mapBuffer = undefined;
        lastText = t("L’actualisation a échoué. Aucun nouveau trajet n’est confirmé.", "Refresh failed. No new journey is confirmed.");
        await edit().catch(() => undefined);
      }
    });
    collector.on("end", async (_items, reason) => {
      live = false;
      if (this.active.get(scope) === entry) this.active.delete(scope);
      // Replacing an old message must never erase the newer conversation.
      if (reason !== "replaced") this.service.close(scope, ticket);
      const notice = reason === "closed" ? t("Recherche terminée.", "Search finished.")
        : reason === "replaced" ? t("Recherche remplacée par une nouvelle demande.", "Search replaced by a new request.")
        : reason === "denied" ? t("Contrôles désactivés : accès non autorisé.", "Controls disabled: access denied.")
        : t("Carte expirée. Demande un nouveau trajet.", "Card expired. Request a new journey.");
      await edit(notice, true).catch(() => undefined);
    });
  }
}
