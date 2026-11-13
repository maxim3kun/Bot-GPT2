import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const stubs = {
  "discord.js": `
    export class EmbedBuilder {
      data = { fields: [] };
      setColor(value) { this.data.color = value; return this; }
      setTitle(value) { this.data.title = value; return this; }
      setDescription(value) { this.data.description = value; return this; }
      addFields(...values) { this.data.fields.push(...values); return this; }
      setFooter(value) { this.data.footer = value; return this; }
      setThumbnail(value) { this.data.thumbnail = value; return this; }
    }`,
  "suno-client.js": `
    export const generateSong = async () => { throw Error("unexpected live generation"); };
    export const pollSong = async () => { throw Error("unexpected live poll"); };
    export const getCredits = async () => { throw Error("unexpected live credits request"); };`,
  "logger.js": `export const logger = { error() {}, warn() {} };`,
  "module-technician.js": `export const reportModuleFailure = async () => {};`,
};
const outfile = path.join(here, "../node_modules/.cache/music-generation.test.mjs");
await build({
  entryPoints: [path.join(here, "music-generation.test.ts")],
  outfile, bundle: true, packages: "external", platform: "node", format: "esm",
  plugins: [{
    name: "offline-music-generation",
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        const key = args.path === "discord.js" ? args.path : path.basename(args.path);
        if (Object.hasOwn(stubs, key)) return { path: key, namespace: "offline-music" };
      });
      build.onLoad({ filter: /.*/, namespace: "offline-music" }, args => ({
        contents: stubs[args.path], loader: "js",
      }));
    },
  }],
});
const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
