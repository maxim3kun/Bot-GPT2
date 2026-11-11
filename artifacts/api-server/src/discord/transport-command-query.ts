/** Prefix parsing is separate from execution, so natural requests can use a typed search. */
export function parseTransportCommand(args: string[]) {
  const words = args.map(word => word.trim()).filter(Boolean);
  const territory = /^(?:qc|--qc)$/i.test(words[0] ?? "") ? "qc" as const :
    /^(?:fr|france|--fr)$/i.test(words[0] ?? "") ? "fr" as const :
    /^(?:en|--en|angleterre|england)$/i.test(words[0] ?? "") ? "en" as const : undefined;
  if (territory) words.shift();
  const marker = words.findIndex(word => /^(ligne|line)$/i.test(word));
  const explicit = marker >= 0 && /^[a-z0-9][a-z0-9._-]*$/i.test(words[marker + 1] ?? "") ? words[marker + 1] : undefined;
  const last = words.at(-1) ?? "";
  const line = explicit ?? (words.length > 1 && /^(?:\d{1,4}|[a-z]\d{0,3}|[a-z]{2,3}\d{1,3})$/i.test(last) ? last : undefined);
  const location = (explicit ? words.filter((_, i) => i !== marker && i !== marker + 1) : line ? words.slice(0, -1) : words).join(" ");
  const journey = location.match(/^(?:de\s+)?(.+?)(?:\s+vers\s+|\s+to\s+|\s*->\s*|\s*→\s*)(.+)$/i);
  return { place: journey ? journey[1]!.trim() : location, direction: journey?.[2]?.trim(), line,
    ...(territory ? { territory } : {}) };
}
