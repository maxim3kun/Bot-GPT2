/** Only unambiguous, first-person dates. Never infer identity from mentions,
 * quoted text, historical figures or a persona's fictional biography. */
export function extractOwnBirthday(text: string, persona = false): { day: number; month: number } | null {
  if (/[<@>"“”«»`?]/.test(text) || /\b(?:si|if|suppose|imagine|personnage|character|roleplay)\b/i.test(text)) return null;
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (persona && !/\b(?:mon vrai anniversaire|my real birthday)\b/.test(value)) return null;
  const prefix = /(?:^|[.!]\s*|\n)(?:pour info[, ]+|au fait[, ]+)?(?:mon (?:vrai )?anniversaire (?:est|c'est|tombe)(?: le)?|je suis ne(?:e)? le|my (?:real )?birthday is(?: on)?|i was born on)\s+(.+)/;
  const declaration = value.match(prefix)?.[1];
  if (!declaration) return null;
  const months: Record<string, number> = {
    janvier: 1, january: 1, fevrier: 2, february: 2, mars: 3, march: 3, avril: 4, april: 4,
    mai: 5, may: 5, juin: 6, june: 6, juillet: 7, july: 7, aout: 8, august: 8,
    septembre: 9, september: 9, octobre: 10, october: 10, novembre: 11, november: 11, decembre: 12, december: 12,
  };
  const numeric = declaration.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.]\d{4})?(?=$|[\s.!])/);
  const spelled = declaration.match(/^(\d{1,2})(?:er|st|nd|rd|th)?\s+([a-z]+)\b/);
  const english = declaration.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  const day = Number(numeric?.[1] ?? spelled?.[1] ?? english?.[2]);
  const month = numeric ? Number(numeric[2]) : months[spelled?.[2] ?? english?.[1] ?? ""];
  if (!month || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? { day, month } : null;
}

export function applyBirthdayToSummary(summary: string, date: { day: number; month: number } | null): string {
  if (!date) return summary;
  const note = `Anniversaire personnel : ${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}.`;
  const withoutPrevious = summary.replace(/Anniversaire personnel : \d{2}\/\d{2}\./g, "").trim();
  return `${withoutPrevious.slice(0, 2100)}\n${note}`.trim();
}
