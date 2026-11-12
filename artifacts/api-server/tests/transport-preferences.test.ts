import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import type { Collection } from "mongodb";
import { createTransportPreferencesStore, type TransportFavorite } from "../src/discord/transport-preferences.js";

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
  const store = createTransportPreferencesStore({
    collection: () => collection,
    ready: () => options.ready !== false,
    hash: id => createHash("sha256").update(id).digest("hex"),
    encrypt: plaintext => Buffer.from(plaintext, "utf8").toString("base64"),
    decrypt: ciphertext => Buffer.from(ciphertext, "base64").toString("utf8"),
  });
  return { store, documents, get writes() { return writes; } };
}

const favorite: TransportFavorite = {
  key: "journey-key", territory: "fr", mode: "bus", place: "Breteuil",
  cityId: "municipality-60", routeId: "route-601", resourceId: 42, lineLabel: "601",
  originIds: ["stop-private-a"], originLabel: "Breteuil Centre",
  arrivalIds: ["stop-private-b"], arrivalLabel: "Amiens Gare",
};

test("transport preferences are encrypted, isolated by hashed user ID, and favorites toggle cleanly", async () => {
  const db = repository();
  assert.equal((await db.store.get("discord-user-a"))?.favorites.length, 0);
  assert.equal(await db.store.setPreferredTerritory("discord-user-a", "qc"), true);
  assert.deepEqual(await db.store.toggleFavorite("discord-user-a", favorite), { ok: true, saved: true });
  assert.deepEqual(await db.store.get("discord-user-a"), { preferredTerritory: "qc", favorites: [favorite] });
  assert.deepEqual(await db.store.get("discord-user-b"), { favorites: [] });

  const [document] = [...db.documents.values()];
  assert.ok(document);
  assert.equal(document._id, createHash("sha256").update("discord-user-a").digest("hex"));
  for (const personalValue of ["discord-user-a", "Breteuil", "Amiens Gare", "stop-private-a"]) {
    assert.equal(document.encryptedData.includes(personalValue), false);
  }
  assert.deepEqual(await db.store.toggleFavorite("discord-user-a", favorite), { ok: true, saved: false });
  assert.deepEqual((await db.store.get("discord-user-a"))?.favorites, []);
});

test("transport preferences never write clear data without encryption readiness or MongoDB", async () => {
  for (const options of [{ ready: false }, { unavailable: true }]) {
    const db = repository(options);
    assert.equal(await db.store.setPreferredTerritory("discord-user", "en"), false);
    assert.deepEqual(await db.store.toggleFavorite("discord-user", favorite), { ok: false, saved: false });
    assert.equal(db.writes, 0);
    assert.equal(db.documents.size, 0);
  }
});

test("Mobility Database country preferences and favorites round-trip through encryption", async () => {
  const db = repository();
  const mobilityFavorite: TransportFavorite = {
    ...favorite, key: "mobility-sg-journey", territory: "mobility:SG",
    place: "Singapore", cityId: "osm:mobility:SG:station",
  };
  assert.equal(await db.store.setPreferredTerritory("discord-user", "mobility:SG"), true);
  assert.deepEqual(await db.store.toggleFavorite("discord-user", mobilityFavorite), { ok: true, saved: true });
  assert.deepEqual(await db.store.get("discord-user"), {
    preferredTerritory: "mobility:SG", favorites: [mobilityFavorite],
  });
  assert.equal(await db.store.setPreferredTerritory("discord-user", "mobility:SGP"), false);
});

test("serialized concurrent favorite changes do not overwrite one another", async () => {
  const db = repository();
  const second = { ...favorite, key: "other", routeId: "route-other", lineLabel: "A2" };
  const results = await Promise.all([
    db.store.toggleFavorite("discord-user", favorite),
    db.store.toggleFavorite("discord-user", second),
    db.store.setPreferredTerritory("discord-user", "en"),
  ]);
  assert.ok(results.every(result => typeof result === "object" ? result.ok : result));
  const saved = await db.store.get("discord-user");
  assert.equal(saved?.preferredTerritory, "en");
  assert.deepEqual(saved?.favorites.map(item => item.key).sort(), ["journey-key", "other"]);
});
