import test from "node:test";
import assert from "node:assert/strict";
import { commandSafety, completeAiCommand, selectAiCommand, isTimetableSearch } from "../src/discord/ai-command-intent.js";
import { parseAiCommandTool, type AiCommandAction } from "../src/discord/ai-command-tools.js";
import { authorizeAudioStream, togglePlaybackState } from "../src/discord/audio-playback-state.js";
import { searchActorAllowed } from "../src/discord/audio-search-access.js";
const stations = { nrj: { name: "NRJ" }, franceinter: { name: "France Inter" } };
const selected = (text: string) => { const result = selectAiCommand(text, stations); assert.equal(result.kind, "action", text); return result.kind === "action" ? result.action : null; };
for (const [text, expected] of [
  ["Peux-tu lancer un démineur difficile ?", { name: "start_minesweeper", difficulty: "hard" }],
  ["Lance une partie de Puissance 4", { name: "start_connect4" }],
  ["Lance GeoGuessr en facile", { name: "start_geoguessr", difficulty: "easy" }],
  ["Lance trivia", { name: "start_trivia" }],
  ["Lance devine le nombre", { name: "start_guess_number" }],
  ["Lance devine le logo difficile", { name: "start_guess_logo", difficulty: "hard" }],
  ["Mets France Inter", { name: "play_radio", station: "franceinter" }],
  ["Joue Stromae Papaoutai sur YouTube", { name: "play_youtube", query: "Stromae Papaoutai" }],
  ["Recherche sur YouTube Daft Punk", { name: "search_youtube", query: "Daft Punk" }],
  ["Mets la musique en pause", { name: "music_pause" }],
  ["Reprends la musique", { name: "music_resume" }],
  ["Passe au morceau suivant", { name: "music_skip" }],
  ["Arrête la musique", { name: "music_stop" }],
  ["Montre la file d’attente", { name: "music_queue" }],
  ["Quel est le titre en cours ?", { name: "music_current" }],
  ["Montre les horaires du métro ligne 8 Paris en France", { name: "search_transport", mode: "metro", place: "Paris", line: "8", territory: "fr" }],
  ["Cherche les horaires du bus Amiens vers Beauvais 601 en France", { name: "search_transport", mode: "bus", place: "Amiens", line: "601", direction: "Beauvais", territory: "fr" }],
  ["Bus 601 Amiens", { name: "search_transport", mode: "bus", place: "Amiens", line: "601" }],
  ["Montre les horaires des trains à Montréal au Québec", { name: "search_transport", mode: "rail", place: "Montréal", territory: "qc" }],
  ["Horaires tram Québec", { name: "search_transport", mode: "tram", place: "Québec" }],
  ["Peux-tu chercher les horaires du métro à Paris en France ?", { name: "search_transport", mode: "metro", place: "Paris", territory: "fr" }],
] as [string, AiCommandAction][]) test(`Natural action: ${text}`, () => assert.deepEqual(selected(text), expected));
test("Timetable searches do not absorb a transfer itinerary", () => {
  assert.equal(isTimetableSearch("Montre les horaires du métro à Paris"), true);
  assert.equal(isTimetableSearch("Quel trajet de Dugommier à Pointe du Lac avec correspondance ?"), false);
  assert.equal(selectAiCommand("Quel trajet de Dugommier à Pointe du Lac ?", stations).kind, "none");
  assert.equal(isTimetableSearch("Quel métro prendre de Dugommier à Pointe du Lac ?"), false);
});
test("Descriptions, quotes, hypothetical and negated instructions never select an action", () => {
  for (const text of [
    "'Lance un démineur'", '"Mets NRJ"', "> Mets NRJ", "```mets NRJ```",
    "Il a dit mets NRJ", "Explique comment lancer trivia", "Je joue au démineur",
    "Si tu peux mets NRJ", "Mets NRJ si je rejoins le vocal", "Ne lance pas un démineur",
    "Peux-tu ne pas jouer Stromae", "Mets pas de musique", "Joue Stromae mais pas maintenant",
    "La commande dit : lance GeoGuessr", "Comment utiliser la radio ?", "J'aime bien le métro",
  ]) assert.equal(selectAiCommand(text, stations).kind, "none", text);
  assert.notEqual(commandSafety("Ce n'est pas vrai, revérifie le trajet"), "quoted");
});
test("Multiple actions are clarified, never partially performed", () => {
  for (const text of ["Lance un démineur et mets NRJ", "Joue Stromae puis lance trivia",
    "Lance un démineur et un GeoGuessr", "Montre les horaires du bus et joue Stromae",
    "Quel trajet de Dugommier à Pointe du Lac et mets NRJ", "Joue Stromae, reprends la musique",
    "Joue Stromae. Arrête la musique"]) assert.equal(selectAiCommand(text, stations).kind, "clarify", text);
});
test("Missing or unsupported arguments lead to clarification instead of a substitute", () => {
  for (const text of ["Mets une radio", "Mets la radio Inventée", "Mets de la musique", "Lance un jeu",
    "Lance trivia difficile", "Lance devine le nombre entre 1 et 1000", "Lance un démineur impossible",
    "Joue aux échecs", "Horaires bus ligne", "Joue https://attacker.invalid/x sur YouTube"])
    assert.equal(selectAiCommand(text, stations).kind, "clarify", text);
});
test("New tool contracts reject extra authority, unknown parameters, URLs and multiple calls", () => {
  const tool = (name: string, args: unknown) => ({ type: "function", function: { name, arguments: JSON.stringify(args) } });
  for (const call of [
    tool("play_youtube", { query: "test", channelId: "other" }), tool("play_youtube", { query: "https://attacker.invalid" }),
    tool("search_transport", { mode: "plane", place: "Paris" }), tool("search_transport", { mode: "metro", place: "Paris", territory: "ca" }),
    tool("search_transport", { mode: "bus", place: "Paris", line: "!admin" }),
    tool("start_guess_number", { maximum: 1000 }), tool("start_trivia", { category: "science" }),
    tool("music_stop", { guildId: "other" }), tool("start_geoguessr", { difficulty: "impossible" }),
  ]) assert.equal(parseAiCommandTool([call], ["nrj"]), null, call.function.arguments);
  assert.equal(parseAiCommandTool([tool("music_pause", {}), tool("music_stop", {})], []), null);
});
test("Audio state changes require the player's confirmation and retain their old state on failure", () => {
  let confirmed = false;
  const state = { paused: false, youtubeTitle: "Track", stationKey: null, player: { pause: () => confirmed, unpause: () => confirmed } };
  assert.equal(togglePlaybackState(state), "not_playing"); assert.equal(state.paused, false);
  confirmed = true; assert.equal(togglePlaybackState(state), "paused"); assert.equal(state.paused, true);
  confirmed = false; assert.equal(togglePlaybackState(state), "not_playing"); assert.equal(state.paused, true);
  confirmed = true; assert.equal(togglePlaybackState(state), "resumed"); assert.equal(state.paused, false);
});
test("Existing game aliases cannot accidentally become YouTube searches", () => {
  for (const [alias, name] of [["connect4", "start_connect4"], ["geo", "start_geoguessr"], ["devinelelogo", "start_guess_logo"],
    ["guessnumber", "start_guess_number"], ["minesweeper", "start_minesweeper"]])
    assert.equal(selected(`Lance ${alias}`)!.name, name);
});
test("YouTube search controls belong to their requester, guild, channel and specific message", () => {
  const actor = { userId: "u", guildId: "g", channelId: "c", messageId: "m" }, binding = { ...actor, expiresAt: 100 };
  assert.equal(searchActorAllowed(binding, actor, 99), true);
  for (const patch of [{ userId: "other" }, { guildId: "other" }, { guildId: null }, { channelId: "other" }, { messageId: "other" }])
    assert.equal(searchActorAllowed(binding, { ...actor, ...patch }, 99), false);
  assert.equal(searchActorAllowed(binding, actor, 100), false);
  assert.equal(searchActorAllowed(undefined, actor, 1), false);
});
test("Completing a missing parameter cannot change its function family or override a refusal", () => {
  assert.equal(completeAiCommand("game", "GeoGuessr", stations).kind, "action");
  assert.equal(completeAiCommand("game", "Stromae", stations).kind, "clarify");
  assert.deepEqual(completeAiCommand("radio", "France Inter", stations), { kind: "action", action: { name: "play_radio", station: "franceinter" } });
  assert.deepEqual(completeAiCommand("youtube_search", "Stromae", stations), { kind: "action", action: { name: "search_youtube", query: "Stromae" } });
  assert.equal(selectAiCommand("Recherche sur YouTube", stations).kind, "clarify");
  for (const text of ["Non", "Pas de musique", "Aucun", "Annule", '"Mets NRJ"', "Stop"])
    assert.equal(completeAiCommand("youtube", text, stations).kind, "none", text);
});
test("A delayed denial or unavailable access check closes the audio stream before playback", async () => {
  for (const authorize of [async () => false, async () => { throw Error("permissions unavailable"); }]) {
    let destroyed = false;
    assert.equal(await authorizeAudioStream({ destroy: () => { destroyed = true; } }, authorize), false);
    assert.equal(destroyed, true);
  }
  let destroyed = false;
  assert.equal(await authorizeAudioStream({ destroy: () => { destroyed = true; } }, async () => true), true);
  assert.equal(destroyed, false);
});
