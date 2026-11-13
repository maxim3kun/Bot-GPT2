import assert from "node:assert/strict";
import test from "node:test";
import { shazam, type ShazamDependencies } from "../src/discord/shazam.js";
import { fixture } from "./fixtures/shazam.js";

const previousApiKey = process.env["AUDD_API_KEY"];

function makeMessage(guildId: string | null = "guild") {
  const replies: any[] = [];
  const edits: any[] = [];
  const waitMessage = { edit: async (payload: any) => { edits.push(payload); } };
  const message = {
    guildId,
    author: { id: "member" },
    reply: async (payload: any) => { replies.push(payload); return waitMessage; },
  } as any;
  return { message, replies, edits };
}

function fakeDependencies(overrides: Partial<ShazamDependencies> = {}) {
  const calls = { capture: [] as string[], identify: 0, youtube: [] as string[] };
  const dependencies: ShazamDependencies = {
    captureAudioBytes: async url => { calls.capture.push(url); return Buffer.from("sample"); },
    getYoutubeDirectUrl: async url => { calls.youtube.push(url); return "https://audio.example/stream"; },
    identify: async () => { calls.identify += 1; return null; },
    ...overrides,
  };
  return { calls, dependencies };
}

test.beforeEach(() => {
  fixture.radioStates.clear();
  fixture.featureEnabled = true;
  fixture.guildFeatureEnabled = true;
  fixture.featureReadFails = false;
  process.env["AUDD_API_KEY"] = "test-only";
});

test.after(() => {
  if (previousApiKey === undefined) delete process.env["AUDD_API_KEY"];
  else process.env["AUDD_API_KEY"] = previousApiKey;
});

test("Shazam never captures audio without configuration, enabled server access, or a playing source", async () => {
  const missingKey = makeMessage();
  delete process.env["AUDD_API_KEY"];
  const noKey = fakeDependencies();
  await shazam(missingKey.message, noKey.dependencies);
  assert.match(missingKey.replies[0], /pas configuré/i);
  assert.equal(noKey.calls.capture.length, 0);

  process.env["AUDD_API_KEY"] = "test-only";
  fixture.featureEnabled = false;
  const disabled = makeMessage();
  const disabledDeps = fakeDependencies();
  await shazam(disabled.message, disabledDeps.dependencies);
  assert.match(disabled.replies[0], /désactivé/i);
  assert.equal(disabledDeps.calls.capture.length, 0);

  fixture.featureEnabled = true;
  fixture.featureReadFails = true;
  const unreadableSettings = makeMessage();
  const unreadableDeps = fakeDependencies();
  await shazam(unreadableSettings.message, unreadableDeps.dependencies);
  assert.match(unreadableSettings.replies[0], /désactivé/i);
  assert.equal(unreadableDeps.calls.capture.length, 0);
  fixture.featureReadFails = false;

  const noTrack = makeMessage();
  const noTrackDeps = fakeDependencies();
  await shazam(noTrack.message, noTrackDeps.dependencies);
  assert.match(noTrack.replies[0], /ne diffuse rien/i);
  assert.equal(noTrackDeps.calls.capture.length, 0);
});

test("Shazam identifies only a bounded excerpt from the current radio and formats the result", async () => {
  fixture.radioStates.set("guild", { stationKey: "station", youtubeUrl: null, youtubeTitle: null });
  const x = makeMessage();
  const deps = fakeDependencies({
    captureAudioBytes: async url => { deps.calls.capture.push(url); return Buffer.from("authorized excerpt"); },
    identify: async (_key, bytes) => {
      deps.calls.identify += 1;
      assert.equal(bytes.toString(), "authorized excerpt");
      return {
        title: "Song", artist: "Artist", album: "Album", release_date: "2024-01-01",
        spotify: { external_urls: { spotify: "https://open.spotify.com/track/example" } },
      };
    },
  });
  await shazam(x.message, deps.dependencies);
  assert.deepEqual(deps.calls.capture, ["https://radio.example/stream"]);
  assert.equal(deps.calls.identify, 1);
  assert.match(x.replies[0], /envoyé à AudD/i);
  assert.equal(x.edits[0].embeds[0].data.title, "🎵 Morceau identifié");
  assert.deepEqual(x.edits[0].embeds[0].data.fields.slice(0, 2).map((field: any) => field.value), ["Song", "Artist"]);
});

test("Shazam reports no match and provider errors without leaking provider details", async () => {
  fixture.radioStates.set("guild", { stationKey: "station", youtubeUrl: null, youtubeTitle: null });
  const noMatch = makeMessage();
  await shazam(noMatch.message, fakeDependencies().dependencies);
  assert.match(noMatch.edits[0], /pas identifié/i);

  const providerError = makeMessage();
  const failed = fakeDependencies({ identify: async () => { throw new Error("private provider response"); } });
  await shazam(providerError.message, failed.dependencies);
  assert.match(providerError.edits[0], /service d’identification/i);
  assert.doesNotMatch(providerError.edits[0], /private provider response/);
});

test("Shazam handles YouTube stream failure before capture and refuses oversized audio", async () => {
  fixture.radioStates.set("guild", { stationKey: null, youtubeUrl: "https://youtube.example/watch", youtubeTitle: "Video" });
  const failedUrl = makeMessage();
  const urlFailure = fakeDependencies({ getYoutubeDirectUrl: async () => { throw new Error("unavailable"); } });
  await shazam(failedUrl.message, urlFailure.dependencies);
  assert.equal(urlFailure.calls.capture.length, 0);
  assert.match(failedUrl.edits[0], /récupérer l’extrait/i);

  const oversized = makeMessage();
  const tooLarge = fakeDependencies({
    captureAudioBytes: async () => Buffer.alloc(400 * 1024 + 1),
  });
  await shazam(oversized.message, tooLarge.dependencies);
  assert.equal(tooLarge.calls.identify, 0);
  assert.match(oversized.edits.at(-1), /service d’identification/i);
});
