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

function researchWordLimit(request: string): number | null {
  const normalized = request
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\b(?:actualites?|news|latest|breaking|today(?:'s)? news|dernieres? nouvelles?)\b/.test(normalized)) return 75;
  if (/\b(qu['’]est[- ]ce que|c['’]est quoi|qui est|que signifie|what is|who is|who was|tell me about)\b/.test(normalized)) {
    return 45;
  }
  return null;
}

function capWords(answer: string, limit: number): string {
  const words = answer.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return answer;

  const shortened = words.slice(0, limit).join(" ");
  const lastSentenceEnd = Math.max(
    shortened.lastIndexOf(". "),
    shortened.lastIndexOf("! "),
    shortened.lastIndexOf("? "),
  );
  if (lastSentenceEnd >= shortened.length * 0.6) {
    return shortened.slice(0, lastSentenceEnd + 1).trim();
  }
  return `${shortened.replace(/[,:;—–-]+$/, "").trim()}…`;
}

/**
 * Keep researched answers readable if the model ignores the no-table prompt.
 * Search links remain available through the Discord sources button.
 */
export function normalizeResearchAnswer(answer: string, request = ""): string {
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

  const normalized = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const wordLimit = researchWordLimit(request);
  return wordLimit ? capWords(normalized, wordLimit) : normalized;
}
