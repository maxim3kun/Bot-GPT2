import assert from "node:assert/strict";
import type { Client, Message } from "discord.js";
import { decrypt, encrypt, hashUserId, type PrivateAgendaData } from "../src/lib/db.js";
import {
  handlePrivateAgendaCommand,
  handlePrivateTimerCommand,
  runPrivateAgendaReminderCycle,
  type PrivateAgendaDependencies,
} from "../src/discord/private-agenda.js";
import { isValidTimeZone, parseDurationMs, resolveLocalDateTime } from "../src/discord/private-agenda-time.js";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeDependencies(nowMs: number) {
  const records = new Map<string, PrivateAgendaData>();
  const delivered: Array<{ userId: string; content: string }> = [];
  const dependencies: PrivateAgendaDependencies = {
    load: async userId => records.has(userId) ? clone(records.get(userId)!) : null,
    save: async (userId, data) => { records.set(userId, clone(data)); },
    list: async () => [...records.values()].map(clone),
    suggestedTimezone: async () => "Europe/Paris",
    now: () => nowMs,
    sendReminder: async (_client, userId, content) => { delivered.push({ userId, content }); },
  };
  return { dependencies, records, delivered };
}

function fakeMessage(userId: string, guildId: string | null = null) {
  const replies: string[] = [];
  const dms: string[] = [];
  const message = {
    guildId,
    author: {
      id: userId,
      send: async (payload: string | { content?: string }) => {
        dms.push(typeof payload === "string" ? payload : payload.content ?? "");
      },
    },
    reply: async (payload: string | { content?: string }) => {
      replies.push(typeof payload === "string" ? payload : payload.content ?? "");
      return {};
    },
  } as unknown as Message;
  return { message, replies, dms };
}

function assertTimezoneConversion(): void {
  assert.equal(isValidTimeZone("Europe/Paris"), true);
  assert.equal(isValidTimeZone("Not/A_Zone"), false);
  assert.deepEqual(resolveLocalDateTime("2026-11-15", "12:00", "Europe/Paris"), {
    ok: true,
    epochMs: Date.parse("2026-11-15T11:00:00.000Z"),
  });
  assert.deepEqual(resolveLocalDateTime("2026-07-14", "12:00", "Europe/Paris"), {
    ok: true,
    epochMs: Date.parse("2026-07-14T10:00:00.000Z"),
  });
  assert.deepEqual(resolveLocalDateTime("2026-03-08", "02:30", "America/New_York"), {
    ok: false,
    reason: "nonexistent",
  });
  assert.deepEqual(resolveLocalDateTime("2026-11-01", "01:30", "America/New_York"), {
    ok: false,
    reason: "ambiguous",
  });
  assert.deepEqual(resolveLocalDateTime("2026-02-31", "10:00", "Europe/Paris"), {
    ok: false,
    reason: "invalid",
  });
  assert.equal(parseDurationMs("20m"), 1_200_000);
  assert.equal(parseDurationMs("0m", true), 0);
  assert.equal(parseDurationMs("0s"), null);
  assert.equal(parseDurationMs("366d"), null);
}

function assertEncryptedPersistencePrimitives(): void {
  const sentinel = "private-agenda-sensitive-title";
  try {
    const ciphertext = encrypt(JSON.stringify({ title: sentinel }));
    assert.equal(ciphertext.includes(sentinel), false);
    assert.deepEqual(JSON.parse(decrypt(ciphertext)), { title: sentinel });
  } catch (error) {
    assert.match(String(error), /ENCRYPTION_KEY not configured/);
  }
  assert.match(hashUserId("private-agenda-test-owner"), /^[0-9a-f]{64}$/);
}

async function assertPrivateCrudAndIsolation(): Promise<string> {
  const nowMs = Date.parse("2026-11-13T12:00:00.000Z");
  const { dependencies, records } = makeDependencies(nowMs);
  const first = fakeMessage("user-one");
  await handlePrivateAgendaCommand(first.message, ["add", "2026-11-15", "12:00", "--rappel", "10m", "Dentiste"], "!", dependencies);
  assert.equal(records.get("user-one")?.events.length, 1);
  assert.equal(records.get("user-one")?.events[0]?.title, "Dentiste");
  const id = records.get("user-one")!.events[0]!.id;
  assert.match(first.replies.join("\n"), /Dentiste|Dentist/);

  const listing = fakeMessage("user-one");
  await handlePrivateAgendaCommand(listing.message, ["list"], "!", dependencies);
  assert.match(listing.replies.join("\n"), /Dentiste/);

  const otherUser = fakeMessage("user-two");
  await handlePrivateAgendaCommand(otherUser.message, ["delete", id], "!", dependencies);
  assert.equal(records.get("user-one")?.events.length, 1);
  assert.equal(records.has("user-two"), false);

  await handlePrivateAgendaCommand(first.message, ["edit", id, "2026-11-15", "13:00", "Dentiste", "modifié"], "!", dependencies);
  assert.equal(records.get("user-one")?.events[0]?.title, "Dentiste modifié");
  assert.equal(records.get("user-one")?.events[0]?.startsAt, "2026-11-15T12:00:00.000Z");

  await handlePrivateAgendaCommand(first.message, ["cancel", id], "!", dependencies);
  assert.equal(records.get("user-one")?.events[0]?.reminderStatus, "cancelled");
  assert.equal(records.get("user-one")?.events[0]?.reminderAt, null);
  await handlePrivateAgendaCommand(first.message, ["remind", id], "!", dependencies);
  assert.equal(records.get("user-one")?.events[0]?.reminderStatus, "pending");
  await handlePrivateAgendaCommand(first.message, ["delete", id], "!", dependencies);
  assert.equal(records.get("user-one")?.events.length, 0);

  const publicMessage = fakeMessage("user-public", "guild-id");
  await handlePrivateAgendaCommand(publicMessage.message, ["add", "2026-11-16", "14:00", "Secret rendez-vous"], "!", dependencies);
  assert.match(publicMessage.replies.join("\n"), /message privé|private message/i);
  assert.doesNotMatch(publicMessage.replies.join("\n"), /Secret rendez-vous/);
  assert.match(publicMessage.dms.join("\n"), /Secret rendez-vous/);

  const noStorage = fakeMessage("user-no-storage");
  const failingDependencies = {
    ...dependencies,
    save: async () => { throw new Error("database unavailable"); },
  };
  await handlePrivateAgendaCommand(noStorage.message, ["add", "2026-11-16", "14:00", "Not saved"], "!", failingDependencies);
  assert.match(noStorage.replies.join("\n"), /indisponible|unavailable/i);
  assert.equal(records.has("user-no-storage"), false);
  return id;
}

async function assertTimerAndRestartedReminder(): Promise<void> {
  const nowMs = Date.parse("2026-11-13T12:00:00.000Z");
  const { dependencies, records, delivered } = makeDependencies(nowMs);
  const timerMessage = fakeMessage("timer-user");
  await handlePrivateTimerCommand(timerMessage.message, ["20m", "Pause"], "!", dependencies);
  const timer = records.get("timer-user")?.events[0];
  assert.ok(timer);
  assert.equal(timer.kind, "timer");
  assert.equal(Date.parse(timer.startsAt), nowMs + 20 * 60_000);
  await handlePrivateTimerCommand(timerMessage.message, ["cancel", timer.id], "!", dependencies);
  assert.equal(records.get("timer-user")?.events.length, 0);

  const dueAt = new Date(nowMs - 60_000).toISOString();
  records.set("restart-user", {
    userId: "restart-user",
    timezone: "Europe/Paris",
    updatedAt: new Date(nowMs).toISOString(),
    events: [{
      id: "A1B2C3",
      kind: "event",
      title: "Réunion",
      startsAt: new Date(nowMs + 15 * 60_000).toISOString(),
      reminderAt: dueAt,
      reminderLeadMs: 10 * 60_000,
      reminderStatus: "pending",
      createdAt: dueAt,
      updatedAt: dueAt,
    }],
  });
  const fakeClient = { users: { fetch: async () => { throw new Error("injected sender should be used"); } } } as unknown as Client;

  // The state is read from the same persistent store, so a newly started scheduler
  // can deliver a reminder that became due while the process was stopped.
  await runPrivateAgendaReminderCycle(fakeClient, new Date(nowMs), dependencies);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0]?.userId, "restart-user");
  assert.match(delivered[0]?.content ?? "", /Réunion|Meeting/);
  assert.equal(records.get("restart-user")?.events[0]?.reminderStatus, "sent");
  await runPrivateAgendaReminderCycle(fakeClient, new Date(nowMs + 20_000), dependencies);
  assert.equal(delivered.length, 1);

  const cancelledAt = new Date(nowMs - 100_000).toISOString();
  records.set("cancelled-user", {
    userId: "cancelled-user",
    timezone: "Europe/Paris",
    updatedAt: cancelledAt,
    events: [{
      id: "CANCEL1",
      kind: "timer",
      title: "Cancelled",
      startsAt: nowMs - 50_000 < 0 ? new Date(nowMs).toISOString() : new Date(nowMs - 50_000).toISOString(),
      reminderAt: null,
      reminderLeadMs: 0,
      reminderStatus: "cancelled",
      createdAt: cancelledAt,
      updatedAt: cancelledAt,
    }],
  });
  await runPrivateAgendaReminderCycle(fakeClient, new Date(nowMs + 40_000), dependencies);
  assert.equal(delivered.length, 1);

  records.set("stuck-user", {
    userId: "stuck-user",
    timezone: "Europe/Paris",
    updatedAt: cancelledAt,
    events: [{
      id: "STUCK1",
      kind: "timer",
      title: "No duplicate after restart",
      startsAt: dueAt,
      reminderAt: dueAt,
      reminderLeadMs: 0,
      reminderStatus: "sending",
      reminderClaimedAt: new Date(nowMs - 5 * 60_000).toISOString(),
      createdAt: dueAt,
      updatedAt: dueAt,
    }],
  });
  await runPrivateAgendaReminderCycle(fakeClient, new Date(nowMs), dependencies);
  assert.equal(records.get("stuck-user")?.events[0]?.reminderStatus, "failed");
  assert.equal(delivered.length, 1);
}

async function main(): Promise<void> {
  assertTimezoneConversion();
  assertEncryptedPersistencePrimitives();
  await assertPrivateCrudAndIsolation();
  await assertTimerAndRestartedReminder();
  console.log("private agenda: time zones, DST, private CRUD, user isolation, storage failure, timers, restart delivery, and duplicate prevention passed");
}

void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
