import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.stringify(path.join(here, "fixtures/voice-settings.ts"));
const stubs = {
  "db.js": `
    export const getGuildDoc=async id=>f.guilds[id]??null;
    export const setGuildTtsVoice=async(id,voice)=>{if(f.fail)throw Error("DB unavailable");f.writes++;f.guilds[id]={ttsVoiceId:voice};};
    export const getAiPersona=async id=>f.personas[id]??null;
    export const saveAiPersona=async p=>{if(f.fail)throw Error("DB unavailable");f.writes++;f.personas[p.id]={...p};};
  `,
  "effective-language.js": `export const getEffectiveLanguage=()=>"fr";`,
  "prefix-store.js": `export const getPrefix=async()=>"!";`,
  "logger.js": `export const logger={info(){},warn(){},error(){}};`,
};
const outfile = path.join(here, "../node_modules/.cache/voice-settings.test.mjs");
await build({
  entryPoints: [path.join(here, "voice-settings.test.ts")], outfile,
  bundle: true, packages: "external", platform: "node", format: "esm",
  plugins: [{ name: "voice-io", setup(build) {
    build.onResolve({ filter: /.*/ }, args => {
      const name = args.path.split("/").pop();
      if (Object.hasOwn(stubs, name)) return { path: name, namespace: "voice-test" };
    });
    build.onLoad({ filter: /.*/, namespace: "voice-test" }, args => ({
      contents: `import {f} from ${fixture};\n${stubs[args.path]}`, loader: "js", resolveDir: here,
    }));
  } }],
});
const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
