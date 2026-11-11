import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.stringify(path.join(here, "fixtures/ai-commands.ts"));
const imports = `import { fixture, features, globals, handler, Builder, permissions } from ${fixtures};
import { togglePlaybackState } from "../src/discord/audio-playback-state.ts";`;
const stubs = {
  "discord.js": `
    export { Builder as ActionRowBuilder, Builder as ButtonBuilder, permissions as PermissionFlagsBits };
    export const ButtonStyle = { Primary: 1, Secondary: 2 }, ComponentType = { Button: 2 };
    export const ChannelType = { GuildStageVoice: "GuildStageVoice" };`,
  "@discordjs/voice": `export const AudioPlayerStatus = { Playing: "playing", Paused: "paused", AutoPaused: "autopaused" };`,
  "feature-flags.js": `export const isFeatureEnabled = name => fixture.flags[name] !== false;`,
  "features-store.js": `
    export const getGlobalFeatures = globals;
    export const getGuildFeatures = async (_, options) => {
      if (fixture.featureReadFails) {
        if (!options?.failClosed) throw Error("test expected a fail-closed read");
        throw Error("database unavailable");
      }
      return features();
    };`,
  "bot-stats.js": `export const incrementGroqCalls = () => {};`,
  "logger.js": `export const logger = { error() {}, warn() {} };`,
  "ai-consent.js": `
    export const getConsent = async () => fixture.consent;
    export const requireConsent = async message => { await message.reply("consent required"); return false; };`,
  "command-suggest.js": `
    export const checkCommandBlock = () => ({ blocked: fixture.blocked });
    export const sendBlockedMessage = async message => { await message.reply("blocked"); };`,
  "prefix-store.js": `export const getPrefix = () => "?";`,
  "help-builders.js": `export const sendHelpPaginator = message => handler("help", message);`,
  "pokemon.js": `export const handlePokemon = (query, language, reply) => {
    fixture.handlers.push("pokemon:" + query + ":" + language);
    return reply("real PokéAPI result");
  };`,
  "message-game-commands.js": `
    export const handleGameMessageCommand = (message, command, args, openai) =>
      command === "trivia" && !openai ? message.reply("AI features are not configured") : handler(command + ":" + args.join(","), message);`,
  "module-technician.js": `export const handleTechnicianCommand = message => handler("diagnostic", message);`,
  "module-fallback.js": `
    export const runModuleWithFallback = async (_, module, operation, fallback) => {
      try { return await operation(); } catch { return fallback(); }
    };
    export const moduleFallbackMessage = () => "service indisponible";`,
  "radio.js": `
    export const RADIO_STATIONS = { nrj: { name: "NRJ" } };
    export const customStations = fixture.custom, radioStates = fixture.audio;
    export const playRadio = (message, station) => handler("radio:" + station, message);
    export const searchAndQueue = (message, query, authorize, autoplay = true) => {
      fixture.youtubeRequests.push({ authorize, autoplay }); return handler("youtube:" + query, message);
    };
    export const skipYoutube = message => handler("skip", message);
    export const pauseToggle = guild => { fixture.handlers.push("toggle"); return togglePlaybackState(radioStates.get(guild)); };
    export const stopForGuild = guild => { fixture.handlers.push("stop"); return radioStates.delete(guild); };
    export const getQueueEmbed = guild => radioStates.get(guild)?.queue.length ? new Builder() : null;
    export const nowPlaying = guild => radioStates.has(guild) ? new Builder() : null;`,
  "transport-menu.js": `export const handleTransportSearch = async (message, request, language, prefix, service, timeout, authorize) => {
    fixture.searches.push({ request, language, prefix, authorize }); return handler("transport", message);
  };`,
};
const output = await mkdtemp(path.join(tmpdir(), "ai-command-dispatch-"));
try {
  const outfile = path.join(output, "test.mjs");
  await build({
    entryPoints: [path.join(here, "ai-command-dispatch.test.ts")],
    bundle: true, platform: "node", format: "esm", outfile,
    plugins: [{
      name: "offline-io-boundaries",
      setup(build) {
        build.onResolve({ filter: /.*/ }, (args) => {
          const key = ["discord.js", "@discordjs/voice"].includes(args.path) ? args.path : path.basename(args.path);
          if (Object.hasOwn(stubs, key)) return { path: key, namespace: "offline" };
        });
        build.onLoad({ filter: /.*/, namespace: "offline" }, (args) => ({
          contents: imports + stubs[args.path], loader: "js", resolveDir: here,
        }));
      },
    }],
  });
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(output, { recursive: true, force: true });
}
