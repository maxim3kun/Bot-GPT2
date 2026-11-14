import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import type { Collection } from "mongodb";
import { createCommandFavoritesStore } from "../src/discord/command-favorites-store.js";

type Stored = { _id: string; encryptedData: string; updatedAt: Date };

function repository(options: { ready?: boolean; unavailable?: boolean } = {}) {
  const documents = new Map<string, Stored>();
  let writes = 0;
  const collection = {
    findOne: async ({ _id }: { _id: string }) => {
      if (options.unavailable) throw new Error("database offline");
      return structuredClone(documents.get(_id) ?? null);
    },
    updateOne: async ({ _id }: { _id: string }, update: { $set: Omit<Stored, "_id"> }) => {
      if (options.unavailable) throw new Error("database offline");
      writes++;
      documents.set(_id, structuredClone({ _id, ...update.$set }));
    },
  } as unknown as Collection<Stored>;
  const makeStore = () => createCommandFavoritesStore({
    collection: () => collection,
    ready: () => options.ready !== false,
    hash: id => createHash("sha256").update(id).digest("hex"),
    encrypt: plaintext => Buffer.from(plaintext, "utf8").toString("base64"),
    decrypt: ciphertext => Buffer.from(ciphertext, "base64").toString("utf8"),
  });
  return { store: makeStore(), makeStore, documents, get writes() { return writes; } };
}

test("command favorites are encrypted, private per member, and persist between store instances", async () => {
  const db = repository();
  assert.deepEqual(await db.store.get("member-a"), []);
  assert.deepEqual(await db.store.toggle("member-a", "bus"), { ok: true, saved: true });
  assert.deepEqual(await db.store.toggle("member-a", "pendu"), { ok: true, saved: true });
  assert.deepEqual(await db.store.get("member-a"), ["bus", "pendu"]);
  assert.deepEqual(await db.store.get("member-b"), []);

  const [document] = [...db.documents.values()];
  assert.ok(document);
  assert.equal(document._id, createHash("sha256").update("member-a").digest("hex"));
  assert.equal(document.encryptedData.includes("member-a"), false);
  assert.equal(document.encryptedData.includes("bus"), false);
  assert.deepEqual(await db.makeStore().get("member-a"), ["bus", "pendu"]);
  assert.deepEqual(await db.store.toggle("member-a", "bus"), { ok: true, saved: false, removed: true });
  assert.deepEqual(await db.store.get("member-a"), ["pendu"]);
});

test("command favorites never fall back to plaintext when encryption or MongoDB is unavailable", async () => {
  for (const options of [{ ready: false }, { unavailable: true }]) {
    const db = repository(options);
    assert.equal(await db.store.get("member"), null);
    assert.deepEqual(await db.store.toggle("member", "joke"), { ok: false, saved: false });
    assert.equal(db.writes, 0);
    assert.equal(db.documents.size, 0);
  }
});

test("command favorite identifiers and list size are validated", async () => {
  const db = repository();
  assert.deepEqual(await db.store.toggle("member", "not a command"), { ok: false, saved: false });
  for (let index = 0; index < 25; index++) {
    assert.deepEqual(await db.store.toggle("member", `command-${index}`), { ok: true, saved: true });
  }
  assert.deepEqual(await db.store.toggle("member", "overflow"), { ok: true, saved: false, limitReached: true });
  assert.equal((await db.store.get("member"))?.length, 25);
});

test("concurrent command favorite changes do not overwrite each other", async () => {
  const db = repository();
  const results = await Promise.all([
    db.store.toggle("member", "bus"),
    db.store.toggle("member", "metro"),
    db.store.toggle("member", "train"),
  ]);
  assert.ok(results.every(result => result.ok));
  assert.deepEqual((await db.store.get("member"))?.sort(), ["bus", "metro", "train"]);
});
