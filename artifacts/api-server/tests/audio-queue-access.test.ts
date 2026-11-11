import test from "node:test";
import assert from "node:assert/strict";
import { enqueueAuthorizedTrack, removeAuthorizedTrack, playAuthorizedQueuedStream, setPlayingTrackAuthorization, playingTrackAuthorization } from "../src/discord/audio-queue-access.js";
function stream() { return { destroyed: false, destroy() { this.destroyed = true; } }; }
test("An AI track waiting in the queue cannot play after its requester revokes consent or leaves voice", async () => {
  for (const revoke of ["consent", "voice"] as const) {
    let consent = true, voice = "original", played = 0, prepared = 0;
    const queue: string[] = [];
    enqueueAuthorizedTrack(queue, "video", async () => consent && voice === "original");
    if (revoke === "consent") consent = false; else voice = "elsewhere";
    const audio = stream();
    const result = await playAuthorizedQueuedStream(removeAuthorizedTrack(queue)!, audio,
      async () => { prepared++; return "metadata"; }, () => { played++; });
    assert.deepEqual(result, { played: false }); assert.equal(audio.destroyed, true);
    assert.equal(prepared, 0); assert.equal(played, 0);
  }
});
test("Revocation during queued metadata loading closes the stream before the player is called", async () => {
  let allowed = true, played = 0; const queue: string[] = [], audio = stream();
  enqueueAuthorizedTrack(queue, "video", async () => allowed);
  const result = await playAuthorizedQueuedStream(removeAuthorizedTrack(queue)!, audio,
    async () => { allowed = false; return "metadata"; }, () => { played++; });
  assert.equal(result.played, false); assert.equal(audio.destroyed, true); assert.equal(played, 0);
});
test("Duplicate video URLs keep each requester's own authorization and a rejected track does not block the next", async () => {
  const queue: string[] = [], played: string[] = [], closed: boolean[] = [];
  enqueueAuthorizedTrack(queue, "same-video", async () => false);
  enqueueAuthorizedTrack(queue, "same-video", async () => true);
  enqueueAuthorizedTrack(queue, "legacy-prefix-video");
  while (queue.length) {
    const entry = removeAuthorizedTrack(queue)!, audio = stream();
    await playAuthorizedQueuedStream(entry, audio, async () => entry.url, (_, title) => { played.push(title); });
    closed.push(audio.destroyed);
  }
  assert.deepEqual(played, ["same-video", "legacy-prefix-video"]); assert.deepEqual(closed, [true, false, false]);
});
test("Front insertion and removal keep authorization attached to the correct queue entry", async () => {
  const queue: string[] = [], a = async () => true, b = async () => false;
  enqueueAuthorizedTrack(queue, "a", a); enqueueAuthorizedTrack(queue, "b", b);
  enqueueAuthorizedTrack(queue, "front", undefined, true);
  assert.equal(removeAuthorizedTrack(queue, 1)!.authorize, a);
  assert.equal(removeAuthorizedTrack(queue)!.authorize, undefined);
  assert.equal(removeAuthorizedTrack(queue)!.authorize, b);
  assert.equal(removeAuthorizedTrack(queue), undefined);
});
test("Loop and rewind can preserve the authority of the currently playing AI track", async () => {
  const state = {}, queue: string[] = []; let allowed = true;
  setPlayingTrackAuthorization(state, async () => allowed);
  enqueueAuthorizedTrack(queue, "repeat", playingTrackAuthorization(state), true); allowed = false;
  const audio = stream();
  assert.equal((await playAuthorizedQueuedStream(removeAuthorizedTrack(queue)!, audio, async () => "title", () => assert.fail())).played, false);
  assert.equal(audio.destroyed, true); setPlayingTrackAuthorization(state); assert.equal(playingTrackAuthorization(state), undefined);
});
test("Unavailable queue authorization fails closed, and failed metadata preparation releases its stream", async () => {
  const audio = stream();
  assert.equal((await playAuthorizedQueuedStream({ url: "video", authorize: async () => { throw Error("database unavailable"); } },
    audio, async () => assert.fail(), () => assert.fail())).played, false);
  assert.equal(audio.destroyed, true);
  const second = stream();
  await assert.rejects(playAuthorizedQueuedStream({ url: "video" }, second, async () => { throw Error("provider unavailable"); }, () => assert.fail()), /provider/);
  assert.equal(second.destroyed, true);
});
