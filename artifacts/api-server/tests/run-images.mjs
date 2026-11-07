import { build } from "esbuild";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.stringify(path.join(here, "fixtures/images.ts"));
const stubs = {
  "module-technician.js": `
    export const recordModuleFailureState = (...args) => f.health.push(["failure", ...args]);
    export const recordModuleSuccess = (...args) => f.health.push(["success", ...args]);`,
  "features-store.js": `
    export const getGlobalFeatures = () => [{name:"image_generation",enabled:f.enabled}];
    export const getGuildFeatures = async (_, options) => {
      if (!options?.failClosed) throw Error("Expected strict settings");
      if (f.settingsFail) throw Error("Unavailable");
      return [{name:"image_generation",enabled:f.guildEnabled}];
    };`,
  "ai-consent.js": `export const requireConsent = async () => f.consent;`,
  "command-suggest.js": `
    export const checkCommandBlock = () => ({blocked:f.blocked});
    export const sendBlockedMessage = async m => m.reply("blocked");`,
  "prefix-store.js": `export const getPrefix = () => "!";`,
  "image-quota.js": `
    export const reserveGeneratedImage = async () => {
      f.reservations++; return {status:f.quota,dayKey:"test-day"};
    };
    export const releaseGeneratedImage = async () => {f.releases++;};
    export const imageQuotaNotice = () => "quota unavailable";`,
  "logger.js": `export const logger = {warn:()=>{},error:()=>{},info:()=>{}};`,
};
// Keep external packages resolvable, but never commit generated test bundles.
await mkdir(path.join(here, "../node_modules/.cache"), { recursive: true });
const output = await mkdtemp(path.join(here, "../node_modules/.cache/image-tests-"));
try {
  const outfile = path.join(output, "tests.mjs");
  await build({
    entryPoints: [path.join(here, "images.test.ts")],
    outfile, bundle: true, packages: "external", platform: "node", format: "esm",
    plugins: [{
      name: "offline-images",
      setup(build) {
        build.onResolve({ filter: /.*/ }, args => {
          const name = args.path.split("/").pop();
          if (Object.hasOwn(stubs, name)) return { path: name, namespace: "offline" };
        });
        build.onLoad({ filter: /.*/, namespace: "offline" }, args => ({
          contents: `import {imageFixture as f} from ${fixtures};\n${stubs[args.path]}`,
          loader: "js", resolveDir: here,
        }));
      },
    }],
  });
  const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  await rm(output, { recursive: true, force: true });
}
