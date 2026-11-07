/** Discord limits descriptions to 4096 UTF-16 units; preserve all text across replies. */
export function splitAiAnswer(text: string, limit = 3_800): string[] {
  if (limit < 2) throw new Error("AI reply chunk limit must be at least 2");
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n", limit);
    if (cut < limit / 2) cut = remaining.lastIndexOf(" ", limit);
    if (cut < limit / 2) cut = limit;
    const previous = remaining.charCodeAt(cut - 1);
    if (previous >= 0xd800 && previous <= 0xdbff) cut--;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.replace(/<br\s*\/?>/gi, " — ").trim());
}

function isTableSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

const SOURCE_COLUMN = /^(?:source|sources|site|website|publisher|provider|fuente|fuentes|fonte|fontes|quelle|quellen|źródło|источник|kaynak|ソース|出典)$/i;

/**
 * Keep researched answers readable if the model ignores the no-table prompt.
 * Search links remain available through the Discord sources button.
 */
export function normalizeResearchAnswer(answer: string): string {
  const lines = answer
    .replace(/<br\s*\/?>/gi, " — ")
    .split(/\r?\n/)
    .filter((line) => !/^\s{0,3}#{1,6}\s/.test(line));
  const output: string[] = [];

  for (let index = 0; index < lines.length;) {
    if (!lines[index]!.includes("|")) {
      output.push(lines[index]!);
      index += 1;
      continue;
    }

    const tableLines: string[] = [];
    while (index < lines.length && lines[index]!.includes("|")) {
      tableLines.push(lines[index]!);
      index += 1;
    }

    const parsedRows = tableLines.map(parseTableCells);
    const hasHeader = parsedRows.length > 1 && isTableSeparator(parsedRows[1]!);
    const headers = hasHeader ? parsedRows[0]! : [];
    const dataRows = hasHeader ? parsedRows.slice(2) : parsedRows;

    for (const row of dataRows) {
      if (isTableSeparator(row)) continue;
      const details = row
        .map((value, cellIndex) => ({
          label: headers[cellIndex]?.replace(/\*\*/g, "").trim() ?? "",
          value: value.replace(/\*\*/g, "").trim(),
        }))
        .filter(({ label, value }) => value && !SOURCE_COLUMN.test(label))
        .map(({ label, value }) => label ? `**${label} :** ${value}` : value);

      if (details.length) output.push(`• ${details.join(" — ")}`);
    }
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
