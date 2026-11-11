import test from "node:test";
import assert from "node:assert/strict";
// The offline build exports this private function for exercising the real queue path.
import { radioStates, playYoutube, playNextFromQueue } from "../src/discord/radio.js";
import { enqueueAuthorizedTrack } from "../src/discord/audio-queue-access.js";
import { fixture, state, message } from "./fixtures/audio-queue.js";
const tick = () => new Promise<void>(r => setImmediate(r));
test("Real YouTube enqueue retains authority until its queued stream starts", async () => {
  for (const revoke of ["voice", "consent"]) {
    fixture.reset(); const guild = "queue-" + revoke, current = state(guild); radioStates.set(guild, current as any);
    let voice = "voice", consent = true;
    await playYoutube(message(guild) as any, "https://www.youtube.com/watch?v=" + revoke, undefined, async () => consent && voice === "voice");
    assert.equal(current.queue.length, 1);
    if (revoke === "voice") voice = "elsewhere"; else consent = false;
    await playNextFromQueue(guild);
    assert.equal(current.player.plays, 0); assert.equal(current.queue.length, 0);
    assert.ok(fixture.streams.length > 0); assert.ok(fixture.streams.every(s => s.destroyed));
    assert.equal(fixture.sent.some(p => p.embeds), false);
    radioStates.delete(guild);
  }
});
test("Real queue playback rechecks authority after slow metadata and releases the opened stream", async () => {
  fixture.reset(); const guild = "metadata", current = state(guild); radioStates.set(guild, current as any);
  let allowed = true;
  enqueueAuthorizedTrack(current.queue, "https://youtube.com/watch?v=metadata", async () => allowed);
  fixture.duringInfo = () => { allowed = false; };
  await playNextFromQueue(guild);
  assert.equal(current.player.plays, 0); assert.ok(fixture.streams.every(s => s.destroyed));
  assert.equal(fixture.sent.some(p => p.embeds), false); radioStates.delete(guild);
});
test("A rejected entry is skipped and the next valid entry is announced only after Playing", async () => {
  fixture.reset(); const guild = "next", current = state(guild); radioStates.set(guild, current as any);
  current.player.nextStatus = "buffering";
  enqueueAuthorizedTrack(current.queue, "https://youtube.com/watch?v=first", async () => false);
  enqueueAuthorizedTrack(current.queue, "https://youtube.com/watch?v=next", async () => true);
  await playNextFromQueue(guild);
  assert.equal(current.player.plays, 1); assert.equal(current.queue.length, 0);
  assert.equal(fixture.sent.some(p => p.embeds), false);
  current.player.state.status = "playing"; current.player.emit("playing"); await tick();
  assert.equal(fixture.sent.filter(p => p.embeds).length, 1); radioStates.delete(guild);
});
test("A superseded queued request cannot overwrite or clear a newer playback session", async () => {
  fixture.reset(); const guild = "superseded", current = state(guild) as any; radioStates.set(guild, current);
  enqueueAuthorizedTrack(current.queue, "https://youtube.com/watch?v=old-request", async () => true);
  const replacement = { playStream: fixture.stream() };
  fixture.duringInfo = () => { current.activeResource = replacement; current.youtubeTitle = "New request"; current.youtubeUrl = "new"; };
  await playNextFromQueue(guild);
  assert.equal(current.player.plays, 0); assert.equal(current.youtubeTitle, "New request");
  assert.equal(current.activeResource, replacement); assert.equal(replacement.playStream.destroyed, false);
  assert.equal(fixture.sent.some(p => p.embeds), false); radioStates.delete(guild);
});
