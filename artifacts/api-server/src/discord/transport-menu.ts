import { randomUUID } from "node:crypto";
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, StringSelectMenuBuilder,
  TextInputBuilder, TextInputStyle,
  type Message, type MessageComponentInteraction, type MessageCreateOptions,
} from "discord.js";
import { TransportBrowserClient, MODE_NAMES, originOptions, arrivalOptions, type TransportLine, type StopGroup } from "./transport-browser.js";
import { sourceButton, lineMatches, type TransportLocation } from "./public-transport.js";
import { normalizeTransitText, type TransitMode } from "./transport-query.js";
import type { JourneyIndex } from "./gtfs-journey.js";
import { logger } from "../lib/logger.js";

const browser = new TransportBrowserClient();
const active = new Map<string, () => void>();
type Stage = "mode" | "city" | "cities" | "lines" | "origins" | "arrivals" | "result" | "error";
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

export function parseTransportCommand(args: string[]) {
  const words = args.map((word) => word.trim()).filter(Boolean);
  const explicit = words.length >= 3 && /^(ligne|line)$/i.test(words.at(-2)!) ? words.at(-1) : undefined;
  const last = words.at(-1) ?? "";
  const line = explicit ?? (words.length > 1 && /^(?:\d{1,4}|[a-z]\d{0,3}|[a-z]{2,3}\d{1,3})$/i.test(last) ? last : undefined);
  const location = (explicit ? words.slice(0, -2) : line ? words.slice(0, -1) : words).join(" ");
  const journey = location.match(/^(?:de\s+)?(.+?)(?:\s+vers\s+|\s+to\s+|\s*->\s*|\s*→\s*)(.+)$/i);
  return { place: journey ? journey[1]!.trim() : location, direction: journey?.[2]?.trim(), line };
}

export async function handleTransportCommand(
  message: Message, args: string[], language: string, prefix = "!", mode: TransitMode | null = null,
  service = browser, lookupTimeoutMs = 45_000,
): Promise<void> {
  logger.info({ mode: mode ?? "choose", runtime: process.version }, "Transport command received");
  const french = language === "fr";
  const text = (fr: string, en: string) => french ? fr : en;
  const sessionKey = `${message.channelId}:${message.author.id}`;
  if (!active.has(sessionKey) && active.size >= 100) {
    await message.reply(text("Trop de recherches sont ouvertes. Réessaie dans un instant.", "Too many searches are open. Please try again shortly."));
    return;
  }
  active.get(sessionKey)?.();
  const parsed = parseTransportCommand(args);
  let place = /^(list|liste|aide|help)$/i.test(parsed.place) ? "" : parsed.place;
  let direction = parsed.direction ?? "";
  let lineFilter = parsed.line ?? "";
  let selectedMode = mode;
  let stage: Stage = mode ? "city" : "mode";
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
  let live = true;
  let sequence = 0;
  const id = `transport:${randomUUID()}`;
  const prompt = await message.reply({
    content: text("Recherche de transport en cours…", "Starting transport lookup…"),
    allowedMentions: { parse: [] },
  });
  let lastContent = prompt.content;
  const collector = prompt.createMessageComponentCollector({ time: 5 * 60_000 });
  const button = (action: string, label: string, style = ButtonStyle.Secondary) =>
    new ButtonBuilder().setCustomId(`${id}:${action}`).setLabel(label).setStyle(style);
  const edit = async (content: string, components?: NonNullable<MessageCreateOptions["components"]>) => {
    if (!live) return;
    lastContent = content.slice(0, 1950);
    await prompt.edit({ content: lastContent,
      components: components ?? [new ActionRowBuilder<ButtonBuilder>().addComponents(button("cancel", text("Annuler", "Cancel")))],
      allowedMentions: { parse: [] } });
  };

  async function cityInput() {
    stage = "city";
    await edit(text("**Transport · Commune de départ**\nIndique une commune. Les homonymes seront proposés avec leur département.",
      "**Transport · Departure city**\nEnter a city. Matching cities will include their department."),
    [new ActionRowBuilder<ButtonBuilder>().addComponents(
      button("city", text("Saisir une commune", "Enter a city"), ButtonStyle.Primary), button("cancel", text("Annuler", "Cancel")))]);
  }

  function choices(): Choice[] {
    if (stage === "mode") return (Object.keys(MODE_NAMES) as TransitMode[]).map((value) => ({ value, label: MODE_NAMES[value] }));
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
      mode: text("Choisis un moyen de transport", "Choose a transport mode"),
      cities: text("Quelle commune de départ ?", "Which departure city?"),
      lines: text("Choisis une ligne", "Choose a route"),
      origins: text("Choisis ton arrêt de départ", "Choose your departure stop"),
      arrivals: text("Choisis ton arrêt d’arrivée", "Choose your arrival stop"),
    };
    const context = [city?.label, selectedMode ? MODE_NAMES[selectedMode] : "", line ? `${text("Ligne", "Route")} ${line.label}` : "",
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
    if (stage !== "mode") controls.addComponents(button("back", text("Retour", "Back")));
    if (stage === "lines" || stage === "origins" || stage === "arrivals") controls.addComponents(button("filter", text("Rechercher", "Search")));
    controls.addComponents(button("cancel", text("Annuler", "Cancel")));
    rows.push(controls);
    if (filter) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button("clear", text("Tout afficher", "Show all"))));
    const empty = text("Aucun choix ne correspond à cette recherche.", "No choices match this search.");
    const note = stage === "arrivals" ? text("\nTrajets directs ou avec 1 correspondance publiée, dans la même source officielle. Tous modes à l’arrivée; autres réseaux et marche non calculés. Horaires vérifiés après sélection.",
      "\nDirect journeys or 1 published transfer within the same official source. Any arrival mode; other networks and walking not calculated. Times checked after selection.") +
      (index?.connections?.limited ? text("\nListe partielle : limite de lignes atteinte.", "\nPartial list: route limit reached.") : "") +
      (index?.connectionsUnavailable ? text("\nRecherche des correspondances indisponible ou trop volumineuse : seuls les trajets directs sont proposés.",
        "\nTransfer search unavailable or too large: only direct journeys are offered.") : "") : "";
    await edit(`**${titles[stage]}**${context ? `\n${context}` : ""}\n${matching.length ? `${matching.length} ${text("choix", "choices")} · ${page + 1}/${pages}` : empty}${filter ? `\n${text("Filtre", "Filter")} : ${filter}` : ""}${note}${stage === "lines" ? listingNote : ""}`, rows);
  }

  async function run(work: () => Promise<void>) {
    busy = true;
    const current = ++sequence;
    try {
      await transportDeadline(work(), lookupTimeoutMs);
    } catch (error) {
      if (!live || current !== sequence) return;
      stage = "error";
      logger.warn({ err: error, mode: selectedMode, cityId: city?.id }, "Transport menu lookup failed");
      if (error instanceof Error && error.message === "Transport lookup timed out") {
        collector.stop("timeout");
        return;
      }
      await edit(text("La recherche n’a pas abouti à temps ou une source est indisponible. Tu peux réessayer; aucune ligne ne sera inventée.",
        "The lookup timed out or a source is unavailable. You can retry; routes will not be invented."),
      [new ActionRowBuilder<ButtonBuilder>().addComponents(button("retry", text("Réessayer", "Retry")),
        button("city", text("Changer de commune", "Change city")), button("cancel", text("Annuler", "Cancel")))]);
    } finally { if (current === sequence) busy = false; }
  }

  async function loadCities() {
    if (!live) return;
    line = undefined; index = undefined; origin = undefined; arrival = undefined; city = undefined;
    if (!place) { await cityInput(); return; }
    await edit(text("Recherche des communes…", "Looking up cities…"));
    cities = await service.cities(place);
    if (!live) return;
    if (!cities.length) {
      await cityInput();
      await prompt.edit({ content: text(`Je ne trouve pas de commune pour « ${place} ». Indique une ville, puis choisis l’arrêt dans les menus.`,
        `No city found for “${place}”. Enter a city, then choose the stop in the menus.`) });
      return;
    }
    filter = ""; page = 0;
    if (cities.length === 1) { city = cities[0]; await loadLines(); }
    else { stage = "cities"; await render(); }
  }

  async function loadLines() {
    if (!live || !city || !selectedMode) return;
    line = undefined; index = undefined; origin = undefined; arrival = undefined;
    await edit(`${city.label}\n${text("Chargement des lignes…", "Loading routes…")}`);
    const result = await service.lines(city, selectedMode);
    if (!live) return;
    lines = result.lines;
    logger.info({ cityId: city.id, mode: selectedMode, routes: lines.length, unavailable: result.unavailable },
      "Transport routes loaded");
    listingNote = result.unavailable ? text("\nCertains réseaux n’ont pas pu être chargés; cette liste peut être incomplète.",
      "\nSome network sources could not be loaded; this list may be incomplete.") : "";
    if (!lines.length) {
      stage = "error";
      await edit(`${city.label}\n${result.unavailable
        ? text("Les sources de ce réseau n’ont pas pu être chargées. Cela ne signifie pas qu’aucune ligne n’existe.",
          "The network sources could not be loaded. This does not mean no routes exist.")
        : text("Aucune ligne de ce mode n’a été repérée dans les données ouvertes près du centre de cette commune.",
          "No routes of this mode were found in open data near this city centre.")}`,
      [new ActionRowBuilder<ButtonBuilder>().addComponents(button("back", text("Changer de mode", "Change mode")),
        button("city", text("Changer de commune", "Change city")), button("retry", text("Réessayer", "Retry")), button("cancel", text("Annuler", "Cancel")))]);
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
    stage = "origins"; origin = undefined; arrival = undefined; filter = ""; page = 0;
    await render();
  }

  async function loadArrivals() {
    if (!live || !index || !origin) return;
    arrivals = arrivalOptions(index, origin);
    stage = "arrivals"; arrival = undefined; filter = direction; page = 0;
    await render();
  }

  async function showDepartures() {
    if (!live || !line || !index || !origin || !arrival) return;
    await edit(text("Recherche des prochains départs…", "Looking up upcoming departures…"));
    const result = await service.departures(line, index, origin, arrival, language);
    if (!live) return;
    stage = "result";
    await edit(`${city?.label ?? ""}\n${result.content}`, [
      ...sourceButton(result.source, language),
      new ActionRowBuilder<ButtonBuilder>().addComponents(button("back", text("Changer l’arrivée", "Change arrival")),
        button("refresh", text("Actualiser", "Refresh")), button("city", text("Changer de commune", "Change city")), button("cancel", text("Terminer", "Finish"))),
    ]);
  }

  async function modal(interaction: MessageComponentInteraction, action: string) {
    modalPending = true;
    const cityEntry = action === "city";
    const modalId = `${id}:modal:${randomUUID()}`;
    const input = new TextInputBuilder().setCustomId("value").setLabel(cityEntry ? text("Commune et département facultatif", "City and optional department") : text("Numéro ou nom recherché", "Number or name to find"))
      .setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true);
    if (!cityEntry && filter) input.setValue(filter);
    let submitted;
    try {
      await interaction.showModal(new ModalBuilder().setCustomId(modalId)
        .setTitle(cityEntry ? text("Commune de départ", "Departure city") : text("Rechercher dans la liste", "Search the list"))
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
      if (action === "retry") { await loadCities(); return; }
      if (action === "refresh") { await showDepartures(); return; }
      if (action === "back") {
        filter = ""; page = 0;
        if (stage === "result") { await loadArrivals(); return; }
        if (stage === "arrivals") { stage = "origins"; origin = undefined; await render(); return; }
        if (stage === "origins") { stage = "lines"; line = undefined; await render(); return; }
        if (stage === "lines" && cities.length > 1) { stage = "cities"; city = undefined; line = undefined; await render(); return; }
        stage = "mode"; city = undefined; line = undefined; origin = undefined; await render(); return;
      }
      if (!interaction.isStringSelectMenu() || action !== "choose") return;
      const value = interaction.values[0] ?? "";
      if (!choices().some((choice) => choice.value === value)) return;
      if (stage === "mode") {
        if (selectedMode && selectedMode !== value) { lineFilter = ""; direction = ""; }
        selectedMode = value as TransitMode;
        await loadCities();
      } else if (stage === "cities") {
        city = cities[Number(value)]; await loadLines();
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
    const notice = reason === "cancelled" ? text("Recherche terminée.", "Search finished.")
      : reason === "replaced" ? text("Recherche remplacée par une nouvelle demande.", "Search replaced by a new request.")
      : reason === "timeout" ? text(`La recherche a dépassé le délai. Relance \`${prefix}transport\` pour réessayer.`, `The lookup timed out. Run \`${prefix}transport\` to retry.`)
      : text(`Menu expiré. Relance \`${prefix}transport\`.`, `Menu expired. Run \`${prefix}transport\` again.`);
    void prompt.edit({ content: stage === "result" ? `${lastContent.slice(0, 1750)}\n${notice}` : notice,
      components: [], allowedMentions: { parse: [] } }).catch(() => undefined);
  });
  const stop = () => collector.stop("replaced");
  active.set(sessionKey, stop);
  await run(async () => {
    // Preserve the shorthand "!bus Beauvais Amiens 601", while resolving homonyms later.
    if (mode === "bus" && place && lineFilter && !direction) {
      const query = await service.provider.resolveBusQuery(place, lineFilter);
      if (!live) return;
      place = query.place; direction = query.direction ?? "";
    }
    if (!selectedMode) await render();
    else await loadCities();
  });
}
