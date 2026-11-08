import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.stringify(path.join(here, "fixtures/quest-language.ts"));
const stubs = {
  "db.js": `export const isDbReady=()=>true; export const patchUserData=async()=>{};
    export const getAllUserDocs=async()=>[{data:{discordId:"user",questProfile:f.profile}}];`,
  "effective-language.js": `export const getEffectiveLanguage=(guild)=>f.personal??(guild==="fr-guild"?"fr":"en");`,
  "logger.js": `export const logger={info(){},warn(){},error(){}};`,
};
const outfile = path.join(here, "../node_modules/.cache/quests-language.test.mjs");
await build({
  entryPoints: [path.join(here, "quests-language.test.ts")], outfile,
  bundle: true, packages: "external", platform: "node", format: "esm",
  plugins: [{ name: "quest-io", setup(build) {
    build.onResolve({ filter: /.*/ }, args => {
      const name = args.path.split("/").pop();
      if (Object.hasOwn(stubs, name)) return { path: name, namespace: "test" };
    });
    build.onLoad({ filter: /.*/, namespace: "test" }, args => ({
      contents: `import {questFixture as f} from ${fixture};\n${stubs[args.path]}`, loader: "js", resolveDir: here,
    }));
  } }],
});
const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
