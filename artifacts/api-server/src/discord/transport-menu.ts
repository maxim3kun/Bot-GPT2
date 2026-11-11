import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, StringSelectMenuBuilder,
  TextInputBuilder, TextInputStyle,
  type APIEmbed, type Message, type MessageComponentInteraction, type MessageCreateOptions,
} from "discord.js";
import { TransportBrowserClient, MODE_NAMES, modeName, originOptions, arrivalOptions, type TransportLine, type StopGroup, type TransportDepartureResult } from "./transport-browser.js";
import { sourceButton, lineMatches, type TransportLocation, type CatalogDataset } from "./public-transport.js";
import { TERRITORY_NAMES, type TransportTerritory } from "./transport-provider.js";
import { normalizeTransitText, type TransitMode } from "./transport-query.js";
import type { JourneyIndex } from "./gtfs-journey.js";
import { logger } from "../lib/logger.js";
import { resolveBusJourney, normalizeCityName } from "./bus-journey.js";
import { TransportDataError } from "./transport-data-error.js";
import { parseTransportCommand } from "./transport-command-query.js";
export { parseTransportCommand } from "./transport-command-query.js";

const browser = new TransportBrowserClient();
const active = new Map<string, () => void>();
type Stage = "territory" | "mode" | "city" | "cities" | "networks" | "lines" | "origins" | "arrivals" | "result" | "error";
type Choice = { label: string; description?: string; value: string };

export async function transportDeadline<T>(work: Promise<T>, milliseconds = 45_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Transport lookup timed out")), milliseconds);
      timer.unref();
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function handleTransportCommand(
  message: Message, args: string[], language: string, prefix = "!", mode: TransitMode | null = null,
  service = browser, lookupTimeoutMs = 45_000,
): Promise<void> {
  return handleTransportSearch(message, { ...parseTransportCommand(args), mode }, language, prefix, service, lookupTimeoutMs);
}

export interface TransportSearch {
  place: string; direction?: string; line?: string; territory?: TransportTerritory; mode: TransitMode | null;
}
export async function handleTransportSearch(
  message: Message, parsed: TransportSearch, language: string, prefix = "!", service = browser, lookupTimeoutMs = 45_000,
  authorize?: () => Promise<boolean>,
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
  let territory: TransportTerritory | undefined = parsed.territory ?? (service.territories ? undefined : "fr");
  let stage: Stage = !territory ? "territory" : mode ? "city" : "mode";
  let networks: CatalogDataset[] = [];
  let network: CatalogDataset | undefined;
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
  let modalPending = false;
  let listingNote = "";
  let serviceNote = "";
  let live = true;
  let sequence = 0;
  let lastEmbed: APIEmbed | undefined;
  let lastResult: TransportDepartureResult | undefined;
  let expanded = false;
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
    lastContent = content.slice(0, 1950);
    lastEmbed = embed;
    const options = { content: embed ? "" : lastContent, embeds: embed ? [embed] : [],
      components: components ?? [new ActionRowBuilder<ButtonBuilder>().addComponents(button("cancel", text("Annuler", "Cancel")))],
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
    await edit(`**Transport · ${territory ? TERRITORY_NAMES[territory] : ""}**\n` + (territory === "qc"
      ? text("Indique une localité québécoise. Les homonymes seront proposés avec leur région.", "Enter a Québec locality. Matching places include their region.")
      : selectedMode === "rail"
        ? text("Indique une ville, une gare, un département ou un code postal. Les gares du référentiel voyageurs seront proposées; leurs horaires restent à vérifier.",
          "Enter a city, station, department or postal code. Passenger-station reference results are offered; timetables still need checking.")
        : text("Indique une commune, un département (ex. 60) ou un code postal (ex. 60000).", "Enter a city, department (e.g. 60) or postal code (e.g. 60000).")),
    [new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("city", text("Saisir une commune", "Enter a city"), ButtonStyle.Primary),
      button("restart", text("Nouvelle recherche", "New search")), button("cancel", text("Annuler", "Cancel")))]);
  }

  function choices(): Choice[] {
    if (stage === "territory") return (service.territories ?? ["fr"]).map(value => ({ value, label: TERRITORY_NAMES[value] }));
    if (stage === "mode") return (Object.keys(MODE_NAMES) as TransitMode[]).map((value) => ({ value, label: modeName(value, territory) }));
    if (stage === "networks") return networks.map((d, i) => ({ value: String(i), label: d.title,
      description: d.resources.length ? text("Source officielle · horaires selon disponibilité", "Official source · timetables where available")
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
    const all = choices();
    const matching = all.filter((choice) => normalizeTransitText(`${choice.label} ${choice.description ?? ""}`).includes(normalizeTransitText(filter)));
    const pages = Math.max(1, Math.ceil(matching.length / 25));
    page = Math.max(0, Math.min(page, pages - 1));
    const titles: Partial<Record<Stage, string>> = {
      territory: text("France ou Québec ?", "France or Québec?"),
      mode: text("Choisis un moyen de transport", "Choose a transport mode"),
      networks: text("Choisis un réseau", "Choose a network"),
      cities: cities.length && cities.every(c => c.kind === "station")
        ? text("Quelle gare de départ ?", "Which departure station?") : text("Quelle commune de départ ?", "Which departure city?"),
      lines: text("Choisis une ligne", "Choose a route"),
      origins: text("Choisis ton arrêt de départ", "Choose your departure stop"),
      arrivals: text("Choisis ton arrêt d’arrivée", "Choose your arrival stop"),
    };
    const context = [territory ? TERRITORY_NAMES[territory] : "", city?.label,
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
    if (pages > 1) controls.addComponents(button("prev", "←").setDisabled(page === 0), button("next", "→").setDisabled(page === pages - 1));
    if (stage !== "mode" && stage !== "territory") controls.addComponents(button("back", text("Retour", "Back")));
    if (stage === "cities" || stage === "networks" || stage === "lines" || stage === "origins" || stage === "arrivals") controls.addComponents(button("filter", text("Rechercher", "Search")));
    controls.addComponents(button("cancel", text("Annuler", "Cancel")));
    rows.push(controls);
    if (stage !== "territory") rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button("restart", text("Nouvelle recherche", "New search"))));
    if (filter) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button("clear", text("Tout afficher", "Show all"))));
    const empty = text("Aucun choix ne correspond à cette recherche.", "No choices match this search.");
    const note = stage === "arrivals" ? (line?.selection
      ? text("\nTrajets directs sur la ligne choisie. Correspondances non calculées pour cette grande source.",
        "\nDirect journeys on the chosen line. Transfers are not calculated for this large source.")
      : text("\nTrajets directs ou avec 1 correspondance publiée, dans la même source officielle. Tous modes à l’arrivée; autres réseaux et marche non calculés. Horaires vérifiés après sélection.",
        "\nDirect journeys or 1 published transfer within the same official source. Any arrival mode; other networks and walking not calculated. Times checked after selection.")) +
      (index?.connections?.limited ? text("\nListe partielle : limite de lignes atteinte.", "\nPartial list: route limit reached.") : "") +
      (index?.connectionsUnavailable && !line?.selection ? text("\nRecherche des correspondances indisponible ou trop volumineuse : seuls les trajets directs sont proposés.",
        "\nTransfer search unavailable or too large: only direct journeys are offered.") : "") : "";
    await edit(`**${titles[stage]}**${context ? `\n${context}` : ""}\n${matching.length ? `${matching.length} ${text("choix", "choices")} · ${page + 1}/${pages}` : empty}${filter ? `\n${text("Filtre", "Filter")} : ${filter}` : ""}${note}${stage === "lines" ? listingNote : ""}${(stage === "origins" || stage === "arrivals") && serviceNote ? `\n${serviceNote}` : ""}`, rows);
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
      await transportDeadline(work(), lookupTimeoutMs);
    } catch (error) {
      if (!live || current !== sequence) return;
      stage = "error";
      logger.warn({ err: error, mode: selectedMode, cityId: city?.id }, "Transport menu lookup failed");
      if (error instanceof Error && error.message === "Transport lookup timed out") {
        collector.stop("timeout");
        return;
      }
      await edit(error instanceof TransportDataError ? `${network?.title ?? city?.label ?? ""}\n${error.message}` :
        text("La recherche n’a pas abouti à temps ou une source est indisponible. Tu peux réessayer; aucune ligne ne sera inventée.",
         "The lookup timed out or a source is unavailable. You can retry; routes will not be invented."),
      [new ActionRowBuilder<ButtonBuilder>().addComponents(button("retry", text("Réessayer", "Retry")),
         button("city", text("Changer de commune", "Change city")), button("restart", text("Nouvelle recherche", "New search")),
         button("cancel", text("Annuler", "Cancel")))]);
    } finally { if (current === sequence) busy = false; }
  }

  async function loadCities() {
    if (!live) return;
    line = undefined; index = undefined; origin = undefined; arrival = undefined; city = undefined; network = undefined;
    if (!place) { await cityInput(); return; }
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
    if (!cities.length) {
      await cityInput();
      await prompt.edit({ content: selectedMode === "rail" && territory === "fr"
        ? text(`Aucune gare trouvée dans le référentiel voyageurs pour « ${place} ». Cela ne confirme pas une absence de trains. Essaie une ville ou une gare voisine.`,
          `No passenger-reference station found for “${place}”. This does not establish that there are no trains. Try a nearby city or station.`)
        : text(`Je ne trouve pas de commune pour « ${place} ». Indique une ville, un département ou un code postal.`,
          `No city found for “${place}”. Enter a city, department or postal code.`) });
      return;
    }
    filter = ""; page = 0;
    if (cities.length === 1) { city = cities[0]; await afterCity(); }
    else { stage = "cities"; await render(); }
  }

  async function afterCity() {
    if (territory === "qc") await loadNetworks(); else await loadLines();
  }

  async function loadNetworks() {
    if (!live || !city || !selectedMode) return;
    network = undefined; line = undefined; index = undefined; origin = undefined; arrival = undefined;
    await edit(text("Recherche des réseaux québécois…", "Looking up Québec networks…"));
    networks = await service.networks(city, selectedMode);
    if (!live) return;
    filter = ""; page = 0; stage = "networks";
    await render();
  }

  async function selectNetwork(value: CatalogDataset) {
    network = value;
    if (value.resources.length) { await loadLines(); return; }
    stage = "error";
    await edit(`**${value.title}**\n${(value.limitations ?? []).join("\n")}`,
      [new ActionRowBuilder<ButtonBuilder>().addComponents(
        button("networks", text("Autre réseau", "Other network")), button("restart", text("Nouvelle recherche", "New search")),
        ...sourceButton({ name: value.title, url: value.page_url }, language).flatMap(row => row.components),
        button("cancel", text("Fermer", "Close")))]);
  }

  async function loadLines() {
    if (!live || !city || !selectedMode) return;
    line = undefined; index = undefined; origin = undefined; arrival = undefined;
    serviceNote = "";
    await edit(`${city.label}\n${text("Chargement des lignes…", "Loading routes…")}${selectedMode === "metro"
      ? text("\nLe premier chargement d’un grand réseau peut prendre quelques dizaines de secondes; les données sont ensuite mises en cache.",
        "\nLoading a large network for the first time may take several tens of seconds; the data is then cached.") : ""}`);
    const result = await service.lines(city, selectedMode, lineFilter, network?.id);
    if (!live) return;
    lines = result.lines;
    logger.info({ cityId: city.id, mode: selectedMode, routes: lines.length, unavailable: result.unavailable },
      "Transport routes loaded");
    listingNote = result.unavailable ? text("\nCertains réseaux n’ont pas pu être chargés; cette liste peut être incomplète.",
      "\nSome network sources could not be loaded; this list may be incomplete.") : "";
    if (result.issues?.length) listingNote += `\n${result.issues.join("\n").slice(0, 500)}`;
    if (result.centerFallback) listingNote += text("\nRepère du centre-ville indisponible : recherche autour du point géographique de la commune; liste potentiellement incomplète.",
      "\nTown-centre reference unavailable: searching around the municipality's geographic point; results may be incomplete.");
    if (result.targeted) listingNote += text("\nRecherche ciblée sur la ligne demandée; les autres réseaux ne sont pas tous parcourus.",
      "\nTargeted search for the requested line; not all other networks were searched.");
    else if (result.networkScoped) listingNote += territory === "qc"
      ? text("\nSeul le réseau sélectionné a été parcouru.", "\nOnly the selected network was searched.")
      : text(`\nSource : ${lines[0]?.source.name ?? "réseau officiel"}. Liste limitée à ce réseau.`,
        `\nSource: ${lines[0]?.source.name ?? "official network"}. Results are limited to this network.`);
    if (!lines.length) {
      stage = "error";
      await edit(`${city.label}${network ? `\n${network.title}` : ""}\n${result.issues?.length ? result.issues.join("\n") : result.unavailable
        ? text("Les sources de ce réseau n’ont pas pu être chargées. Cela ne signifie pas qu’aucune ligne n’existe.",
          "The network sources could not be loaded. This does not mean no routes exist.")
        : text("Aucune ligne de ce mode n’a été repérée dans les données ouvertes près du centre de cette commune.",
          "No routes of this mode were found in open data near this city centre.")}`,
      [new ActionRowBuilder<ButtonBuilder>().addComponents(button("back", text("Changer de mode", "Change mode")),
         button("city", text("Changer de commune", "Change city")), button("retry", text("Réessayer", "Retry")),
         button("restart", text("Nouvelle recherche", "New search")), button("cancel", text("Annuler", "Cancel")))]);
      return;
    }
    const matching = lineFilter ? lines.filter((option) => lineMatches(lineFilter, [option.label, option.description, option.routeId])) : [];
    if (matching.length === 1) { line = matching[0]; await loadOrigins(); return; }
    stage = "lines"; filter = lineFilter; page = 0;
    await render();
  }

  async function loadOrigins() {
    if (!live || !line) return;
    await edit(`${line.label} · ${text("Chargement des arrêts…", "Loading stops…")}`);
    index = await service.index(line);
    if (!live) return;
    origins = originOptions(index, line);
    if (typeof service.availableStops === "function") {
      const available = await service.availableStops(line, index, origins, language);
      if (!live) return;
      origins = available.options; serviceNote = available.note;
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
    stage = "arrivals"; arrival = undefined; filter = ""; page = 0;
    await render();
  }

  async function showDepartures(reload = true) {
    if (!live || !line || !index || !origin || !arrival) return;
    if (reload || !lastResult) {
      await edit(text("Recherche des prochains départs…", "Looking up upcoming departures…"));
      lastResult = await service.departures(line, index, origin, arrival, language);
      expanded = false;
    }
    const result = lastResult;
    if (!live) return;
    stage = "result";
    const primary = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("refresh", text("Actualiser", "Refresh"), ButtonStyle.Primary),
      button("back", text("Arrivée", "Destination")));
    if (result.hasMore) primary.addComponents(button("more", expanded ? text("Réduire", "Show less") : text("Plus d’horaires", "More times")));
    const secondary = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("restart", text("Nouvelle recherche", "New search")),
      ...sourceButton(result.source, language).flatMap((row) => row.components.map((component) =>
        ButtonBuilder.from(component).setLabel(text("Source", "Source")))),
      button("cancel", text("Fermer", "Close")));
    const embed = expanded ? result.expandedEmbed ?? result.embed : result.embed;
    const content = expanded ? result.expandedContent ?? result.content : result.content;
    await edit(embed ? content : `${city?.label ?? ""}\n${content}`, [primary, secondary], embed);
  }

  async function modal(interaction: MessageComponentInteraction, action: string) {
    modalPending = true;
    const cityEntry = action === "city";
    const modalId = `${id}:modal:${randomUUID()}`;
    const input = new TextInputBuilder().setCustomId("value").setLabel(cityEntry ? (territory === "qc"
      ? text("Localité du Québec", "Québec locality") : selectedMode === "rail"
        ? text("Ville, gare, département ou code postal", "City, station, department or postal code")
        : text("Commune, département ou code postal", "City, department or postal code"))
      : stage === "cities" ? text("Commune, gare ou code postal", "City, station or postal code")
        : text("Numéro ou nom recherché", "Number or name to find"))
      .setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true);
    if (!cityEntry && filter) input.setValue(filter);
    let submitted;
    try {
      await interaction.showModal(new ModalBuilder().setCustomId(modalId)
        .setTitle(cityEntry ? selectedMode === "rail" && territory === "fr" ? text("Départ du train", "Train departure")
          : text("Commune de départ", "Departure city") : text("Rechercher dans la liste", "Search the list"))
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input)));
      submitted = await interaction.awaitModalSubmit({ time: 60_000,
        filter: (event) => event.customId === modalId && event.user.id === message.author.id }).catch(() => null);
    } finally { modalPending = false; }
    if (!submitted) return;
    if (!live || busy) {
      await submitted.reply({ content: text("Cette recherche a expiré ou travaille déjà.", "This search expired or is already busy."), ephemeral: true });
      return;
    }
    await submitted.deferUpdate();
    if (cityEntry) {
      place = submitted.fields.getTextInputValue("value").trim(); lineFilter = ""; direction = "";
      await run(loadCities);
    } else {
      filter = submitted.fields.getTextInputValue("value").trim(); page = 0;
      await render();
    }
  }

  async function interact(interaction: MessageComponentInteraction) {
    if (!interaction.customId.startsWith(`${id}:`)) return;
    if (interaction.user.id !== message.author.id) {
      await interaction.reply({ content: text("Ce menu appartient à la personne qui a lancé la recherche.", "This menu belongs to the person who started the search."), ephemeral: true });
      return;
    }
    if (interaction.customId === `${id}:cancel`) {
      await interaction.deferUpdate();
      collector.stop("cancelled");
      return;
    }
    if (busy || modalPending) {
      await interaction.reply({ content: text("La recherche est en cours. Patiente un instant.", "The lookup is running. Please wait a moment."), ephemeral: true });
      return;
    }
    const action = interaction.customId.slice(id.length + 1);
    if (interaction.isButton() && (action === "city" || action === "filter")) { await modal(interaction, action); return; }
    await interaction.deferUpdate();
    if (action === "prev" || action === "next") { page += action === "next" ? 1 : -1; await render(); return; }
    if (action === "clear") { filter = ""; page = 0; await render(); return; }
    await run(async () => {
      if (action === "restart") {
        territory = undefined; network = undefined; city = undefined; line = undefined; index = undefined;
        origin = undefined; arrival = undefined; lastResult = undefined; filter = ""; page = 0;
        place = ""; lineFilter = ""; direction = ""; cities = []; lines = []; networks = []; origins = []; arrivals = [];
        stage = "territory"; await render(); return;
      }
      if (action === "networks" && territory === "qc") { await loadNetworks(); return; }
      if (action === "more" && stage === "result") { expanded = !expanded; await showDepartures(false); return; }
      if (action === "retry") { await loadCities(); return; }
      if (action === "refresh") { await showDepartures(); return; }
      if (action === "back") {
        filter = ""; page = 0;
        if (stage === "result") { await loadArrivals(); return; }
        if (stage === "arrivals") { stage = "origins"; origin = undefined; await render(); return; }
        if (stage === "origins") { stage = "lines"; line = undefined; await render(); return; }
        if (stage === "lines" && territory === "qc") { stage = "networks"; network = undefined; await render(); return; }
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
        if (selectedMode) await loadCities(); else { stage = "mode"; await render(); }
      } else if (stage === "mode") {
        if (selectedMode && selectedMode !== value) { lineFilter = ""; direction = ""; }
        selectedMode = value as TransitMode;
        await loadCities();
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
    // Municipality-based shorthand resolution happens once in loadCities.
    if (!territory || !selectedMode) await render();
    else await loadCities();
  });
}
