import assert from "node:assert/strict";
import test from "node:test";
import { generateMusicTrack, handleSunoBalanceCommand, type MusicGenerationRuntime } from "../src/discord/music-generation-commands.js";

const previousKey = process.env["SUNO_API_KEY"];

function messageFixture() {
  const replies: any[] = [];
  const edits: any[] = [];
  const message = {
    reply: async (payload: any) => {
      replies.push(payload);
      return { edit: async (next: any) => { edits.push(next); } };
    },
  } as any;
  return { message, replies, edits };
}

function runtime(overrides: Partial<MusicGenerationRuntime> = {}) {
  const calls = { generate: 0, poll: 0, sleep: 0 };
  const value: MusicGenerationRuntime = {
    generateSong: async () => { calls.generate += 1; return "task-id"; },
    pollSong: async () => {
      calls.poll += 1;
      return { taskId: "task-id", status: "PENDING", clips: [], done: false };
    },
    getCredits: async () => 5,
    sleep: async () => { calls.sleep += 1; },
    pollIntervalMs: 1,
    maxPollAttempts: 3,
    ...overrides,
  };
  return { calls, value };
}

test.beforeEach(() => { process.env["SUNO_API_KEY"] = "test-only"; });

test.after(() => {
  if (previousKey === undefined) delete process.env["SUNO_API_KEY"];
  else process.env["SUNO_API_KEY"] = previousKey;
});

test("Song generation never calls the provider without a configured key", async () => {
  delete process.env["SUNO_API_KEY"];
  const x = messageFixture();
  const r = runtime();
  assert.equal(await generateMusicTrack(x.message, "test prompt", "music", r.value), false);
  assert.equal(r.calls.generate, 0);
  assert.match(x.replies[0], /not configured/i);
});

test("Song generation recovers from a temporary poll error and reports the completed track", async () => {
  let poll = 0;
  const x = messageFixture();
  const r = runtime({
    pollSong: async () => {
      poll += 1;
      if (poll === 1) throw new Error("temporary provider outage");
      return {
        taskId: "task-id", status: "SUCCESS", done: true,
        clips: [{ id: "clip", status: "SUCCESS", title: "Track", audio_url: "https://audio.example/track", prompt: "test prompt" }],
      };
    },
  });
  assert.equal(await generateMusicTrack(x.message, "test prompt", "music", r.value), true);
  assert.equal(r.calls.generate, 1);
  assert.equal(poll, 2);
  assert.equal(x.edits.at(-1).embeds[0].data.title, "🎶 Track");
});

test("Song generation reports rejected starts, provider failures, and timeouts as failures", async () => {
  const start = messageFixture();
  const rejected = runtime({ generateSong: async () => { throw new Error("private provider detail"); } });
  assert.equal(await generateMusicTrack(start.message, "test prompt", "music", rejected.value), false);
  assert.match(start.edits.at(-1).embeds[0].data.description, /could not start generation/i);

  const failed = messageFixture();
  const providerFailure = runtime({
    pollSong: async () => ({ taskId: "task-id", status: "FAILED", done: true, clips: [] }),
  });
  assert.equal(await generateMusicTrack(failed.message, "test prompt", "music", providerFailure.value), false);
  assert.match(failed.edits.at(-1).embeds[0].data.title, /Generation Failed/);

  const timedOut = messageFixture();
  const pending = runtime({ maxPollAttempts: 2 });
  assert.equal(await generateMusicTrack(timedOut.message, "test prompt", "music", pending.value), false);
  assert.match(timedOut.edits.at(-1).embeds[0].data.title, /timed out/i);
});

test("Suno balance handles missing configuration and provider errors without claiming success", async () => {
  const missing = messageFixture();
  delete process.env["SUNO_API_KEY"];
  let calls = 0;
  assert.equal(await handleSunoBalanceCommand(missing.message, async () => { calls += 1; return 10; }), false);
  assert.equal(calls, 0);
  assert.match(missing.replies[0], /not configured/i);

  process.env["SUNO_API_KEY"] = "test-only";
  const failed = messageFixture();
  assert.equal(await handleSunoBalanceCommand(failed.message, async () => { throw new Error("provider unavailable"); }), false);
  assert.match(failed.replies[0], /Could not fetch Suno credits/i);

  const success = messageFixture();
  assert.equal(await handleSunoBalanceCommand(success.message, async () => 12), true);
  assert.equal(success.replies[0].embeds[0].data.fields[0].value, "12");
});
