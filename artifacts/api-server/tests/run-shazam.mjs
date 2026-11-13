import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.stringify(path.join(here, "fixtures/shazam.ts"));
const imports = `import { fixture } from ${fixture};`;
const stubs = {
  "discord.js": `
    export class EmbedBuilder {
      data = { fields: [] };
      setColor(value) { this.data.color = value; return this; }
      setTitle(value) { this.data.title = value; return this; }
      addFields(...values) { this.data.fields.push(...values); return this; }
      setFooter(value) { this.data.footer = value; return this; }
      setThumbnail(value) { this.data.thumbnail = value; return this; }
    }`,
  "radio.js": `
    export const radioStates = fixture.radioStates;
    export const RADIO_STATIONS = { station: { name: "Radio test", url: "https://radio.example/stream" } };`,
  "logger.js": `export const logger = { debug() {}, error() {} };`,
  "effective-language.js": `export const getEffectiveLanguage = () => "fr";`,
  "feature-flags.js": `export const isFeatureEnabled = () => fixture.featureEnabled;`,
  "features-store.js": `
    export const getGuildFeatures = async () => {
      if (fixture.featureReadFails) throw Error("db unavailable");
      return [{ name: "shazam", enabled: fixture.guildFeatureEnabled }, { name: "music", enabled: true }];
    };`,
};
stubs["radio"] = stubs["radio.js"];
stubs["logger"] = stubs["logger.js"];
const outfile = path.join(here, "../node_modules/.cache/shazam.test.mjs");
await build({
  entryPoints: [path.join(here, "shazam.test.ts")],
  outfile, bundle: true, packages: "external", platform: "node", format: "esm",
  plugins: [{
    name: "offline-shazam",
    setup(build) {
      build.onResolve({ filter: /.*/ }, args => {
        const key = args.path === "discord.js" ? args.path : path.basename(args.path);
        if (Object.hasOwn(stubs, key)) return { path: key, namespace: "offline-shazam" };
      });
      build.onLoad({ filter: /.*/, namespace: "offline-shazam" }, args => ({
        contents: imports + stubs[args.path], loader: "js", resolveDir: here,
      }));
    },
  }],
});
const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
