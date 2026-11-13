import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const stubs = {
  "games.js": `
    export const isGeoActive=()=>false, isLogoActive=()=>false;
    export const playConnect4=async()=>{}, playGeoguessr=async()=>{}, playGuessLogo=async()=>{};
    export const playGuessNumber=async()=>{}, playMinesweeper=()=>"", playTrivia=async()=>{};
    export const stopGeoguessr=()=>{}, stopGuessLogo=()=>{};`,
  "ai-consent.js": `export const requireConsent=async()=>true;`,
  "blindtest.js": `export const startBlindtest=async()=>{};`,
  "milliongame.js": `export const startMillionGame=async()=>{}, showMillionLeaderboard=async()=>{};`,
  "tierlist.js": `export const startTierlist=async()=>{};`,
  "module-fallback.js": `export const moduleFallbackMessage=()=>"Unavailable";`,
  "module-technician.js": `export const reportModuleFailure=async()=>{};`,
};

const outfile = path.join(here, "../node_modules/.cache/hangman.test.mjs");
await build({
  entryPoints: [path.join(here, "hangman.test.ts")],
  outfile,
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  plugins: [{
    name: "offline-game-dependencies",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        const name = path.basename(args.path);
        if (Object.hasOwn(stubs, name)) return { path: name, namespace: "hangman-test" };
      });
      build.onLoad({ filter: /.*/, namespace: "hangman-test" }, (args) => ({
        contents: stubs[args.path],
        loader: "js",
        resolveDir: here,
      }));
    },
  }],
});
const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
