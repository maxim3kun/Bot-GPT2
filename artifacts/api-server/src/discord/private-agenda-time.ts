export type LocalTimeResolution =
  | { ok: true; epochMs: number }
  | { ok: false; reason: "invalid" | "timezone" | "nonexistent" | "ambiguous" };

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getLocalParts(epochMs: number, timezone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(epochMs));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(values["year"]),
    month: Number(values["month"]),
    day: Number(values["day"]),
    hour: Number(values["hour"]),
    minute: Number(values["minute"]),
  };
}

function sameParts(a: LocalParts, b: LocalParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
    && a.hour === b.hour && a.minute === b.minute;
}

function offsetAt(epochMs: number, timezone: string): number {
  const minute = Math.floor(epochMs / 60_000) * 60_000;
  const local = getLocalParts(minute, timezone);
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  return localAsUtc - minute;
}

export function isValidTimeZone(timezone: string): boolean {
  if (!timezone || timezone.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Resolves a wall-clock time only when it maps to exactly one instant. */
export function resolveLocalDateTime(date: string, time: string, timezone: string): LocalTimeResolution {
  if (!isValidTimeZone(timezone)) return { ok: false, reason: "timezone" };
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!dateMatch || !timeMatch) return { ok: false, reason: "invalid" };

  const target: LocalParts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
  };
  if (target.year < 1970 || target.month < 1 || target.month > 12 || target.day < 1 || target.day > 31) {
    return { ok: false, reason: "invalid" };
  }
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  const checkDate = new Date(targetAsUtc);
  if (checkDate.getUTCFullYear() !== target.year || checkDate.getUTCMonth() + 1 !== target.month
    || checkDate.getUTCDate() !== target.day) return { ok: false, reason: "invalid" };

  const offsets = new Set([
    offsetAt(targetAsUtc - 36 * 60 * 60_000, timezone),
    offsetAt(targetAsUtc, timezone),
    offsetAt(targetAsUtc + 36 * 60 * 60_000, timezone),
  ]);
  const candidates = [...offsets]
    .map(offset => targetAsUtc - offset)
    .filter(epochMs => sameParts(getLocalParts(epochMs, timezone), target));
  const unique = [...new Set(candidates)].sort((a, b) => a - b);
  if (unique.length === 0) return { ok: false, reason: "nonexistent" };
  if (unique.length > 1) return { ok: false, reason: "ambiguous" };
  return { ok: true, epochMs: unique[0]! };
}

export function parseDurationMs(value: string, allowZero = false): number | null {
  const match = /^(\d+)(s|m|h|d)$/i.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]!.toLowerCase() as "s" | "m" | "h" | "d"];
  const duration = amount * multiplier;
  if (!Number.isSafeInteger(duration) || duration > 365 * 86_400_000) return null;
  if (allowZero ? duration < 0 : duration < 10_000) return null;
  return duration;
}

export function formatAgendaTime(epochMs: number, timezone: string, french: boolean): string {
  if (!isValidTimeZone(timezone) || !Number.isFinite(epochMs)) return "heure indisponible";
  const formatted = new Intl.DateTimeFormat(french ? "fr-FR" : "en-GB", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(epochMs));
  return `${formatted} · ${timezone}`;
}
