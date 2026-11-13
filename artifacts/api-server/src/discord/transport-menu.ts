import { createHash, randomUUID } from "node:crypto";
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, StringSelectMenuBuilder,
  TextInputBuilder, TextInputStyle,
   type APIEmbed,
   type Message, type MessageComponentInteraction, type MessageCreateOptions,
} from "discord.js";
import { TransportBrowserClient, MODE_NAMES, modeName, originOptions, arrivalOptions, type TransportLine, type StopGroup,
  type TransportDepartureResult, type TransportTimeOptions } from "./transport-browser.js";
import { sourceButton, lineMatches, type TransportLocation, type CatalogDataset } from "./public-transport.js";
import { isMobilityTerritory, territoryLabel, type TransportTerritory } from "./transport-provider.js";
import { normalizeTransitText, type TransitMode } from "./transport-query.js";
import { journeyPairs, type JourneyIndex } from "./gtfs-journey.js";
import { connectionPaths } from "./gtfs-connections.js";
import { logger } from "../lib/logger.js";
import { resolveBusJourney, normalizeCityName } from "./bus-journey.js";
import { TransportDataError } from "./transport-data-error.js";
import { parseTransportCommand } from "./transport-command-query.js";
import type { TransportRegion } from "./transport-regions.js";
import { addDays, localDate, scheduledEpoch } from "./gtfs-realtime.js";
import { transportPreferences, type TransportFavorite, type TransportPreferencesStore } from "./transport-preferences.js";
import { IRELAND_PROVINCES, irelandCounties, irelandCountyByCode, irelandCountyFromSearch } from "./ireland-regions.js";
import type { MobilityCountryCoverage } from "./mobility-database-transport.js";
export { parseTransportCommand } from "./transport-command-query.js";

const browser = new TransportBrowserClient().enableMobilityDatabase();
const active = new Map<string, () => void>();
type Stage = "territory" | "mode" | "city" | "regions" | "provinces" | "counties" | "cities" | "networks" | "lines" | "origins" | "arrivals" | "result" | "error";
type Choice = { label: string; description?: string; value: string };

export function prewarmIrishBusRouteIndex(): void {
  void browser.prewarmRegionIndex("ie", "bus")
    .then(() => logger.info("Irish bus route index is ready"))
    .catch(error => logger.warn({ err: error }, "Irish bus route index prewarm failed"));
}

function compareRouteNumbers(a: TransportLine, b: TransportLine) {
  const left = a.label.trim(), right = b.label.trim();
  const leftNumeric = /^\d+$/.test(left), rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const difference = Number(left) - Number(right);
    if (difference) return difference;
  } else if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left.localeCompare(right, "fr", { numeric: true, sensitivity: "base" }) ||
    a.routeId.localeCompare(b.routeId, "fr", { numeric: true, sensitivity: "base" });
}

function localTimeOption(value: string, reference: number, timezone: string): number | null | undefined {
  const input = value.trim();
  if (!input) return undefined;
  const match = input.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const time = `${match[1]}:${match[2]}:00`;
  const today = localDate(reference, timezone);
  let result = scheduledEpoch(today, time, timezone);
  if (result === null) return null;
  if (result < reference) result = scheduledEpoch(addDays(today, 1), time, timezone);
  return result;
}

function displayLocalTime(epoch: number, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(epoch * 1000));
}

export async function transportDeadline<T>(work: Promise<T>, milliseconds = 45_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Transport lookup timed out")), milliseconds);
      timer.unref();
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

async function bestEffortPreference<T>(work: Promise<T>, fallback: T, milliseconds = 1_000): Promise<T> {
  try { return await transportDeadline(work, milliseconds); }
  catch { return fallback; }
}

export async function handleTransportCommand(
  message: Message, args: string[], language: string, prefix = "!", mode: TransitMode | null = null,
  service = browser, lookupTimeoutMs = 45_000, preferencesStore: TransportPreferencesStore = transportPreferences,
): Promise<void> {
  const parsed = { ...parseTransportCommand(args), mode };
  if (parsed.territory) await bestEffortPreference(
    preferencesStore.setPreferredTerritory(message.author.id, parsed.territory), false);
  return handleTransportSearch(message, parsed, language, prefix, service, lookupTimeoutMs,
    undefined, preferencesStore);
}

export async function handleTransportFavoritesCommand(
  message: Message, language: string, prefix = "!", service = browser,
  preferencesStore: TransportPreferencesStore = transportPreferences,
): Promise<void> {
  const favorites = (await bestEffortPreference(preferencesStore.get(message.author.id), null))?.favorites ?? [];
  const french = language === "fr";
  if (!favorites.length) {
    await message.reply(french ? "Aucun favori transport enregistré. Lance un trajet puis ajoute-le avec le bouton cœur."
      : "No saved transport favorites. Start a journey, then save it with the heart button.");
    return;
  }
  if (favorites.length === 1) {
    const favorite = favorites[0]!;
    await handleTransportSearch(message, { place: favorite.place, territory: favorite.territory, mode: favorite.mode },
      language, prefix, service, 45_000, undefined, preferencesStore, favorite);
    return;
  }
  const id = `transport-favorites:${randomUUID()}`;
  const labelFor = (favorite: TransportFavorite) =>
    `${favorite.lineLabel} · ${favorite.originLabel} → ${favorite.arrivalLabel}`.slice(0, 100);
  const prompt = await message.reply({
    content: french ? "Choisis un trajet favori à recalculer avec les horaires actuels."
      : "Choose a saved journey to look up using current timetables.",
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
        .setCustomId(`${id}:choose`).setPlaceholder(french ? "Choisir un favori" : "Choose a favorite")
        .addOptions(favorites.map((favorite, index) => ({
          label: labelFor(favorite), description: `${territoryLabel(favorite.territory, language === "fr" ? "fr" : "en")} · ${modeName(favorite.mode, favorite.territory)}`.slice(0, 100),
          value: String(index),
        })))),
      new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`${id}:cancel`)
        .setLabel(french ? "Annuler" : "Cancel").setStyle(ButtonStyle.Secondary)),
    ],
    allowedMentions: { parse: [] },
  });
  const collector = prompt.createMessageComponentCollector({ time: 5 * 60_000 });
  collector.on("collect", async interaction => {
    if (!interaction.customId.startsWith(`${id}:`)) return;
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: french ? "Cette liste appartient à la personne qui l’a ouverte."
        : "This list belongs to the person who opened it.", ephemeral: true });
      return;
    }
    if (interaction.customId.endsWith(":cancel")) {
      await interaction.deferUpdate();
      collector.stop("cancelled");
      return;
    }
    const index = Number(interaction.isStringSelectMenu() ? interaction.values[0] : NaN);
    if (!Number.isInteger(index) || !favorites[index]) {
      await interaction.reply({ content: french ? "Ce favori n’est plus disponible." : "This favorite is no longer available.",
        ephemeral: true });
      return;
    }
    await interaction.deferUpdate();
    collector.stop("selected");
    await prompt.edit({ content: french ? "Trajet favori sélectionné." : "Favorite journey selected.",
      components: [], allowedMentions: { parse: [] } });
    const favorite = favorites[index]!;
    try {
      await handleTransportSearch(message, { place: favorite.place, territory: favorite.territory, mode: favorite.mode },
        language, prefix, service, 45_000, undefined, preferencesStore, favorite);
    } catch (error) {
      logger.warn({ err: error }, "Could not launch selected transport favorite");
      await prompt.edit({ content: french ? "Ce favori n’a pas pu être ouvert. Relance la commande pour réessayer."
        : "This favorite could not be opened. Run the command again to retry.",
        components: [], allowedMentions: { parse: [] } });
    }
  });
  collector.on("end", (_collected, reason) => {
    if (reason === "time") void prompt.edit({
      content: french ? "La sélection des favoris a expiré." : "Favorite selection expired.",
      components: [], allowedMentions: { parse: [] },
    }).catch(() => undefined);
  });
}

export interface TransportSearch {
  place: string; direction?: string; line?: string; territory?: TransportTerritory; mode: TransitMode | null;
}
export async function handleTransportSearch(
  message: Message, parsed: TransportSearch, language: string, prefix = "!", service = browser, lookupTimeoutMs = 45_000,
  authorize?: () => Promise<boolean>, preferencesStore: TransportPreferencesStore = transportPreferences,
  favoriteToResume?: TransportFavorite,
): Promise<void> {
  const { mode } = parsed;
  logger.info({ mode: mode ?? "choose", runtime: process.version }, "Transport command received");
  const french = language === "fr";
  const text = (fr: string, en: string) => french ? fr : en;
  const sessionKey = `${message.channelId}:${message.author.id}`;
  if (!active.has(sessionKey) && active.size >= 100) {
    await message.reply(text("Trop de recherches sont ouvertes. Réessaie dans un instant.", "Too many searches are open. Please try again shortly."));
    return;
  }
  active.get(sessionKey)?.();
  let place = /^(list|liste|aide|help)$/i.test(parsed.place) ? "" : parsed.place;
  let direction = parsed.direction ?? "";
  let lineFilter = parsed.line ?? "";
  let selectedMode = mode;
  const savedPreferences = await bestEffortPreference(preferencesStore.get(message.author.id), null);
  let preferredTerritory = savedPreferences?.preferredTerritory;
  let resumeFavorite = favoriteToResume;
  let territory: TransportTerritory | undefined = parsed.territory ?? (service.territories ? undefined : "fr");
  let stage: Stage = !territory ? "territory" : mode ? "city" : "mode";
  let availableModes: TransitMode[] | undefined;
  let networks: CatalogDataset[] = [];
  let network: CatalogDataset | undefined;
  let region: TransportRegion | undefined;
  let regions: string[] = [];
  let province = "";
  let city: TransportLocation | undefined;
  let cities: TransportLocation[] = [];
  let lines: TransportLine[] = [];
  let line: TransportLine | undefined;
  let index: JourneyIndex | undefined;
  let origins: StopGroup[] = [];
  let arrivals: StopGroup[] = [];
  let origin: StopGroup | undefined;
  let arrival: StopGroup | undefined;
  let filter = "";
  let page = 0;
  let busy = false;
  let modalGeneration = 0;
  let listingNote = "";
  let serviceNote = "";
  let live = true;
  let sequence = 0;
  let lastEmbed: APIEmbed | undefined;
  let lastResult: TransportDepartureResult | undefined;
  let timeOptions: TransportTimeOptions = {};
  let showPreviousStops = false;
  let favoriteNotice = "";
  let expanded = false;
  let revision = 0;
  let mobilityCoverage: MobilityCountryCoverage | undefined;
  let mobilityCoverageLoaded = false;
  let validControls = new Set<string>();
  const id = `transport:${randomUUID()}`;
  const prompt = await message.reply({
    content: text("Recherche de transport en cours…", "Starting transport lookup…"),
    allowedMentions: { parse: [] },
  });
  let lastContent = prompt.content;
  const collector = prompt.createMessageComponentCollector({ time: 5 * 60_000 });
  const button = (action: string, label: string, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(`${id}:${action}`).setLabel(label).setStyle(style);
  const edit = async (content: string, components?: NonNullable<MessageCreateOptions["components"]>, embed?: APIEmbed) => {
    if (!live) return;
    revision++;
    // A delayed click from the previous list cannot select item 0 in a new list.
    const serialized = JSON.parse(JSON.stringify(components ??
      [new ActionRowBuilder<ButtonBuilder>().addComponents(button("cancel", text("Annuler", "Cancel")))])) as
      Array<ReturnType<ActionRowBuilder<ButtonBuilder>["toJSON"]> | ReturnType<ActionRowBuilder<StringSelectMenuBuilder>["toJSON"]>>;
    validControls = new Set();
    for (const row of serialized) for (const component of row.components) if ("custom_id" in component && component.custom_id) {
      component.custom_id = `${id}:${revision}:${component.custom_id.split(":").at(-1)}`;
      validControls.add(component.custom_id);
    }
    lastContent = content.slice(0, 1950);
    lastEmbed = embed;
    const options = { content: embed ? "" : lastContent, embeds: embed ? [embed] : [],
      components: serialized,
      allowedMentions: { parse: [] as const } };
    try { await prompt.edit(options); }
    catch (error) {
      if (!embed || !error || typeof error !== "object" || !("code" in error) || error.code !== 50013) throw error;
      logger.warn("Transport card embedding not permitted; using compact text");
      lastEmbed = undefined;
      await prompt.edit({ ...options, content: lastContent, embeds: [] });
    }
  };

  async function cityInput() {
    stage = "city";
    const cityButtons = [
      button("city", text("Saisir une commune", "Enter a town"), ButtonStyle.Primary),
      button("zones", text("Par zones", "Browse areas")),
    ];
    cityButtons.push(button("cancel", text("Annuler", "Cancel")));
    await edit(`**Transport · ${territory ? territoryLabel(territory, language === "fr" ? "fr" : "en") : ""}**\n` +
      (territory && isMobilityTerritory(territory)
      ? text("Indique une ville ou une zone. Les horaires ne seront proposés que si un flux GTFS statique ouvert existe dans cette zone.",
        "Enter a city or area. Timetables appear only when an open static GTFS feed exists in that area.")
      : territory === "en"
      ? selectedMode === "rail" ? text("Trains anglais : accès National Rail en attente de validation. Les bus et le métro londonien restent disponibles.",
          "English trains: National Rail access awaits approval. Buses and the London Underground remain available.")
        : text("Indique une ville anglaise (ex. London / Londres, Cambridge). Bus BODS hors Londres ; métro et bus TfL à Londres. Les homonymes seront proposés.",
          "Enter an English town (e.g. London, Cambridge). BODS buses outside London; TfL Underground and buses in London. Matching places will be offered.")
      : territory === "ie" || territory === "lu" || territory === "ch" || territory === "no" ||
        territory === "is" || territory === "sg" || territory === "lv" || territory === "cz" ||
        territory === "pt" || territory === "au" || territory === "ua"
      ? territory === "no"
        ? text("Indique une ville norvégienne. Horaires NeTEx Entur; géocodage © OpenStreetMap contributors (openstreetmap.org/copyright).",
          "Enter a Norwegian town. Entur NeTEx timetables; geocoding © OpenStreetMap contributors (openstreetmap.org/copyright).")
        : territory === "is"
        ? text("Indique une localité islandaise. Bus et horaires GTFS Strætó uniquement; géocodage © OpenStreetMap contributors.",
          "Enter an Icelandic place. Strætó GTFS buses and timetables only; geocoding © OpenStreetMap contributors.")
        : territory === "sg"
        ? text("Indique une localité de Singapour. Bus LTA et horaires GTFS des trains; estimations temps réel selon disponibilité.",
          "Enter a Singapore locality. LTA buses and train GTFS timetables; real-time estimates where available.")
        : territory === "lv"
        ? text("Indique une ville lettone. Autobus ATD et trains Vivi; horaires théoriques.",
          "Enter a Latvian town. ATD buses and Vivi trains; scheduled times.")
        : territory === "cz"
        ? text("Indique une ville de Prague ou de sa région. Le réseau PID ne couvre pas tous les opérateurs tchèques.",
          "Enter a town in Prague or its region. PID does not cover every Czech operator.")
        : territory === "pt"
        ? text("Indique une station desservie par le métro de Lisbonne; les autres réseaux portugais ne sont pas inclus.",
          "Enter a place served by Lisbon Metro; other Portuguese networks are not included.")
        : territory === "au"
        ? text("Indique Brisbane/SEQ, Bowen, Bundaberg ou Cairns. Seules ces zones du Queensland sont couvertes.",
          "Enter Brisbane/SEQ, Bowen, Bundaberg or Cairns. Only these Queensland areas are covered.")
        : territory === "ua"
        ? text("Indique une localité de la région de Lviv. Autobus et tram; horaires théoriques.",
          "Enter a place in the Lviv area. Buses and trams; scheduled times.")
        : text(`Indique une ville de ${territoryLabel(territory, "fr")}. Horaires du GTFS national; géocodage © OpenStreetMap contributors (openstreetmap.org/copyright).`,
          `Enter a town in ${territoryLabel(territory, "en")}. National GTFS timetables; geocoding © OpenStreetMap contributors (openstreetmap.org/copyright).`)
      : territory === "qc"
      ? text("Indique une localité québécoise. Les homonymes seront proposés avec leur région.", "Enter a Québec locality. Matching places include their region.")
      : text("Indique une région (ex. Normandie), une ville ou gare, un département (ex. 60) ou un code postal (ex. 60000).",
          "Enter a region (e.g. Normandie), city or station, department (e.g. 60) or postal code (e.g. 60000).")),
      [new ActionRowBuilder<ButtonBuilder>().addComponents(...cityButtons)]);
  }

  async function showZonesUnavailable() {
    stage = "city";
    await edit(text(
      "Aucune liste de zones avec lignes vérifiées n’est disponible pour ce pays. Choisis « Saisir une commune » pour continuer.",
      "No area list with verified routes is available for this country. Choose “Enter a town” to continue.",
    ), [new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("city", text("Saisir une commune", "Enter a town"), ButtonStyle.Primary),
      button("cancel", text("Annuler", "Cancel")),
    )]);
  }

  function choices(): Choice[] {
    if (stage === "territory") {
      const territories: TransportTerritory[] = [
        ...(service.territories ?? ["fr"] as const),
      ];
      if (preferredTerritory && territories.includes(preferredTerritory)) {
        territories.splice(territories.indexOf(preferredTerritory), 1);
        territories.unshift(preferredTerritory);
      }
      const builtIn = territories.map(value => ({ value,
        label: territoryLabel(value, language === "fr" ? "fr" : "en"),
        ...(isMobilityTerritory(value) ? { description: text("Catalogue Mobility Database · horaires si flux statique ouvert",
          "Mobility Database catalog · schedules when an open static feed exists") } : {}),
      ...(value === "en" ? { description: text("Bus BODS · métro TfL · trains en attente", "BODS buses · TfL Underground · trains pending") }
        : value === "no" ? { description: text("Entur NeTEx · bus, métro, tram et train", "Entur NeTEx · buses, metro, tram and rail") }
        : value === "is" ? { description: text("GTFS Strætó · bus uniquement", "Strætó GTFS · buses only") }
        : value === "sg" ? { description: text("Bus LTA · GTFS et temps réel train", "LTA buses · train GTFS and real-time") }
        : value === "lv" ? { description: text("Bus nationaux et trains · CC0", "National buses and trains · CC0") }
        : value === "cz" ? { description: text("Prague et région · bus, métro, tram, train", "Prague and region · bus, metro, tram, rail") }
        : value === "pt" ? { description: text("Métro de Lisbonne uniquement", "Lisbon Metro only") }
        : value === "au" ? { description: text("Queensland · SEQ, Bowen, Bundaberg, Cairns", "Queensland · SEQ, Bowen, Bundaberg, Cairns") }
        : value === "ua" ? { description: text("Bus et tram à Lviv uniquement", "Lviv buses and trams only") } : {}) }));
      const discovered = (mobilityCoverage?.countries ?? []).map(country => ({
        value: `mobility:${country.code}`,
        label: `${territoryLabel(`mobility:${country.code}`, language === "fr" ? "fr" : "en")} · ${
          country.covered ? text("GTFS ouvert", "open GTFS") : text("aucun flux ouvert", "no open feed")}`,
        description: country.covered
          ? text("Flux GTFS statique actif · licence autorisée", "Active static GTFS feed · permitted license")
          : text("Aucun flux GTFS statique actif avec licence autorisée", "No active static GTFS feed with a permitted license"),
      }));
      return [...builtIn, ...discovered];
    }
    if (stage === "mode") return (availableModes ?? Object.keys(MODE_NAMES) as TransitMode[])
      .map((value) => ({ value, label: modeName(value, territory) }));
    if (stage === "regions") return regions.map(value => ({ value, label: value }));
    if (stage === "provinces") return IRELAND_PROVINCES.map(value => ({ value, label: value }));
    if (stage === "counties") return irelandCounties(province).map(value => ({
      value: value.code, label: `${value.name} · ${value.province}`,
    }));
    if (stage === "networks") return networks.map((d, i) => ({ value: String(i), label: d.title,
      description: d.id.startsWith("mobilitydatabase:")
        ? text(`Catalogue Mobility Database · GTFS statique · licence ${d.licence} · mode à confirmer`,
          `Mobility Database catalog · static GTFS · ${d.licence} license · mode to verify`)
        : /agr[eé]gat/i.test(d.title) ? text("Source agrégée · peut recouvrir les réseaux listés", "Aggregate source · may overlap listed networks")
        : d.resources.length ? text("Source officielle · horaires selon disponibilité", "Official source · timetables where available")
        : text("Pas de flux exploitable configuré · lien officiel", "No usable feed configured · official link") }));
    if (stage === "cities") return cities.map((value, i) => ({ value: String(i), label: value.name, description: value.label }));
    if (stage === "lines") return lines.map((value, i) => ({
      value: String(i), label: `${value.label} · ${value.description}`, description: value.source.name,
    }));
    return (stage === "origins" ? origins : arrivals).map((value, i) => ({ value: String(i), label: value.label,
      ...(stage === "arrivals" ? { description: value.viaTransfer ? text("1 correspondance · délai officiel", "1 transfer · official minimum")
        : text("Trajet direct", "Direct journey") } : {}) }));
  }

  async function render() {
    if (stage === "territory" && !mobilityCoverageLoaded && typeof service.mobilityCountries === "function") {
      mobilityCoverageLoaded = true;
      try { mobilityCoverage = await transportDeadline(service.mobilityCountries(), 500); }
      catch { mobilityCoverage = undefined; }
    }
    const all = choices();
    const matching = all.filter((choice) => normalizeTransitText(`${choice.label} ${choice.description ?? ""}`).includes(normalizeTransitText(filter)));
    const pages = Math.max(1, Math.ceil(matching.length / 25));
    page = Math.max(0, Math.min(page, pages - 1));
    const titles: Partial<Record<Stage, string>> = {
      territory: text("Choisis le territoire", "Choose the territory"),
      mode: text("Choisis un moyen de transport", "Choose a transport mode"),
      regions: text("Choisis une région desservie", "Choose a served region"),
      provinces: text("Choisis une province irlandaise", "Choose an Irish province"),
      counties: text("Choisis un comté", "Choose a county"),
      networks: text("Choisis un réseau", "Choose a network"),
      cities: cities.length && cities.every(c => c.kind === "station")
        ? text("Quelle gare de départ ?", "Which departure station?") : text("Quelle commune de départ ?", "Which departure city?"),
      lines: text("Choisis une ligne", "Choose a route"),
      origins: selectedMode === "metro" ? text("Choisis ta station de départ", "Choose your departure station")
        : text("Choisis ton arrêt de départ", "Choose your departure stop"),
      arrivals: selectedMode === "metro" ? text("Choisis ta station d’arrivée", "Choose your arrival station")
        : text("Choisis ton arrêt d’arrivée", "Choose your arrival stop"),
    };
    const context = [territory ? territoryLabel(territory, language === "fr" ? "fr" : "en") : "", region?.parentName ?? province, region?.name, city?.label,
      network?.title, selectedMode ? modeName(selectedMode, territory) : "", line ? `${text("Ligne", "Route")} ${line.label}` : "",
      origin ? `${text("Départ", "From")} : ${origin.label}` : ""].filter(Boolean).join(" · ");
    const rows: Array<ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>> = [];
    if (matching.length) {
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
        .setCustomId(`${id}:choose`).setPlaceholder(titles[stage] ?? text("Choisir", "Choose"))
        .addOptions(matching.slice(page * 25, (page + 1) * 25).map((choice) => ({
          ...choice, label: choice.label.slice(0, 100),
          ...(choice.description ? { description: choice.description.slice(0, 100) } : {}),
        })))));
    }
    const controls = new ActionRowBuilder<ButtonBuilder>();
    if (pages > 1) controls.addComponents(button("prev", "←").setDisabled(page === 0),
      button("next", "→").setDisabled(page === pages - 1));
    if (stage !== "mode" && stage !== "territory") controls.addComponents(button("back", text("Retour", "Back")));
    if (stage === "territory" || stage === "cities" || stage === "networks" || stage === "lines" || stage === "origins" || stage === "arrivals")
      controls.addComponents(button("filter", text("Rechercher", "Search")));
    if (stage === "networks" && controls.components.length < 4)
      controls.addComponents(button("networks", text("Actualiser", "Refresh")));
    controls.addComponents(button("cancel", text("Annuler", "Cancel")));
    rows.push(controls);
    if (filter) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button("clear", text("Tout afficher", "Show all"))));
    const empty = stage === "networks" && isMobilityTerritory(territory)
      ? text("Aucun flux GTFS statique actif et ouvert trouvé pour cette zone et ce mode.",
        "No active, open static GTFS feed was found for this area and mode.")
      : text("Aucun choix ne correspond à cette recherche.", "No choices match this search.");
    const note = stage === "arrivals" ? (line?.selection
      ? territory === "ie" || territory === "lu" || territory === "ch" || territory === "no" ||
        territory === "is" || territory === "sg" || territory === "lv" || territory === "cz" ||
        territory === "pt" || territory === "au" || territory === "ua" || isMobilityTerritory(territory)
        ? text("\nSeuls les trajets directs de cette ligne sont calculés; les correspondances ne sont pas vérifiées.",
          "\nOnly direct journeys on this route are calculated; transfers are not checked.")
        : ""
      : text("\nTrajets directs ou avec 1 correspondance publiée, dans la même source officielle. Tous modes à l’arrivée; autres réseaux et marche non calculés. Horaires vérifiés après sélection.",
        "\nDirect journeys or 1 published transfer within the same official source. Any arrival mode; other networks and walking not calculated. Times checked after selection.")) +
      (index?.connections?.limited ? text("\nListe partielle : limite de lignes atteinte.", "\nPartial list: route limit reached.") : "") +
      (index?.connectionsUnavailable && !line?.selection ? text("\nRecherche des correspondances indisponible ou trop volumineuse : seuls les trajets directs sont proposés.",
        "\nTransfer search unavailable or too large: only direct journeys are offered.") : "") : "";
    const regionalNote = region && (stage === "networks" || stage === "lines")
      ? region.territory === "ie"
        ? text("\nLignes avec au moins un arrêt dans ce comté; horaires ensuite proposés sur toute la ligne. Limites © OpenStreetMap.",
          "\nRoutes with at least one stop in this county; the timetable is then available for the whole route. Boundaries © OpenStreetMap.")
        : text(
          "\nSources publiées pour cette région. Les agrégats peuvent recouvrir les réseaux opérateurs. Choisis une source pour voir ses lignes; les passages seront vérifiés après le choix des arrêts.",
          "\nPublished sources for this region. Aggregates may overlap operator networks. Choose a source to see its routes; departures are checked after stop selection.")
      : "";
    const zoneNote = stage === "counties" ? text(
      "\nComtés de la République d’Irlande uniquement · © OpenStreetMap contributors.",
      "\nRepublic of Ireland counties only · © OpenStreetMap contributors.") : "";
    const countLabel = stage === "lines"
      ? matching.length === 1 ? text("ligne", "route") : text("lignes", "routes")
      : stage === "origins" || stage === "arrivals" ? selectedMode === "metro"
        ? matching.length === 1 ? text("station", "station") : text("stations", "stations")
        : matching.length === 1 ? text("arrêt", "stop") : text("arrêts", "stops")
        : matching.length === 1 ? text("choix", "choice") : text("choix", "choices");
    const pageHint = stage === "lines" && pages > 1
      ? text("\n25 lignes par page · utilise Rechercher ou Suivant pour parcourir les lignes.",
        "\n25 routes per page · use Search or Next to browse routes.") : "";
    const coverageNote = stage !== "territory" || typeof service.mobilityCountries !== "function" ? ""
      : !mobilityCoverage ? text("\nCouverture Mobility Database non vérifiée; les recherches déjà disponibles restent accessibles.",
        "\nMobility Database coverage could not be verified; existing searches remain available.")
      : mobilityCoverage.complete
        ? text(`\nGTFS statique actif et licence autorisée : ${mobilityCoverage.countries.filter(country => country.covered).length} pays · sans flux exploitable : ${mobilityCoverage.countries.filter(country => !country.covered).length}.`,
          `\nActive static GTFS with a permitted license: ${mobilityCoverage.countries.filter(country => country.covered).length} countries · no usable feed: ${mobilityCoverage.countries.filter(country => !country.covered).length}.`)
        : text("\nRépertoire ou couverture incomplet; seuls les flux confirmés sont marqués disponibles.",
          "\nCountry directory or coverage is incomplete; only confirmed feeds are marked available.");
    const regionListNote = stage === "regions" ? text(
      "\nRégions où une source publie des horaires pour ce mode; les lignes sont vérifiées à l’étape suivante.",
      "\nRegions where a source publishes timetables for this mode; routes are verified in the next step.",
    ) : "";
    await edit(`**${titles[stage]}**${context ? `\n${context}` : ""}\n${matching.length ? `${matching.length} ${countLabel} · ${page + 1}/${pages}` : empty}${pageHint}${filter ? `\n${text("Filtre", "Filter")} : ${filter}` : ""}${coverageNote}${regionListNote}${note}${regionalNote}${zoneNote}${stage === "lines" ? listingNote : ""}${(stage === "origins" || stage === "arrivals") && serviceNote ? `\n${serviceNote}` : ""}${stage === "cities" && (isMobilityTerritory(territory) || territory === "ie" || territory === "lu" || territory === "ch" || territory === "no" || territory === "is" || territory === "sg" || territory === "lv" || territory === "cz" || territory === "pt" || territory === "au" || territory === "ua") ? "\n© OpenStreetMap contributors · openstreetmap.org/copyright" : ""}`, rows);
  }

  async function loadModeChoices() {
    availableModes = typeof service.availableModes === "function"
      ? await service.availableModes(territory!)
      : Object.keys(MODE_NAMES) as TransitMode[];
    if (!availableModes.length) {
      stage = "error";
      await edit(text("Aucun mode de transport n’est confirmé dans le flux officiel actuellement disponible.",
        "No transport mode is confirmed in the currently available official feed."),
      [new ActionRowBuilder<ButtonBuilder>().addComponents(
        button("retry", text("Réessayer", "Retry")), button("cancel", text("Annuler", "Cancel")))]);
      return false;
    }
    return true;
  }

  async function run(work: () => Promise<void>) {
    if (!live) return;
    busy = true;
    const current = ++sequence;
    try {
      if (authorize) {
        let permitted = false;
        try { permitted = await authorize(); } catch { /* Authorization failures are closed, not provider failures. */ }
        if (!permitted) { collector.stop("denied"); return; }
      }
      if (!live || current !== sequence) return;
      const deadline = territory === "ie" || territory === "lu" || territory === "ch" || territory === "no" ||
        territory === "is" || territory === "sg" || territory === "lv" || territory === "cz" ||
        territory === "pt" || territory === "au" || territory === "ua" || isMobilityTerritory(territory)
        ? Math.max(lookupTimeoutMs, 90_000) : lookupTimeoutMs;
      await transportDeadline(work(), deadline);
    } catch (error) {
      if (!live || current !== sequence) return;
      const failedStage = stage;
      stage = "error";
      logger.warn({ err: error, mode: selectedMode, cityId: city?.id, stage: failedStage, territory, regionCode: region?.code },
        "Transport menu lookup failed");
      if (error instanceof Error && error.message === "Transport lookup timed out") {
        collector.stop("timeout");
        return;
      }
      await edit(error instanceof TransportDataError ? `${network?.title ?? city?.label ?? ""}\n${error.message}` :
        text("La recherche n’a pas abouti à temps ou une source est indisponible. Tu peux réessayer; aucune ligne ne sera inventée.",
         "The lookup timed out or a source is unavailable. You can retry; routes will not be invented."),
      [new ActionRowBuilder<ButtonBuilder>().addComponents(button("retry", text("Réessayer", "Retry")),
          button(region?.territory === "ie" || territory === "fr" ? "zones" : "city",
            region?.territory === "ie" || territory === "fr"
              ? text("Changer de zone", "Change area") : text("Changer de commune", "Change city")),
         button("cancel", text("Annuler", "Cancel")))]);
    } finally { if (current === sequence) busy = false; }
  }

  async function loadCities() {
    if (!live) return;
    if (territory === "ie" && selectedMode && (!place || irelandCountyFromSearch(place))) {
      const warmup = service.prewarmRegionIndex?.("ie", selectedMode);
      if (warmup) void warmup.catch(error =>
        logger.warn({ err: error, mode: selectedMode }, "Ireland route index prewarm failed"));
    }
    line = undefined; index = undefined; origin = undefined; arrival = undefined; city = undefined; network = undefined; region = undefined;
    province = "";
    if (!place) { await cityInput(); return; }
    if (typeof service.region === "function") {
      const scope = await service.region(place, territory);
      if (!live) return;
      if (scope) {
        region = scope;
        province = scope.parentName ?? "";
        if (!selectedMode) { stage = "mode"; await render(); return; }
        await loadNetworks(); return;
      }
    }
    await edit(selectedMode === "rail" && territory === "fr" ? text("Recherche des gares…", "Looking up stations…")
      : text("Recherche des communes…", "Looking up cities…"));
    cities = await service.cities(place, territory, selectedMode);
    if (!direction && !/(?:\s+|\s*\()(\d{2,5}|2[ab])\)?$/i.test(place) &&
      !cities.some((candidate) => normalizeCityName(candidate.name) === normalizeCityName(place))) {
      const journey = await resolveBusJourney(place, async (name) => {
        const candidates = name === place ? cities : await service.cities(name, territory, selectedMode);
        return candidates.find((candidate) => normalizeCityName(candidate.name) === normalizeCityName(name))?.name ?? null;
      });
      if (journey.direction) {
        place = journey.place;
        direction = journey.direction;
        cities = await service.cities(place, territory, selectedMode);
      }
    }
    if (!live) return;
    if (resumeFavorite) {
      const favorite = resumeFavorite;
      city = cities.find(candidate => candidate.id === favorite.cityId);
      if (!city) {
        stage = "error";
        await edit(text("Le lieu exact de ce favori n’est plus disponible. Relance une recherche pour choisir un autre lieu.",
          "The exact location for this favorite is no longer available. Start a new search to choose another place."));
        return;
      }
      await afterCity();
      return;
    }
    if (!cities.length) {
      await cityInput();
      await prompt.edit({ content: selectedMode === "rail" && territory === "fr"
        ? text(`Aucune gare trouvée dans le référentiel voyageurs pour « ${place} ». Cela ne confirme pas une absence de trains. Essaie une ville ou une gare voisine.`,
          `No passenger-reference station found for “${place}”. This does not establish that there are no trains. Try a nearby city or station.`)
        : territory && isMobilityTerritory(territory)
          ? text(`Aucune ville trouvée pour « ${place} » dans ${territoryLabel(territory, "fr")}. Vérifie l’orthographe.`,
            `No town found for “${place}” in ${territoryLabel(territory, "en")}. Check the spelling.`)
          : text(`Je ne trouve pas de commune pour « ${place} ». Indique une ville, un département ou un code postal.`,
            `No city found for “${place}”. Enter a city, department or postal code.`) });
      return;
    }
    filter = ""; page = 0;
    if (cities.length === 1) { city = cities[0]; await afterCity(); }
    else { stage = "cities"; await render(); }
  }

  async function afterCity() {
    if (territory === "qc" || territory === "en" || territory === "ie" || territory === "lu" ||
      territory === "ch" || territory === "no" || territory === "is" || territory === "sg" ||
      territory === "lv" || territory === "cz" || territory === "pt" || territory === "au" || territory === "ua" ||
      isMobilityTerritory(territory)) await loadNetworks();
    else await loadLines();
  }

  async function loadNetworks() {
    if (!live || (!city && !region) || !selectedMode) return;
    network = undefined; line = undefined; index = undefined; origin = undefined; arrival = undefined;
    await edit(region ? `${region.name} · ${text("Recherche des réseaux…", "Looking up networks…")}`
      : territory && isMobilityTerritory(territory)
        ? text(`Recherche des flux ouverts en ${territoryLabel(territory, "fr")}…`,
          `Looking up open feeds in ${territoryLabel(territory, "en")}…`)
      : territory === "en" ? text("Recherche des réseaux anglais…", "Looking up English networks…")
        : territory === "ie" || territory === "lu" || territory === "ch" || territory === "no" ||
          territory === "is" || territory === "sg" || territory === "lv" || territory === "cz" ||
          territory === "pt" || territory === "au" || territory === "ua"
        ? text(`Recherche des réseaux officiels en ${territoryLabel(territory, "fr")}…`,
          `Looking up official networks in ${territoryLabel(territory, "en")}…`)
        : text("Recherche des réseaux québécois…", "Looking up Québec networks…"));
    networks = region ? await service.regionNetworks(region, selectedMode) : await service.networks(city!, selectedMode);
    if (!live) return;
    if (!networks.length && region?.territory === "ie") {
      stage = "error";
      await edit(`**${region.name}**\n${text(
        `Aucune source irlandaise ne publie le mode ${modeName(selectedMode, territory)} pour cette zone.`,
        `No Irish source publishes ${modeName(selectedMode, territory)} for this area.`,
      )}`,
      [new ActionRowBuilder<ButtonBuilder>().addComponents(
        button("back", text("Changer de mode", "Change mode")),
        button("zones", text("Changer de zone", "Change area")),
        button("cancel", text("Annuler", "Cancel")),
      )]);
      return;
    }
    if (resumeFavorite?.networkId) {
      const favorite = resumeFavorite;
      const exactNetwork = networks.find(candidate => candidate.id === favorite.networkId);
      if (!exactNetwork) {
        stage = "error";
        await edit(text("Le réseau exact de ce favori n’est plus disponible. Relance une recherche pour choisir un autre réseau.",
          "The exact network for this favorite is no longer available. Start a new search to choose another network."));
        return;
      }
      await selectNetwork(exactNetwork);
      return;
    }
    if ((isMobilityTerritory(territory) ||
      ["en", "ie", "lu", "ch", "no", "is", "sg", "lv", "cz", "pt", "au", "ua"].includes(territory ?? "")) &&
      networks.length === 1) { await selectNetwork(networks[0]!); return; }
    filter = ""; page = 0; stage = "networks";
    await render();
  }

  async function selectNetwork(value: CatalogDataset) {
    network = value;
    if (value.resources.length) { await loadLines(); return; }
    stage = "error";
    await edit(`**${value.title}**\n${(value.limitations ?? []).join("\n")}`,
      [new ActionRowBuilder<ButtonBuilder>().addComponents(
        button("networks", text("Autre réseau", "Other network")),
        ...sourceButton({ name: value.title, url: value.page_url }, language).flatMap(row => row.components),
        button("cancel", text("Fermer", "Close")))]);
  }

  async function loadLines() {
    if (!live || (!city && !region) || !selectedMode) return;
    line = undefined; index = undefined; origin = undefined; arrival = undefined;
    serviceNote = "";
    const location = region?.name ?? city!.label;
    const loading = selectedMode === "metro"
      ? text("Recherche des stations de métro…", "Looking up metro stations…")
      : text("Chargement des lignes…", "Loading routes…");
    await edit(`**${location}**${selectedMode === "metro" && lineFilter ? ` · **${modeName(selectedMode, territory)} ${lineFilter}**` : ""}\n${loading}`);
    const result = region && network ? await service.regionLines(network, selectedMode, lineFilter, region)
      : await service.lines(city!, selectedMode, lineFilter, network?.id);
    if (!live) return;
    lines = [...result.lines].sort(compareRouteNumbers);
    logger.info({ cityId: city?.id, regionCode: region?.code, mode: selectedMode, routes: lines.length, unavailable: result.unavailable },
      "Transport routes loaded");
    const listingNotices = new Set<string>();
    if (result.refreshing) listingNotices.add(text("Lignes en cache; actualisation en cours.",
      "Cached lines; refresh in progress."));
    for (const issue of result.issues ?? []) listingNotices.add(issue);
    if (result.centerFallback) listingNotices.add(text("Repère du centre-ville indisponible : recherche autour du point géographique de la commune; liste potentiellement incomplète.",
      "Town-centre reference unavailable: searching around the municipality's geographic point; results may be incomplete."));
    if (result.targeted) listingNotices.add(text("Recherche ciblée sur la ligne demandée; les autres réseaux ne sont pas tous parcourus.",
      "Targeted search for the requested line; not all other networks were searched."));
    else if (result.networkScoped) listingNotices.add(territory === "qc"
      ? text("Seul le réseau sélectionné a été parcouru.", "Only the selected network was searched.")
      : text(`Source : ${lines[0]?.source.name ?? "réseau officiel"}. Liste limitée à ce réseau.`,
        `Source: ${lines[0]?.source.name ?? "official network"}. Results are limited to this network.`));
    listingNote = [...listingNotices].map(note => `\n${note}`).join("").slice(0, 700);
    if (!lines.length) {
      stage = "error";
      const irishSourceUnavailable = territory === "ie" && result.unavailable > 0;
      const unavailableMessage = text("Les sources de ce réseau n’ont pas pu être chargées. Cela ne signifie pas qu’aucune ligne n’existe.",
        "The network sources could not be loaded. This does not mean no routes exist.");
      const details = irishSourceUnavailable ? unavailableMessage
        : result.issues?.length ? result.issues.join("\n") : result.unavailable
          ? unavailableMessage
          : network?.id.startsWith("mobilitydatabase:") ? text(
            "Aucune ligne correspondante n’a été confirmée dans ce flux GTFS. Cela ne confirme pas l’absence de service.",
            "No matching route was confirmed in this GTFS feed. This does not confirm that no service exists.")
          : region ? text("Aucune ligne correspondante n’a été trouvée dans cette source. Essaie une autre source ou retire le filtre de ligne.",
            "No matching route was found in this source. Try another source or clear the route filter.")
            : text("Aucune ligne de ce mode n’a été repérée dans les données ouvertes près du centre de cette commune.",
              "No routes of this mode were found in open data near this city centre.");
      const networkTitle = irishSourceUnavailable ? "" : network ? `\n${network.title}` : "";
      await edit(`${region?.name ?? city!.label}${networkTitle}\n${details}`,
       [new ActionRowBuilder<ButtonBuilder>().addComponents(button("back", text("Changer de mode", "Change mode")),
           button(region?.territory === "ie" || territory === "fr" ? "zones" : "city",
             region?.territory === "ie" || territory === "fr"
               ? text("Changer de zone", "Change area") : text("Changer de commune", "Change city")),
          button("retry", text("Réessayer", "Retry")),
          button("cancel", text("Annuler", "Cancel")))]);
      return;
    }
    if (resumeFavorite) {
      const favorite = resumeFavorite;
      line = lines.find(candidate => candidate.routeId === favorite.routeId &&
        candidate.resource.id === favorite.resourceId);
      if (!line) {
        stage = "error";
        await edit(text("La ligne exacte de ce favori n’est plus publiée dans cette source. Relance une recherche pour choisir une ligne.",
          "The exact route for this favorite is no longer published in this source. Start a new search to choose a route."));
        return;
      }
      await loadOrigins();
      return;
    }
    const matching = lineFilter ? lines.filter((option) => lineMatches(lineFilter, [option.label, option.description, option.routeId])) : [];
    if (matching.length === 1) { line = matching[0]; await loadOrigins(); return; }
    stage = "lines"; filter = lineFilter; page = 0;
    await render();
  }

  async function loadOrigins() {
    if (!live || !line) return;
    await edit(text(`${modeName(line.mode, line.territory)} ${line.label} · Chargement des arrêts…`,
      `${modeName(line.mode, line.territory)} ${line.label} · Loading stops…`));
    index = await service.index(line);
    if (!live) return;
    origins = originOptions(index, line);
    if (typeof service.availableStops === "function") {
      const available = await service.availableStops(line, index, origins, language);
      if (!live) return;
      origins = available.options; serviceNote = available.note;
    }
    if (resumeFavorite) {
      const favorite = resumeFavorite;
      origin = origins.find(group => favorite.originIds.some(id => group.ids.includes(id)));
      if (!origin) {
        stage = "error";
        await edit(text("L’arrêt de départ exact de ce favori n’est plus desservi ou disponible.",
          "The exact departure stop for this favorite is no longer served or available."));
        return;
      }
      await loadArrivals();
      return;
    }
    if (origins.length === 1) {
      origin = origins[0]!;
      await loadArrivals();
      return;
    }
    stage = "origins"; origin = undefined; arrival = undefined; filter = ""; page = 0;
    await render();
  }

  async function loadArrivals() {
    if (!live || !index || !origin) return;
    arrivals = arrivalOptions(index, origin);
    if (line && typeof service.availableStops === "function") {
      const available = await service.availableStops(line, index, arrivals, language);
      if (!live) return;
      arrivals = available.options; serviceNote = available.note;
    }
    if (direction) {
      const wanted = normalizeTransitText(direction);
      arrivals.sort((a, b) => Number(normalizeTransitText(b.label).includes(wanted)) -
        Number(normalizeTransitText(a.label).includes(wanted)));
    }
    if (resumeFavorite) {
      const favorite = resumeFavorite;
      arrival = arrivals.find(group => favorite.arrivalIds.some(id => group.ids.includes(id)) &&
        Boolean(group.viaTransfer) === Boolean(favorite.arrivalViaTransfer));
      if (!arrival) {
        stage = "error";
        await edit(text("L’arrêt d’arrivée exact de ce favori n’est plus desservi ou disponible.",
          "The exact arrival stop for this favorite is no longer served or available."));
        return;
      }
      await showDepartures();
      return;
    }
    stage = "arrivals"; arrival = undefined; filter = ""; page = 0;
    await render();
  }

  async function showDepartures(reload = true) {
    if (!live || !line || !index || !origin || !arrival) return;
    if (reload || !lastResult) {
      await edit(text("Recherche des prochains départs…", "Looking up upcoming departures…"));
      lastResult = await service.departures(line, index, origin, arrival, language, timeOptions);
      expanded = false;
    }
    const result = lastResult;
    if (!live) return;
    stage = "result";
    const favorite = favoriteForCurrentJourney();
    const saved = favorite ? (await bestEffortPreference(preferencesStore.get(message.author.id), null))
      ?.favorites.some(item => item.key === favorite.key) ?? false : false;
    const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("refresh", text("Actualiser", "Refresh"), ButtonStyle.Primary),
      button("return", text("Retour", "Return journey")),
      button("options", text("Options", "Options")),
      ...(result.hasMore ? [button("more", expanded ? text("Réduire", "Show less") : text("Agrandir", "Expand"))] : []));
    const secondary = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("stops", showPreviousStops ? text("Masquer les arrêts", "Hide stops") : text("Arrêts", "Stops")),
      button("modify", text("Modifier", "Modify")),
      ...(favorite ? [button("favorite", saved ? text("Retirer ❤️", "Remove ❤️") : text("Ajouter ❤️", "Save ❤️"),
        saved ? ButtonStyle.Success : ButtonStyle.Secondary)] : []),
      ...sourceButton(result.source, language).flatMap((row) => row.components.map((component) =>
        ButtonBuilder.from(component).setLabel(text("Source", "Source")))),
      button("cancel", text("Fermer", "Close")));
    const embed = expanded ? result.expandedEmbed ?? result.embed : result.embed;
    const content = expanded ? result.expandedContent ?? result.content : result.content;
    let cardEmbed = embed && arrival?.viaTransfer && city?.label
      ? { ...embed, description: `${city.label}\n\n${embed.description ?? ""}`.slice(0, 4096) }
      : embed;
    let cardContent = city?.label ? `${city.label}\n${content}` : content;
    if (showPreviousStops) {
      const names = selectedIntermediateStops();
      const title = text("Arrêts intermédiaires", "Intermediate stops");
      const stopText = names === undefined ? text("Le détail des arrêts n’est pas disponible pour ce trajet.",
        "Stop details are unavailable for this journey.")
        : names.length ? names.slice(0, 12).map((name, i) => `${i + 1}. ${name.slice(0, 72)}`).join("\n") +
          (names.length > 12 ? `\n… ${names.length - 12} ${text("autres arrêts", "more stops")}` : "")
        : text("Aucun arrêt intermédiaire publié sur ce trajet.", "No intermediate stops are published for this journey.");
      if (cardEmbed) {
        cardEmbed = { ...cardEmbed, fields: [...(cardEmbed.fields ?? []).slice(0, 24), { name: title, value: stopText.slice(0, 1024), inline: false }] };
      } else cardContent += `\n\n**${title}**\n${stopText}`;
    }
    if (favoriteNotice) cardContent = `${favoriteNotice}\n${cardContent}`;
    await edit(cardContent, [primary, secondary], cardEmbed);
  }

  function favoriteForCurrentJourney(): TransportFavorite | null {
    if (!territory || !selectedMode || !line || !origin || !arrival || (!city && !region)) return null;
    const identity = [territory, selectedMode, city?.id ?? "", region?.code ?? "", network?.id ?? "",
      line.resource.id, line.routeId, [...origin.ids].sort(), [...arrival.ids].sort(), Boolean(arrival.viaTransfer)];
    const key = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
    return {
      key, territory, mode: selectedMode, place: region?.name ?? city?.name ?? place,
      ...(city ? { cityId: city.id } : {}), ...(region ? { region: region.name } : {}),
      ...(network ? { networkId: network.id } : {}), routeId: line.routeId, resourceId: line.resource.id,
      lineLabel: line.label, originIds: [...origin.ids], originLabel: origin.label,
      arrivalIds: [...arrival.ids], arrivalLabel: arrival.label,
      ...(arrival.viaTransfer ? { arrivalViaTransfer: true } : {}),
    };
  }

  function selectedIntermediateStops(): string[] | undefined {
    if (!index || !line || !origin || !arrival) return undefined;
    const names = (feed: JourneyIndex, visits: Array<{ stopId: string }>) => visits.map(({ stopId }) => {
      const stop = feed.stops.get(stopId);
      return stop?.stationName || stop?.name || stopId;
    }).filter((name, i, all) => i === 0 || name !== all[i - 1]);
    const direct = journeyPairs(index, new Set(origin.ids), new Set(arrival.ids))
      .filter(pair => index!.metadata.trips.get(pair.tripId)?.routeId === line!.routeId);
    const pair = direct[0];
    if (pair) {
      const visits = index.visits.get(pair.tripId) ?? [];
      const from = visits.findIndex(visit => visit.sequence === pair.origin.sequence && origin!.ids.includes(visit.stopId));
      const to = visits.findIndex(visit => visit.sequence === pair.destination.sequence && arrival!.ids.includes(visit.stopId));
      if (from >= 0 && to > from) return names(index, visits.slice(from + 1, to));
    }
    if (!arrival.viaTransfer || !index.connections) return undefined;
    try {
      const path = connectionPaths(index, new Set(origin.ids))
        .find(candidate => arrival!.ids.includes(candidate.second.destination.stopId));
      if (!path) return undefined;
      const firstVisits = index.visits.get(path.first.tripId) ?? [];
      const firstFrom = firstVisits.findIndex(visit => visit.sequence === path.first.origin.sequence &&
        origin!.ids.includes(visit.stopId));
      if (firstFrom < 0) return undefined;
      const firstTo = firstVisits.findIndex(visit => visit.sequence === path.first.destination.sequence);
      const secondVisits = index.connections.network.visits.get(path.second.tripId) ?? [];
      const secondFrom = secondVisits.findIndex(visit => visit.sequence === path.second.origin.sequence);
      const secondTo = secondVisits.findIndex(visit => visit.sequence === path.second.destination.sequence);
      if (firstTo <= firstFrom || secondFrom < 0 || secondTo <= secondFrom) return undefined;
      return [
        ...names(index, firstVisits.slice(firstFrom + 1, firstTo)),
        ...names(index.connections.network, [path.first.destination, path.second.origin]),
        ...names(index.connections.network, secondVisits.slice(secondFrom + 1, secondTo)),
      ].filter((name, i, all) => i === 0 || name !== all[i - 1]);
    } catch { return undefined; }
  }

  async function showReturn() {
    if (!live || !line || !index || !origin || !arrival) return;
    await edit(text("Vérification du trajet retour et de ses quais…", "Checking the return journey and its platforms…"));
    const reverse = await service.reverse(line, index, origin, arrival, language);
    if (!live) return;
    if (!reverse) {
      stage = "error"; lastResult = undefined;
      await edit(`**${arrival.label} → ${origin.label}**\n` +
        text("Aucun trajet retour n’a pu être confirmé entre ces arrêts dans les sources disponibles. Le trajet aller n’est pas réutilisé.",
          "No return journey could be confirmed between these stops in the available sources. Outbound departures are not reused."),
      [new ActionRowBuilder<ButtonBuilder>().addComponents(
        button("refreshReturn", text("Réessayer le retour", "Retry return")),
        button("modify", text("Arrêts", "Stops")),
        button("refresh", text("Voir l’aller", "Show outbound")),
        button("cancel", text("Fermer", "Close")))]);
      return;
    }
    line = reverse.line; index = reverse.index; origin = reverse.origin; arrival = reverse.arrival;
    selectedMode = line.mode;
    if (!lines.some(option => option.routeId === line!.routeId && option.resource.id === line!.resource.id))
      lines = [line, ...lines.filter(option => option.mode === line!.mode)];
    direction = ""; serviceNote = ""; lastResult = undefined;
    await showDepartures();
  }

  async function timeOptionsModal(interaction: MessageComponentInteraction) {
    if (!index || stage !== "result") return;
    const generation = ++modalGeneration, openedAtRevision = revision;
    const modalId = `${id}:modal:${randomUUID()}`;
    const timezone = index.metadata.timezone || "Europe/Paris";
    const input = (customId: string, label: string, placeholder: string, current?: string) => {
      const field = new TextInputBuilder().setCustomId(customId).setLabel(label)
        .setStyle(TextInputStyle.Short).setMaxLength(5).setRequired(false).setPlaceholder(placeholder);
      if (current) field.setValue(current);
      return new ActionRowBuilder<TextInputBuilder>().addComponents(field);
    };
    const rows = [
      input("departure", text("Départ à partir de (HH:MM)", "Departure after (HH:MM)"), "HH:MM",
        timeOptions.departureAfter ? displayLocalTime(timeOptions.departureAfter, timezone) : undefined),
    ];
    if (arrival?.viaTransfer) {
      rows.push(input("connection", text("Second train après (HH:MM)", "Second train after (HH:MM)"), "HH:MM",
        timeOptions.connectionAfter ? displayLocalTime(timeOptions.connectionAfter, timezone) : undefined));
      const wait = new TextInputBuilder().setCustomId("wait").setLabel(text("Attente min souhaitée (min)", "Preferred minimum wait (min)"))
        .setStyle(TextInputStyle.Short).setMaxLength(3).setRequired(false).setPlaceholder("10");
      if (timeOptions.minimumWaitSeconds !== undefined) wait.setValue(String(Math.round(timeOptions.minimumWaitSeconds / 60)));
      rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(wait));
    }
    let submitted;
    await interaction.showModal(new ModalBuilder().setCustomId(modalId).setTitle(text("Options du trajet", "Journey options"))
      .addComponents(...rows));
    submitted = await interaction.awaitModalSubmit({ time: 60_000,
      filter: (event) => event.customId === modalId && event.user.id === message.author.id }).catch(() => null);
    if (!submitted) return;
    if (!live || busy || generation !== modalGeneration || openedAtRevision !== revision) {
      await submitted.reply({ content: text("Ces options ne correspondent plus au menu actuel.", "These options no longer match the current menu."), ephemeral: true });
      return;
    }
    const now = service.currentTimeSeconds();
    const departureAfter = localTimeOption(submitted.fields.getTextInputValue("departure"), now, timezone);
    if (departureAfter === null) {
      await submitted.reply({ content: text("Heure de départ invalide. Utilise le format HH:MM.", "Invalid departure time. Use HH:MM."), ephemeral: true });
      return;
    }
    const connectionText = arrival?.viaTransfer ? submitted.fields.getTextInputValue("connection") : "";
    const connectionAfter = connectionText ? localTimeOption(connectionText, departureAfter ?? now, timezone) : undefined;
    if (connectionAfter === null) {
      await submitted.reply({ content: text("Heure du second train invalide. Utilise le format HH:MM.", "Invalid second-train time. Use HH:MM."), ephemeral: true });
      return;
    }
    const waitText = arrival?.viaTransfer ? submitted.fields.getTextInputValue("wait").trim() : "";
    const waitMinutes = waitText ? Number(waitText) : undefined;
    if (waitMinutes !== undefined && (!/^\d{1,3}$/.test(waitText) || !Number.isInteger(waitMinutes) || waitMinutes < 0 || waitMinutes > 360)) {
      await submitted.reply({ content: text("L’attente doit être un nombre entier entre 0 et 360 minutes.",
        "Wait must be a whole number from 0 to 360 minutes."), ephemeral: true });
      return;
    }
    busy = true;
    try { await submitted.deferUpdate(); } catch (error) { busy = false; throw error; }
    timeOptions = {
      ...(departureAfter ? { departureAfter } : {}),
      ...(connectionAfter ? { connectionAfter } : {}),
      ...(waitMinutes !== undefined ? { minimumWaitSeconds: waitMinutes * 60 } : {}),
    };
    showPreviousStops = false;
    await run(() => showDepartures());
  }

  async function modal(interaction: MessageComponentInteraction, action: string) {
    const generation = ++modalGeneration, openedAtRevision = revision;
    const cityEntry = action === "city";
    const zoneEntry = action === "zones" && territory !== "ie";
    const modalId = `${id}:modal:${randomUUID()}`;
    const input = new TextInputBuilder().setCustomId("value").setLabel(zoneEntry
      ? text("Région, province ou zone", "Region, province or area")
      : cityEntry ? (territory === "en"
      ? text("Ville ou localité anglaise", "English town or locality") : territory === "qc"
      ? text("Localité du Québec", "Québec locality") : selectedMode === "rail"
        ? text("Ville, gare, département ou code postal", "City, station, department or postal code")
         : text("Région, commune, département ou code postal", "Region, city, department or postal code"))
      : stage === "cities" ? text("Commune, gare ou code postal", "City, station or postal code")
      : stage === "territory" ? text("Pays ou territoire recherché", "Country or territory to find")
        : text("Numéro ou nom recherché", "Number or name to find"))
      .setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true);
    if (!cityEntry && filter) input.setValue(filter);
    let submitted;
    await interaction.showModal(new ModalBuilder().setCustomId(modalId)
      .setTitle(zoneEntry ? text("Rechercher une zone", "Search for an area")
        : cityEntry ? selectedMode === "rail" && territory === "fr" ? text("Départ du train", "Train departure")
          : text("Commune de départ", "Departure city") : text("Rechercher dans la liste", "Search the list"))
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input)));
    submitted = await interaction.awaitModalSubmit({ time: 60_000,
      filter: (event) => event.customId === modalId && event.user.id === message.author.id }).catch(() => null);
    if (!submitted) return;
    if (!live || busy || generation !== modalGeneration || openedAtRevision !== revision) {
      await submitted.reply({ content: text("Cette recherche ne correspond plus au menu actuel.", "This search no longer matches the current menu."), ephemeral: true });
      return;
    }
    busy = true;
    try { await submitted.deferUpdate(); } catch (error) { busy = false; throw error; }
    if (cityEntry || zoneEntry) {
      place = submitted.fields.getTextInputValue("value").trim(); lineFilter = ""; direction = "";
      province = "";
      await run(loadCities);
    } else {
      filter = submitted.fields.getTextInputValue("value").trim(); page = 0;
      const matches = stage === "lines" && filter
        ? choices().filter(choice => normalizeTransitText(`${choice.label} ${choice.description ?? ""}`)
          .includes(normalizeTransitText(filter))) : [];
      const selectedLine = matches.length === 1 ? lines[Number(matches[0]!.value)] : undefined;
      if (selectedLine) { line = selectedLine; await run(loadOrigins); }
      else await run(render);
    }
  }

  async function interact(interaction: MessageComponentInteraction) {
    if (!interaction.customId.startsWith(`${id}:`)) return;
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: text("Ce menu appartient à la personne qui a lancé la recherche.", "This menu belongs to the person who started the search."), ephemeral: true });
      return;
    }
    if (!live || !validControls.has(interaction.customId)) {
      await interaction.reply({ content: text("Ce choix n’est plus à jour. Utilise le menu actuel.", "This choice is outdated. Use the current menu."), ephemeral: true });
      return;
    }
    const action = interaction.customId.split(":").at(-1)!;
    if (action === "cancel") {
      await interaction.deferUpdate();
      collector.stop("cancelled");
      return;
    }
    if (busy) {
      await interaction.reply({ content: text("La recherche est en cours. Patiente un instant.", "The lookup is running. Please wait a moment."), ephemeral: true });
      return;
    }
    if (interaction.isButton() && action === "options") { await timeOptionsModal(interaction); return; }
    if (interaction.isButton() && (action === "city" || action === "filter")) { await modal(interaction, action); return; }
    busy = true; // Lock before Discord's asynchronous acknowledgement (double-click race).
    try { await interaction.deferUpdate(); } catch (error) { busy = false; throw error; }
    await run(async () => {
      if (action === "prev" || action === "next") { page += action === "next" ? 1 : -1; await render(); return; }
      if (action === "clear") { filter = ""; page = 0; await render(); return; }
      if (action === "restart") {
        resumeFavorite = undefined;
        territory = undefined; network = undefined; city = undefined; region = undefined; line = undefined; index = undefined;
        origin = undefined; arrival = undefined; lastResult = undefined; filter = ""; page = 0;
        timeOptions = {};
        showPreviousStops = false;
        place = ""; lineFilter = ""; direction = ""; cities = []; lines = []; networks = []; origins = []; arrivals = [];
        stage = "territory"; await render(); return;
      }
      if (action === "networks" && (isMobilityTerritory(territory) || territory === "qc" || territory === "en" || territory === "ie" ||
        territory === "lu" || territory === "ch" || territory === "no" || territory === "is" || territory === "sg" ||
        territory === "lv" || territory === "cz" || territory === "pt" || territory === "au" || territory === "ua" || region)) { await loadNetworks(); return; }
      if (action === "more" && stage === "result") { expanded = !expanded; await showDepartures(false); return; }
      if (action === "retry") { await loadCities(); return; }
      if (action === "zones" && territory === "ie") {
        province = ""; filter = ""; page = 0; stage = "provinces"; await render(); return;
      }
      if (action === "zones" && territory === "fr") {
        regions = typeof service.coveredRegions === "function"
          ? await service.coveredRegions(territory, selectedMode ?? "bus")
          : [];
        filter = ""; page = 0;
        if (regions.length) { stage = "regions"; await render(); }
        else await showZonesUnavailable();
        return;
      }
      if (action === "zones") { await showZonesUnavailable(); return; }
      if (action === "refresh") { showPreviousStops = false; await showDepartures(); return; }
      if (action === "return" || action === "refreshReturn") { showPreviousStops = false; await showReturn(); return; }
      if (action === "modify") { resumeFavorite = undefined; showPreviousStops = false; await loadOrigins(); return; }
      if (action === "stops") { showPreviousStops = !showPreviousStops; await showDepartures(false); return; }
      if (action === "favorite") {
        const favorite = favoriteForCurrentJourney();
        if (!favorite) return;
        const result = await bestEffortPreference(preferencesStore.toggleFavorite(message.author.id, favorite),
          { ok: false, saved: false });
        favoriteNotice = result.ok
          ? text(result.saved ? "Trajet ajouté aux favoris." : "Trajet retiré des favoris.",
            result.saved ? "Journey saved to favorites." : "Journey removed from favorites.")
          : text("Les favoris ne peuvent pas être enregistrés pour le moment.",
            "Favorites cannot be saved right now.");
        await showDepartures(false);
        return;
      }
      if (action === "back") {
        filter = ""; page = 0;
        if (stage === "result") { await loadArrivals(); return; }
        if (stage === "arrivals") { stage = "origins"; origin = undefined; await render(); return; }
        if (stage === "regions") { regions = []; await cityInput(); return; }
        if (stage === "origins") { stage = "lines"; line = undefined; await render(); return; }
        if (stage === "counties") { stage = "provinces"; province = ""; await render(); return; }
        if (stage === "provinces") { await cityInput(); return; }
        if (stage === "lines" && (isMobilityTerritory(territory) || territory === "qc" || territory === "en" || territory === "ie" ||
          territory === "lu" || territory === "ch" || territory === "no" || territory === "is" || territory === "sg" ||
          territory === "lv" || territory === "cz" || territory === "pt" || territory === "au" || territory === "ua" || region)) { stage = "networks"; network = undefined; await render(); return; }
        if (stage === "networks" && region) {
          region = undefined;
          if (territory === "ie" && province) { stage = "counties"; await render(); }
          else await cityInput();
          return;
        }
        if (stage === "networks" && cities.length === 1) { await cityInput(); return; }
        if (stage === "networks") { stage = "cities"; city = undefined; await render(); return; }
        if (stage === "lines" && cities.length > 1) { stage = "cities"; city = undefined; line = undefined; await render(); return; }
        stage = "mode"; city = undefined; line = undefined; origin = undefined; await render(); return;
      }
      if (!interaction.isStringSelectMenu() || action !== "choose") return;
      const value = interaction.values[0] ?? "";
      if (!choices().some((choice) => choice.value === value)) return;
      if (stage === "territory") {
        territory = value as TransportTerritory;
        province = "";
        preferredTerritory = territory;
        await bestEffortPreference(preferencesStore.setPreferredTerritory(message.author.id, territory), false);
        if (selectedMode) await loadCities(); else { stage = "mode"; if (await loadModeChoices()) await render(); }
      } else if (stage === "mode") {
        if (selectedMode && selectedMode !== value) { lineFilter = ""; direction = ""; }
        selectedMode = value as TransitMode;
        await loadCities();
      } else if (stage === "regions") {
        place = value;
        lineFilter = ""; direction = ""; filter = ""; page = 0;
        region = await service.region?.(place, "fr") ?? undefined;
        if (!region) throw new TransportDataError("La limite de cette région n’a pas pu être vérifiée.");
        await loadNetworks();
      } else if (stage === "provinces") {
        province = value;
        filter = ""; page = 0; stage = "counties"; await render();
      } else if (stage === "counties") {
        const county = irelandCountyByCode(value);
        if (!county) throw new TransportDataError("Le comté sélectionné n’est plus disponible.");
        place = county.osmName;
        lineFilter = ""; direction = "";
        region = await service.region?.(county.osmName, "ie") ?? undefined;
        if (!region) throw new TransportDataError("La limite de ce comté n’a pas pu être vérifiée.");
        await loadNetworks();
      } else if (stage === "cities") {
        city = cities[Number(value)]; await afterCity();
      } else if (stage === "networks") {
        await selectNetwork(networks[Number(value)]!);
      } else if (stage === "lines") {
        line = lines[Number(value)]; await loadOrigins();
      } else if (stage === "origins") {
        origin = origins[Number(value)]; await loadArrivals();
      } else if (stage === "arrivals") {
        arrival = arrivals[Number(value)]; await showDepartures();
      }
    });
  }
  collector.on("collect", (interaction) => { void interact(interaction).catch((error) => {
    logger.warn({ err: error }, "Transport menu interaction failed");
  }); });
  collector.on("end", (_items, reason) => {
    live = false; sequence++;
    // A replacement must not remove the newer session's ownership entry.
    if (active.get(sessionKey) === stop) active.delete(sessionKey);
    const notice = reason === "denied" ? text("Cette recherche n’est plus autorisée.", "This lookup is no longer authorized.")
      : reason === "cancelled" ? text("Recherche terminée.", "Search finished.")
      : reason === "replaced" ? text("Recherche remplacée par une nouvelle demande.", "Search replaced by a new request.")
      : reason === "timeout" ? text(`La recherche a dépassé le délai. Relance \`${prefix}transport\` pour réessayer.`, `The lookup timed out. Run \`${prefix}transport\` to retry.`)
      : text(`Menu expiré. Relance \`${prefix}transport\`.`, `Menu expired. Run \`${prefix}transport\` again.`);
    void prompt.edit({ content: stage === "result" && !lastEmbed ? `${lastContent.slice(0, 1750)}\n${notice}` : notice,
      embeds: stage === "result" && lastEmbed ? [lastEmbed] : [],
      components: [], allowedMentions: { parse: [] } }).catch(() => undefined);
  });
  const stop = () => collector.stop("replaced");
  active.set(sessionKey, stop);
  await run(async () => {
    if (!territory && place && selectedMode && typeof service.inferTerritory === "function")
      territory = await service.inferTerritory(place);
    // Municipality-based shorthand resolution happens once in loadCities.
    if (!territory || !selectedMode) {
      if (territory && !selectedMode) await loadModeChoices();
      if (stage !== "error") await render();
    }
    else await loadCities();
  });
}
