import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.stringify(path.join(here, "fixtures/voice-chat.ts"));
const imports = `import { fixture } from ${fixture};`;
const stubs = {
  "@discordjs/voice": `
    import { EventEmitter } from "node:events";
    export const AudioPlayerStatus = { Playing: "playing", Paused: "paused", Idle: "idle" };
    export const VoiceConnectionStatus = { Ready: "ready", Disconnected: "disconnected" };
    export const StreamType = { Arbitrary: "arbitrary" };
    export const NoSubscriberBehavior = { Pause: "pause" };
    export const EndBehaviorType = { AfterSilence: "silence" };
    export const joinVoiceChannel = () => {
      const speaking = new EventEmitter();
      const connection = new EventEmitter();
      connection.joinConfig = { channelId: "voice" };
      connection.receiver = {
        speaking,
        subscribe() {
          fixture.subscriptions += 1;
          return {
            destroy() { fixture.destroyedStreams += 1; },
            pipe(decoder) { return decoder; },
          };
        },
      };
      connection.subscribe = () => {};
      connection.destroy = () => {};
      fixture.connection = connection;
      return connection;
    };
    export const createAudioPlayer = () => ({
      state: { status: "idle" },
      stop() {},
      play() {},
      on() { return this; }, once() { return this; }, off() { return this; },
    });
    export const createAudioResource = value => value;
    export const getVoiceConnection = guildId => fixture.connection;`,
  "discord.js": `
    export const PermissionFlagsBits = { ViewChannel: 1, Connect: 2, Speak: 4 };
    export class EmbedBuilder {
      setColor() { return this; } setTitle() { return this; } setDescription() { return this; }
      addFields() { return this; } setFooter() { return this; } setThumbnail() { return this; }
    }`,
  "radio.js": `
    export const replyNotInVoice = async message => message.reply("not in voice");
    export const setVoiceCleanupHook = () => {};
    export const stopForGuild = () => {};`,
  "prism-media": `
    import { EventEmitter } from "node:events";
    class Decoder extends EventEmitter {
      constructor(options) { super(); fixture.decoder = this; }
      pipe() { return this; }
    }
    export default { opus: { Decoder } };`,
  "logger.js": `export const logger = { info() {}, warn() {}, error() {}, debug() {} };`,
  "piper-tts.js": `export const piper = { synthesize: async () => Buffer.from("audio") }; export const DEFAULT_VOICE = "siwis"; export const isVoiceId = () => true;`,
  "voice-settings.js": `export const getBotVoice = async () => "siwis";`,
  "module-technician.js": `export const recordModuleSuccess = () => {}; export const recordModuleFailureState = () => {};`,
  "ai-consent.js": `
    export const getConsent = async () => fixture.consent;
    export const requireConsent = async message => {
      if (fixture.requireConsentResult) return true;
      if (fixture.consent === "unknown") await message.reply("consent prompt");
      return false;
    };`,
  "effective-language.js": `export const getEffectiveLanguage = () => "fr";`,
  "feature-flags.js": `export const isFeatureEnabled = name => name === "ai" ? fixture.globalAi : fixture.globalVoice;`,
  "features-store.js": `
    export const getGuildFeatures = async () => {
      if (fixture.featureReadFails) throw Error("database unavailable");
      return [{ name: "ai_chat", enabled: fixture.guildAi }];
    };`,
  "prefix-store.js": `export const getPrefix = () => "!";`,
  "command-suggest.js": `
    export const checkCommandBlock = () => ({ blocked: fixture.blocked });
    export const sendBlockedMessage = async message => message.reply("blocked");`,
};
stubs["logger"] = stubs["logger.js"];
const outfile = path.join(here, "../node_modules/.cache/voice-chat.test.mjs");
await build({
  entryPoints: [path.join(here, "voice-chat.test.ts")],
  outfile, bundle: true, packages: "external", platform: "node", format: "esm",
  plugins: [{
    name: "offline-voice-chat",
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        const key = ["discord.js", "@discordjs/voice", "prism-media"].includes(args.path) ? args.path : path.basename(args.path);
        if (Object.hasOwn(stubs, key)) return { path: key, namespace: "offline-voice" };
      });
      build.onLoad({ filter: /.*/, namespace: "offline-voice" }, args => ({
        contents: imports + stubs[args.path], loader: "js", resolveDir: here,
      }));
    },
  }],
});
const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
