import assert from "node:assert/strict";
import {
  AnonymousLiveRateLimiter,
  AnonymousLiveSessionStore,
  isPublicLiveSessionId,
} from "../src/discord/public-live-sessions.js";

const sessions = new AnonymousLiveSessionStore(1_000, 2, 4);
const id = "b6f89a87-370e-4fbc-9e28-4e6e10c1c19f";

assert.equal(isPublicLiveSessionId(id), true);
assert.equal(isPublicLiveSessionId("not-a-session"), false);
assert.equal(isPublicLiveSessionId("b6f89a87-370e-1fbc-9e28-4e6e10c1c19f"), false);

assert.deepEqual(sessions.getMessages(id, 0), []);
sessions.appendTurn(id, "question one", "answer one", 0);
sessions.appendTurn(id, "question two", "answer two", 100);
sessions.appendTurn(id, "question three", "answer three", 200);
assert.deepEqual(
  sessions.getMessages(id, 250).map((message) => message.content),
  ["question two", "answer two", "question three", "answer three"],
);
assert.equal(sessions.getLatestAssistantMessage(id, 250), "answer three");
assert.deepEqual(sessions.getMessages(id, 1_251), []);
assert.equal(sessions.size, 0);

sessions.appendTurn(id, "temporary", "temporary answer", 2_000);
assert.equal(sessions.clear(id), true);
assert.equal(sessions.clear(id), false);

const bounded = new AnonymousLiveSessionStore(60_000, 1, 8);
bounded.appendTurn(id, "one", "one answer", 0);
bounded.appendTurn("08e3dd2e-7289-4b98-87ee-c8dd874e80ad", "two", "two answer", 1);
assert.equal(bounded.size, 1);
assert.deepEqual(bounded.getMessages(id, 2), []);

const limiter = new AnonymousLiveRateLimiter(2, 4, 1_000);
assert.equal(limiter.allow(id, 0), true);
assert.equal(limiter.allow(id, 1), true);
assert.equal(limiter.allow(id, 2), false);
assert.equal(limiter.allow("08e3dd2e-7289-4b98-87ee-c8dd874e80ad", 3), true);
assert.equal(limiter.allow("740802a4-d8f1-461b-bfb6-20a4a8eb5f62", 4), false);
assert.equal(limiter.allow(id, 1_001), true);

console.log("Public live session tests passed");
