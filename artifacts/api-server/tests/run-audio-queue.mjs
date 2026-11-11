import { build } from "esbuild";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const imports = `import { fixture } from ${JSON.stringify(path.join(here, "fixtures/audio-queue.ts"))};`;
const stubs = {
  logger: "export const logger = { warn(){}, error(){}, info(){} };",
  db: "export const customStationsCol = null;",
  "effective-language": "export const getEffectiveLanguage = () => 'fr';",
  "artist-cache": "export const isKnownArtist = () => false, saveArtist = async () => {};",
  "voice-picker-channels": "export const getVoicePickerChannels = () => [];",
  ytdlp: "export const ytdlpInfo = () => fixture.info(), ytdlpStream = () => fixture.stream(), ytdlpStreamWithFx = () => fixture.stream(), ytdlpSearch = async () => [], cleanYouTubeTitle = title => title;",
  "play-dl": "export const video_info = async () => ({video_details: {title:'Queued song',durationInSec:90,thumbnails:[]}});",
  http: "export const get = () => { throw Error('Real HTTP forbidden'); };",
  https: "export const get = () => { throw Error('Real HTTPS forbidden'); };",
  "@discordjs/voice": `
    export const AudioPlayerStatus={Playing:'playing',Idle:'idle',Paused:'paused',AutoPaused:'autopaused'};
    export const VoiceConnectionStatus={Disconnected:'disconnected',Ready:'ready'}, StreamType={Arbitrary:'arbitrary',Raw:'raw'}, NoSubscriberBehavior={Pause:'pause'};
    export const getVoiceConnection=()=>({destroy(){},subscribe(){},on(){},state:{status:'ready'}});
    export const joinVoiceChannel=()=>{throw Error('Real voice forbidden');}, createAudioPlayer=()=>{throw Error('Unexpected player');};
    export const createAudioResource=stream=>({playStream:stream,volume:{setVolume(){}}});`,
  "discord.js": `
    class Builder {constructor(){this.data={};const proxy=new Proxy(this,{get:(t,k)=>k==='data'?t.data:k==='toJSON'?()=>t.data:(...args)=>{t.data[k]=args;return proxy;}});return proxy;}}
    export {Builder as EmbedBuilder,Builder as ActionRowBuilder,Builder as ButtonBuilder};
    export const ButtonStyle={Primary:1,Secondary:2,Success:3,Danger:4,Link:5},ChannelType={GuildVoice:2};`,
};
const output = await mkdtemp(path.join(tmpdir(), "audio-queue-"));
try {
  const outfile = path.join(output, "test.mjs");
  await build({
    entryPoints: [path.join(here, "audio-queue-radio.test.ts")], bundle: true, platform: "node", format: "esm", outfile,
    plugins: [{ name: "offline-audio-boundaries", setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        const key = ["@discordjs/voice", "discord.js", "play-dl", "http", "https"].includes(args.path)
          ? args.path : path.basename(args.path).replace(/\.js$/, "");
        if (Object.hasOwn(stubs, key)) return { path: key, namespace: "offline" };
      });
      build.onLoad({ filter: /.*/, namespace: "offline" }, args => ({ contents: imports + stubs[args.path], loader: "js", resolveDir: here }));
      build.onLoad({ filter: /[/\\]discord[/\\]radio\.ts$/ }, async args => ({
        contents: `const offlineTimer = () => ({});\n` + (await readFile(args.path, "utf8"))
          .replace(/\bset(?:Interval|Timeout)\(/g, "offlineTimer(") + "\nexport { playNextFromQueue };",
        loader: "ts", resolveDir: path.dirname(args.path),
      }));
    } }],
  });
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit", timeout: 15000 });
  process.exitCode = result.status ?? 1;
} finally { await rm(output, { recursive: true, force: true }); }
