import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits,
  type APIEmbed, type Message, type MessageComponentInteraction,
} from "discord.js";
import type { TransportConversation, TravelReply } from "./transport-conversation.js";
import { itineraryPages, itinerarySource } from "./transport-itinerary-presentation.js";

export type TransportAuthorization = (message: Message, language: string) => Promise<boolean>;
type Payload = {
  content: string; embeds: APIEmbed[]; components: ActionRowBuilder<ButtonBuilder>[];
  allowedMentions: { parse: [] };
};
function canEmbed(message: Message) {
  return !message.guildId || "permissionsFor" in message.channel &&
    !!message.client.user && !!message.channel.permissionsFor(message.client.user)?.has(PermissionFlagsBits.EmbedLinks);
}
const missingPermissions = (error: unknown) => error && typeof error === "object" && "code" in error && error.code === 50013;

/** Each card owns one immutable route ticket, not the latest mutable conversation. */
export class ItineraryControls {
  private active = new Map<string, { stop: (reason: string) => void }>();
  constructor(private service: TransportConversation, private authorize: TransportAuthorization) {}
  invalidate(scope: string) { this.active.get(scope)?.stop("replaced"); }

  async send(message: Message, scope: string, result: TravelReply, language: string) {
    const view = result.itinerary;
    if (!view || !this.service.remaining(scope, view.ticket)) return;
    const ticket = view.ticket, fr = language === "fr", t = (a: string, b: string) => fr ? a : b;
    const id = `transport-trip:${randomUUID()}`;
    let pages = itineraryPages(view, fr), page = 0, lastText = pages[0]!.content;
    let embedded = canEmbed(message), live = true, busy = false;
    const source = () => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Source").setURL(itinerarySource(view.journey));
    const button = (name: string, label: string, style = ButtonStyle.Secondary) =>
      new ButtonBuilder().setCustomId(`${id}:${name}`).setLabel(label).setStyle(style);
    const rows = (closed = false) => {
      if (closed) return [new ActionRowBuilder<ButtonBuilder>().addComponents(source())];
      const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(button("refresh", t("Actualiser", "Refresh"), ButtonStyle.Primary));
      if (pages.length > 1) primary.addComponents(
        button("prev", "←").setDisabled(page === 0), button("next", "→").setDisabled(page === pages.length - 1));
      const secondary = [source(), button("close", t("Fermer", "Close"))];
      if (pages.length <= 1) { primary.addComponents(...secondary); return [primary]; }
      return [primary, new ActionRowBuilder<ButtonBuilder>().addComponents(...secondary)];
    };
    const payload = (notice = "", closed = false): Payload => ({
      content: [embedded && pages[page] ? "" : lastText, notice].filter(Boolean).join("\n\n"),
      embeds: embedded && pages[page] ? [pages[page]!.embed] : [],
      components: rows(closed), allowedMentions: { parse: [] },
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
      if (!["refresh", "prev", "next", "close"].includes(action)) return;
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
        if (action === "prev" || action === "next") {
          page = Math.max(0, Math.min(pages.length - 1, page + (action === "next" ? 1 : -1)));
          lastText = pages[page]?.content ?? lastText;
          await edit(); return;
        }
        const updated = await this.service.refresh(scope, ticket, language);
        if (!await this.authorize(message, language)) { collector.stop("denied"); return; }
        if (!live || !this.service.remaining(scope, ticket) || !updated?.content) {
          collector.stop("replaced"); return;
        }
        pages = updated.itinerary ? itineraryPages(updated.itinerary, fr) : [];
        page = 0; lastText = pages[0]?.content ?? updated.content;
        await edit();
      } finally { busy = false; }
    };
    collector.on("collect", async interaction => {
      try { await interact(interaction); }
      catch {
        if (!live || !this.service.remaining(scope, ticket)) return;
        pages = []; page = 0;
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
