import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.stringify(path.join(here, "fixtures/quota.ts"));
const outfile = path.join(here, "../node_modules/.cache/bot-improvements.test.mjs");
await build({
  entryPoints: [path.join(here, "bot-improvements.test.ts")],
  outfile, bundle: true, packages: "external", platform: "node", format: "esm",
  plugins: [{
    name: "quota-storage",
    setup(build) {
      build.onResolve({ filter: /\/lib\/db\.js$/ }, () => ({ path: "db", namespace: "test" }));
      build.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        loader: "js", resolveDir: here, contents: `
          import {counts,reservations} from ${fixture};
          export const reserveDailyImageQuota = async (key,limit) => {
            reservations.push({key,limit});
            if ((counts.get(key)||0)>=limit) return "limit_reached";
            counts.set(key,(counts.get(key)||0)+1); return "reserved";
          };
          export const releaseDailyImageQuota = async key => counts.set(key,Math.max(0,(counts.get(key)||0)-1));
        `,
      }));
    },
  }],
});
const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
