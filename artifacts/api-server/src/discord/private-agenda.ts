import { randomBytes } from "node:crypto";
import type { Client, Message } from "discord.js";
import {
  getAiTimezone,
  getAllPrivateAgendas,
  getPrivateAgenda,
  hashUserId,
  savePrivateAgenda,
  type PrivateAgendaData,
  type PrivateAgendaEvent,
  type PrivateAgendaReminderStatus,
} from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getEffectiveLanguage } from "./effective-language.js";
import {
  formatAgendaTime,
  isValidTimeZone,
  parseDurationMs,
  resolveLocalDateTime,
} from "./private-agenda-time.js";

const DEFAULT_TIMEZONE = "Europe/Paris";
const DEFAULT_REMINDER_LEAD_MS = 10 * 60_000;
const SCHEDULER_INTERVAL_MS = 15_000;

export interface PrivateAgendaDependencies {
  load: (userId: string) => Promise<PrivateAgendaData | null>;
  save: (userId: string, data: PrivateAgendaData) => Promise<void>;
  list: () => Promise<PrivateAgendaData[]>;
  suggestedTimezone: (userId: string) => Promise<string | null>;
  now: () => number;
  sendReminder: (client: Client, userId: string, content: string) => Promise<void>;
}

const defaultDependencies: PrivateAgendaDependencies = {
  load: getPrivateAgenda,
  save: savePrivateAgenda,
  list: getAllPrivateAgendas,
  suggestedTimezone: async userId => (await getAiTimezone(userId))?.timezone ?? null,
  now: () => Date.now(),
  sendReminder: async (client, userId, content) => {
    const user = await client.users.fetch(userId);
    if (user.id !== userId) throw new Error("Recipient identity did not match");
    await user.send({ content, allowedMentions: { parse: [] } });
  },
};

const userLocks = new Map<string, Promise<void>>();
let schedulerRunning = false;
const startedSchedulers = new WeakSet<Client>();
let lastSchedulerLoadWarningAt = 0;

function language(message: Message): "fr" | "en" {
  return getEffectiveLanguage(message.guildId, message.author.id) === "fr" ? "fr" : "en";
}

function freshId(events: PrivateAgendaEvent[]): string {
  let id = "";
  do {
    id = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  } while (events.some(event => event.id === id));
  return id;
}

async function createAgenda(userId: string, dependencies: PrivateAgendaDependencies): Promise<PrivateAgendaData> {
  const suggested = await dependencies.suggestedTimezone(userId).catch(() => null);
  return {
    userId,
    timezone: suggested && isValidTimeZone(suggested) ? suggested : DEFAULT_TIMEZONE,
    events: [],
    updatedAt: new Date(dependencies.now()).toISOString(),
  };
}

async function withAgendaLock<T>(
  userId: string,
  dependencies: PrivateAgendaDependencies,
  operation: (agenda: PrivateAgendaData) => Promise<{ changed: boolean; value: T }> | { changed: boolean; value: T },
): Promise<T> {
  const previous = userLocks.get(userId) ?? Promise.resolve();
  let value!: T;
  const run = previous.catch(() => undefined).then(async () => {
    const agenda = await dependencies.load(userId) ?? await createAgenda(userId, dependencies);
    const result = await operation(agenda);
    value = result.value;
    if (result.changed) {
      agenda.updatedAt = new Date(dependencies.now()).toISOString();
      await dependencies.save(userId, agenda);
    }
  });
  const tail = run.then(() => undefined, () => undefined);
  userLocks.set(userId, tail);
  try {
    await run;
    return value;
  } finally {
    if (userLocks.get(userId) === tail) userLocks.delete(userId);
  }
}

async function readAgenda(userId: string, dependencies: PrivateAgendaDependencies): Promise<PrivateAgendaData> {
  return await dependencies.load(userId) ?? createAgenda(userId, dependencies);
}

async function sendPrivateReply(
  message: Message,
  text: string,
  french: boolean,
): Promise<void> {
  if (!message.guildId) {
    await message.reply({ content: text, allowedMentions: { parse: [] } });
    return;
  }
  try {
    await message.author.send({ content: text, allowedMentions: { parse: [] } });
    await message.reply(french
      ? "📩 Je t’ai envoyé les détails en message privé."
      : "📩 I sent the details in a private message.");
  } catch {
    await message.reply(french
      ? "🔒 Je ne peux pas t’envoyer de message privé. Aucun détail de ton agenda n’a été publié ici."
      : "🔒 I can’t send you a private message. No agenda details were posted here.");
  }
}

function usage(french: boolean, prefix: string): string {
  return french
    ? `📅 **Agenda privé**\n\`${prefix}agenda timezone Europe/Paris\`\n\`${prefix}agenda add AAAA-MM-JJ HH:MM [--rappel 10m] <titre>\`\n\`${prefix}agenda list\`\n\`${prefix}agenda edit <ID> AAAA-MM-JJ HH:MM <titre>\`\n\`${prefix}agenda cancel <ID>\` · \`${prefix}agenda remind <ID>\` · \`${prefix}agenda delete <ID>\`\n⏱️ \`${prefix}timer 20m <libellé>\` · \`${prefix}timer cancel <ID>\`\nLes informations et rappels sont envoyés uniquement en message privé.`
    : `📅 **Private agenda**\n\`${prefix}agenda timezone Europe/Paris\`\n\`${prefix}agenda add YYYY-MM-DD HH:MM [--remind 10m] <title>\`\n\`${prefix}agenda list\`\n\`${prefix}agenda edit <ID> YYYY-MM-DD HH:MM <title>\`\n\`${prefix}agenda cancel <ID>\` · \`${prefix}agenda remind <ID>\` · \`${prefix}agenda delete <ID>\`\n⏱️ \`${prefix}timer 20m <label>\` · \`${prefix}timer cancel <ID>\`\nDetails and reminders are sent only by private message.`;
}

function parseReminderAndTitle(
  parts: string[],
  defaultLeadMs: number,
  french: boolean,
): { title: string; leadMs: number; explicitlySet: boolean } | { error: string } {
  let leadMs = defaultLeadMs;
  let explicitlySet = false;
  let titleParts = parts;
  if (parts[0]?.toLowerCase() === "--rappel" || parts[0]?.toLowerCase() === "--remind") {
    const parsed = parseDurationMs(parts[1] ?? "", true);
    if (parsed === null) {
      return { error: french ? "Le rappel doit être une durée comme `10m`, `2h` ou `0m`." : "Reminder lead time must look like `10m`, `2h` or `0m`." };
    }
    leadMs = parsed;
    explicitlySet = true;
    titleParts = parts.slice(2);
  }
  const title = titleParts.join(" ").replace(/\s+/g, " ").trim();
  if (!title || title.length > 120 || /[\r\n]/.test(title)) {
    return { error: french ? "Ajoute un titre de 1 à 120 caractères." : "Add a title between 1 and 120 characters." };
  }
  return { title, leadMs, explicitlySet };
}

function resolveAppointment(
  date: string,
  time: string,
  timezone: string,
  nowMs: number,
  french: boolean,
): { epochMs: number } | { error: string } {
  const resolved = resolveLocalDateTime(date, time, timezone);
  if (!resolved.ok) {
    const errors = french
      ? {
          invalid: "Date ou heure invalide. Utilise `AAAA-MM-JJ HH:MM`.",
          timezone: "Le fuseau horaire enregistré n’est pas valide; règle-le avec `agenda timezone Europe/Paris`.",
          nonexistent: "Cette heure locale n’existe pas à cause du changement d’heure. Choisis une autre heure.",
          ambiguous: "Cette heure locale se produit deux fois à cause du changement d’heure. Choisis une autre heure.",
        }
      : {
          invalid: "Invalid date or time. Use `YYYY-MM-DD HH:MM`.",
          timezone: "The saved time zone is invalid; set it with `agenda timezone Europe/Paris`.",
          nonexistent: "That local time does not exist because of a clock change. Choose another time.",
          ambiguous: "That local time occurs twice because of a clock change. Choose another time.",
        };
    return { error: errors[resolved.reason] };
  }
  if (resolved.epochMs <= nowMs) {
    return { error: french ? "Choisis une date et une heure dans le futur." : "Choose a date and time in the future." };
  }
  return { epochMs: resolved.epochMs };
}

function buildList(agenda: PrivateAgendaData, french: boolean, nowMs: number): string {
  if (!agenda.events.length) {
    return french
      ? `📭 Ton agenda est vide. Fuseau : **${agenda.timezone}**.`
      : `📭 Your agenda is empty. Time zone: **${agenda.timezone}**.`;
  }
  const events = [...agenda.events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, 10);
  const lines = events.map(event => {
    const time = formatAgendaTime(Date.parse(event.startsAt), agenda.timezone, french);
    const label = event.kind === "timer" ? (french ? "Minuteur" : "Timer") : (french ? "Événement" : "Event");
    const reminder = event.reminderStatus === "pending" && event.reminderAt
      ? `${french ? "rappel" : "reminder"} ${formatAgendaTime(Date.parse(event.reminderAt), agenda.timezone, french)}`
      : event.reminderStatus === "sent"
        ? (french ? "rappel envoyé" : "reminder sent")
        : event.reminderStatus === "failed"
          ? (french ? "rappel non envoyé" : "reminder not sent")
          : event.reminderStatus === "sending"
            ? (french ? "rappel en cours" : "reminder in progress")
            : (french ? "rappel désactivé" : "reminder disabled");
    const overdue = Date.parse(event.startsAt) <= nowMs ? ` · ${french ? "passé" : "past"}` : "";
    return `• \`${event.id}\` · **${label}** · ${event.title}\n  ${time}${overdue}\n  ${reminder}`;
  });
  return `${french ? `📅 **Ton agenda · ${agenda.timezone}**` : `📅 **Your agenda · ${agenda.timezone}**`}\n${lines.join("\n")}${agenda.events.length > events.length ? `\n${french ? `… et ${agenda.events.length - events.length} autre(s)` : `… and ${agenda.events.length - events.length} more`}` : ""}`;
}

async function addEvent(
  userId: string,
  date: string,
  time: string,
  reminderParts: string[],
  french: boolean,
  dependencies: PrivateAgendaDependencies,
): Promise<string> {
  return withAgendaLock(userId, dependencies, agenda => {
    const parsed = parseReminderAndTitle(reminderParts, DEFAULT_REMINDER_LEAD_MS, french);
    if ("error" in parsed) return { changed: false, value: parsed.error };
    const resolved = resolveAppointment(date, time, agenda.timezone, dependencies.now(), french);
    if ("error" in resolved) return { changed: false, value: resolved.error };
    const startsAt = new Date(resolved.epochMs).toISOString();
    const reminderAt = new Date(resolved.epochMs - parsed.leadMs).toISOString();
    const event: PrivateAgendaEvent = {
      id: freshId(agenda.events),
      kind: "event",
      title: parsed.title,
      startsAt,
      reminderAt,
      reminderLeadMs: parsed.leadMs,
      reminderStatus: "pending",
      createdAt: new Date(dependencies.now()).toISOString(),
      updatedAt: new Date(dependencies.now()).toISOString(),
    };
    agenda.events.push(event);
    return {
      changed: true,
      value: french
        ? `✅ **Événement ajouté** · \`${event.id}\`\n${event.title}\n${formatAgendaTime(resolved.epochMs, agenda.timezone, true)}\nRappel : ${formatAgendaTime(resolved.epochMs - parsed.leadMs, agenda.timezone, true)}`
        : `✅ **Event added** · \`${event.id}\`\n${event.title}\n${formatAgendaTime(resolved.epochMs, agenda.timezone, false)}\nReminder: ${formatAgendaTime(resolved.epochMs - parsed.leadMs, agenda.timezone, false)}`,
    };
  });
}

async function editEvent(
  userId: string,
  id: string,
  date: string,
  time: string,
  reminderParts: string[],
  french: boolean,
  dependencies: PrivateAgendaDependencies,
): Promise<string> {
  return withAgendaLock(userId, dependencies, agenda => {
    const event = agenda.events.find(item => item.id === id.toUpperCase() && item.kind === "event");
    if (!event) return { changed: false, value: french ? "❌ Événement introuvable dans ton agenda." : "❌ Event not found in your agenda." };
    const parsed = parseReminderAndTitle(reminderParts, event.reminderLeadMs, french);
    if ("error" in parsed) return { changed: false, value: parsed.error };
    const resolved = resolveAppointment(date, time, agenda.timezone, dependencies.now(), french);
    if ("error" in resolved) return { changed: false, value: resolved.error };
    event.title = parsed.title;
    event.startsAt = new Date(resolved.epochMs).toISOString();
    event.updatedAt = new Date(dependencies.now()).toISOString();
    if (event.reminderStatus !== "cancelled" || parsed.explicitlySet) {
      event.reminderLeadMs = parsed.leadMs;
      event.reminderAt = new Date(resolved.epochMs - parsed.leadMs).toISOString();
      event.reminderStatus = "pending";
      delete event.reminderClaimedAt;
    }
    return {
      changed: true,
      value: french
        ? `✅ Événement \`${event.id}\` modifié.\n${event.title}\n${formatAgendaTime(resolved.epochMs, agenda.timezone, true)}`
        : `✅ Event \`${event.id}\` updated.\n${event.title}\n${formatAgendaTime(resolved.epochMs, agenda.timezone, false)}`,
    };
  });
}

async function mutateEvent(
  userId: string,
  id: string,
  action: "cancel" | "remind" | "delete",
  french: boolean,
  dependencies: PrivateAgendaDependencies,
): Promise<string> {
  return withAgendaLock(userId, dependencies, agenda => {
    const index = agenda.events.findIndex(item => item.id === id.toUpperCase());
    if (index < 0) return { changed: false, value: french ? "❌ Élément introuvable dans ton agenda." : "❌ Item not found in your agenda." };
    const event = agenda.events[index]!;
    if (action === "delete") {
      agenda.events.splice(index, 1);
      return { changed: true, value: french ? `🗑️ Élément \`${event.id}\` supprimé.` : `🗑️ Item \`${event.id}\` deleted.` };
    }
    if (action === "cancel") {
      if (event.reminderStatus === "sent") return { changed: false, value: french ? "ℹ️ Ce rappel a déjà été envoyé. Tu peux supprimer l’élément avec `agenda delete`." : "ℹ️ This reminder has already been sent. You can remove it with `agenda delete`." };
      event.reminderStatus = "cancelled";
      event.reminderAt = null;
      delete event.reminderClaimedAt;
      event.updatedAt = new Date(dependencies.now()).toISOString();
      return { changed: true, value: french ? `🔕 Rappel de \`${event.id}\` désactivé. L’événement reste dans ton agenda.` : `🔕 Reminder for \`${event.id}\` disabled. The event stays in your agenda.` };
    }
    if (!isValidTimeZone(agenda.timezone)) {
      return { changed: false, value: french ? "❌ Fuseau horaire invalide; règle-le avant de réactiver le rappel." : "❌ Invalid time zone; update it before re-enabling the reminder." };
    }
    event.reminderAt = new Date(Date.parse(event.startsAt) - event.reminderLeadMs).toISOString();
    event.reminderStatus = "pending";
    delete event.reminderClaimedAt;
    event.updatedAt = new Date(dependencies.now()).toISOString();
    return { changed: true, value: french ? `🔔 Rappel de \`${event.id}\` réactivé.` : `🔔 Reminder for \`${event.id}\` enabled.` };
  });
}

export async function handlePrivateAgendaCommand(
  message: Message,
  args: string[],
  prefix = "!",
  dependencies: PrivateAgendaDependencies = defaultDependencies,
): Promise<void> {
  const french = language(message) === "fr";
  const userId = message.author.id;
  const sub = args[0]?.toLowerCase();
  try {
    if (!sub || sub === "help" || sub === "aide") {
      await sendPrivateReply(message, usage(french, prefix), french);
      return;
    }
    if (sub === "timezone" || sub === "fuseau") {
      if (!args[1]) {
        const agenda = await readAgenda(userId, dependencies);
        await sendPrivateReply(message, french
          ? `🌍 Fuseau de ton agenda : **${agenda.timezone}**. Change-le avec \`${prefix}agenda timezone Europe/Paris\`.`
          : `🌍 Your agenda time zone is **${agenda.timezone}**. Change it with \`${prefix}agenda timezone Europe/Paris\`.`, french);
        return;
      }
      const timezone = args[1]!.trim();
      if (!isValidTimeZone(timezone)) {
        await sendPrivateReply(message, french ? "❌ Fuseau IANA invalide. Exemple : `Europe/Paris` ou `America/Toronto`." : "❌ Invalid IANA time zone. Example: `Europe/Paris` or `America/Toronto`.", french);
        return;
      }
      const result = await withAgendaLock(userId, dependencies, agenda => {
        agenda.timezone = timezone;
        return { changed: true, value: french ? `✅ Fuseau de ton agenda : **${timezone}**.` : `✅ Agenda time zone: **${timezone}**.` };
      });
      await sendPrivateReply(message, result, french);
      return;
    }
    if (sub === "list" || sub === "liste") {
      const agenda = await readAgenda(userId, dependencies);
      await sendPrivateReply(message, buildList(agenda, french, dependencies.now()), french);
      return;
    }
    if (sub === "add" || sub === "ajouter") {
      if (args.length < 4) {
        await sendPrivateReply(message, usage(french, prefix), french);
        return;
      }
      const result = await addEvent(userId, args[1]!, args[2]!, args.slice(3), french, dependencies);
      await sendPrivateReply(message, result, french);
      return;
    }
    if (sub === "edit" || sub === "modifier") {
      if (args.length < 5) {
        await sendPrivateReply(message, usage(french, prefix), french);
        return;
      }
      const result = await editEvent(userId, args[1]!, args[2]!, args[3]!, args.slice(4), french, dependencies);
      await sendPrivateReply(message, result, french);
      return;
    }
    if (sub === "cancel" || sub === "annuler" || sub === "remind" || sub === "rappel" || sub === "delete" || sub === "supprimer") {
      const id = args[1]?.trim();
      if (!id) {
        await sendPrivateReply(message, usage(french, prefix), french);
        return;
      }
      const action = sub === "remind" || sub === "rappel" ? "remind" : sub === "delete" || sub === "supprimer" ? "delete" : "cancel";
      const result = await mutateEvent(userId, id, action, french, dependencies);
      await sendPrivateReply(message, result, french);
      return;
    }
    await sendPrivateReply(message, usage(french, prefix), french);
  } catch (err) {
    logger.error({ err, ownerKey: hashUserId(userId) }, "Private agenda command failed");
    await sendPrivateReply(message, french
      ? "🔒 Le stockage chiffré de l’agenda est indisponible. Rien n’a été enregistré."
      : "🔒 Encrypted agenda storage is unavailable. Nothing was saved.", french);
  }
}

export async function handlePrivateTimerCommand(
  message: Message,
  args: string[],
  prefix = "!",
  dependencies: PrivateAgendaDependencies = defaultDependencies,
): Promise<void> {
  const french = language(message) === "fr";
  if (args[0]?.toLowerCase() === "cancel" || args[0]?.toLowerCase() === "annuler") {
    const id = args[1]?.trim();
    if (!id) {
      await sendPrivateReply(message, french
        ? `⏱️ Utilise \`${prefix}timer cancel <ID>\`.`
        : `⏱️ Use \`${prefix}timer cancel <ID>\`.`, french);
      return;
    }
    try {
      const result = await withAgendaLock(message.author.id, dependencies, agenda => {
        const index = agenda.events.findIndex(event => event.id === id.toUpperCase() && event.kind === "timer");
        if (index < 0) {
          return { changed: false, value: french ? "❌ Minuteur introuvable dans ton agenda." : "❌ Timer not found in your agenda." };
        }
        agenda.events.splice(index, 1);
        return { changed: true, value: french ? `⏹️ Minuteur \`${id.toUpperCase()}\` annulé.` : `⏹️ Timer \`${id.toUpperCase()}\` cancelled.` };
      });
      await sendPrivateReply(message, result, french);
    } catch (err) {
      logger.error({ err, ownerKey: hashUserId(message.author.id) }, "Private timer cancellation failed");
      await sendPrivateReply(message, french
        ? "🔒 Le stockage chiffré de l’agenda est indisponible."
        : "🔒 Encrypted agenda storage is unavailable.", french);
    }
    return;
  }
  const durationMs = parseDurationMs(args[0] ?? "");
  const title = args.slice(1).join(" ").replace(/\s+/g, " ").trim()
    || (french ? "Minuteur" : "Timer");
  if (durationMs === null || title.length > 120) {
    await sendPrivateReply(message, french
      ? `⏱️ Utilise \`${prefix}timer 20m <libellé>\` (de 10 secondes à 365 jours).`
      : `⏱️ Use \`${prefix}timer 20m <label>\` (10 seconds to 365 days).`, french);
    return;
  }
  try {
    const userId = message.author.id;
    const nowMs = dependencies.now();
    const result = await withAgendaLock(userId, dependencies, agenda => {
      const event: PrivateAgendaEvent = {
        id: freshId(agenda.events),
        kind: "timer",
        title,
        startsAt: new Date(nowMs + durationMs).toISOString(),
        reminderAt: new Date(nowMs + durationMs).toISOString(),
        reminderLeadMs: 0,
        reminderStatus: "pending",
        createdAt: new Date(nowMs).toISOString(),
        updatedAt: new Date(nowMs).toISOString(),
      };
      agenda.events.push(event);
      return {
        changed: true,
        value: french
          ? `⏱️ Minuteur lancé · \`${event.id}\`\n${event.title}\nFin : ${formatAgendaTime(Date.parse(event.startsAt), agenda.timezone, true)}`
          : `⏱️ Timer started · \`${event.id}\`\n${event.title}\nDue: ${formatAgendaTime(Date.parse(event.startsAt), agenda.timezone, false)}`,
      };
    });
    await sendPrivateReply(message, result, french);
  } catch (err) {
    logger.error({ err, ownerKey: hashUserId(message.author.id) }, "Private timer creation failed");
    await sendPrivateReply(message, french
      ? "🔒 Le stockage chiffré de l’agenda est indisponible. Aucun minuteur n’a été créé."
      : "🔒 Encrypted agenda storage is unavailable. No timer was created.", french);
  }
}

function reminderMessage(event: PrivateAgendaEvent, timezone: string, french: boolean): string {
  const at = formatAgendaTime(Date.parse(event.startsAt), timezone, french);
  return event.kind === "timer"
    ? french
      ? `⏱️ **Minuteur terminé : ${event.title}**\nÉchéance prévue : ${at}`
      : `⏱️ **Timer finished: ${event.title}**\nDue: ${at}`
    : french
      ? `🔔 **Rappel : ${event.title}**\nÉvénement prévu : ${at}`
      : `🔔 **Reminder: ${event.title}**\nEvent time: ${at}`;
}

async function claimReminder(
  userId: string,
  eventId: string,
  nowMs: number,
  dependencies: PrivateAgendaDependencies,
): Promise<{ agenda: PrivateAgendaData; event: PrivateAgendaEvent } | null> {
  return withAgendaLock(userId, dependencies, agenda => {
    const event = agenda.events.find(item => item.id === eventId);
    if (!event || event.reminderStatus !== "pending" || !event.reminderAt
      || Date.parse(event.reminderAt) > nowMs || !isValidTimeZone(agenda.timezone)) {
      return { changed: false, value: null };
    }
    event.reminderStatus = "sending";
    event.reminderClaimedAt = new Date(nowMs).toISOString();
    event.updatedAt = new Date(nowMs).toISOString();
    return { changed: true, value: { agenda: { ...agenda }, event: { ...event } } };
  });
}

async function finishReminder(
  userId: string,
  eventId: string,
  claimedAt: string,
  status: Extract<PrivateAgendaReminderStatus, "sent" | "failed">,
  nowMs: number,
  dependencies: PrivateAgendaDependencies,
): Promise<void> {
  await withAgendaLock(userId, dependencies, agenda => {
    const event = agenda.events.find(item => item.id === eventId);
    if (!event || event.reminderStatus !== "sending" || event.reminderClaimedAt !== claimedAt) {
      return { changed: false, value: undefined };
    }
    event.reminderStatus = status;
    event.updatedAt = new Date(nowMs).toISOString();
    return { changed: true, value: undefined };
  });
}

export async function runPrivateAgendaReminderCycle(
  client: Client,
  now = new Date(),
  dependencies: PrivateAgendaDependencies = defaultDependencies,
): Promise<void> {
  if (schedulerRunning) return;
  schedulerRunning = true;
  const nowMs = now.getTime();
  try {
    const agendas = await dependencies.list();
    for (const agenda of agendas) {
      if (!agenda.userId || !isValidTimeZone(agenda.timezone)) continue;
      for (const candidate of agenda.events) {
        if (candidate.reminderStatus === "sending" && candidate.reminderClaimedAt
          && nowMs - Date.parse(candidate.reminderClaimedAt) > 2 * 60_000) {
          await finishReminder(
            agenda.userId,
            candidate.id,
            candidate.reminderClaimedAt,
            "failed",
            nowMs,
            dependencies,
          ).catch(err => logger.error({ err, ownerKey: hashUserId(agenda.userId) }, "Stale private reminder could not be released"));
          continue;
        }
        if (candidate.reminderStatus !== "pending" || !candidate.reminderAt
          || Date.parse(candidate.reminderAt) > nowMs) continue;
        const claim = await claimReminder(agenda.userId, candidate.id, nowMs, dependencies);
        if (!claim) continue;
        const claimTime = claim.event.reminderClaimedAt!;
        let sent = false;
        try {
          const current = await dependencies.load(agenda.userId);
          const stillPending = current?.events.some(event =>
            event.id === claim.event.id && event.reminderStatus === "sending" && event.reminderClaimedAt === claimTime,
          ) ?? false;
          if (stillPending && hashUserId(current!.userId) === hashUserId(agenda.userId)) {
            const french = getEffectiveLanguage(null, agenda.userId) === "fr";
            await dependencies.sendReminder(client, agenda.userId, reminderMessage(claim.event, claim.agenda.timezone, french));
            sent = true;
          }
        } catch (err) {
          logger.warn({ err, ownerKey: hashUserId(agenda.userId), eventId: claim.event.id }, "Private agenda reminder could not be delivered");
        }
        await finishReminder(agenda.userId, claim.event.id, claimTime, sent ? "sent" : "failed", nowMs, dependencies)
          .catch(err => logger.error({ err, ownerKey: hashUserId(agenda.userId) }, "Private agenda reminder status could not be saved"));
      }
    }
  } catch (err) {
    if (nowMs - lastSchedulerLoadWarningAt >= 5 * 60_000) {
      lastSchedulerLoadWarningAt = nowMs;
      logger.warn({ err }, "Private agenda reminder cycle could not load encrypted records");
    }
  } finally {
    schedulerRunning = false;
  }
}

export function startPrivateAgendaReminderScheduler(client: Client): void {
  if (startedSchedulers.has(client)) return;
  startedSchedulers.add(client);
  const timer = setInterval(() => {
    void runPrivateAgendaReminderCycle(client).catch(err => logger.error({ err }, "Private agenda reminder cycle failed"));
  }, SCHEDULER_INTERVAL_MS);
  timer.unref();
  void runPrivateAgendaReminderCycle(client);
}
