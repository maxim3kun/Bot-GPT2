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

/**
 * A basic pancake recipe is stable and does not need a web search. Returning
 * one tested-format recipe directly avoids turning search snippets into a
 * directory of recipe sites, while custom dietary requests still go to the AI.
 */
export function directPancakeRecipe(userText: string, language: string): string | null {
  const normalized = userText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (!/\bpancakes?\b/.test(normalized)) return null;
  if (!/\b(?:comment|recette|faire|fais|preparer|cuisiner|how to|how do i|how can i|how do you|recipe|make|cook)\b/.test(normalized)) return null;
  if (/\b(?:sans|without|vegan|vegetalien|vegetalienne|gluten|lactose|sans oeuf|eggless)\b/.test(normalized)) return null;

  if (language === "fr") {
    return [
      "Pour environ **8 pancakes** (3 à 4 personnes) :",
      "",
      "**Ingrédients**",
      "• 250 g de farine",
      "• 2 œufs",
      "• 30 cl de lait",
      "• 30 g de sucre",
      "• 1 sachet de levure chimique (environ 11 g)",
      "• 40 g de beurre fondu",
      "• 1 pincée de sel",
      "",
      "**Préparation**",
      "1. Mélange la farine, la levure, le sucre et le sel.",
      "2. Ajoute les œufs, puis verse le lait petit à petit en fouettant. Incorpore le beurre fondu et arrête de mélanger dès que la pâte est homogène.",
      "3. Laisse reposer la pâte 10 minutes.",
      "4. Fais chauffer une poêle légèrement beurrée à feu moyen. Verse une petite louche de pâte.",
      "5. Quand des bulles apparaissent et que les bords commencent à prendre, retourne le pancake et cuis l’autre côté environ 1 minute.",
      "",
      "Astuce : ne travaille pas trop la pâte et baisse un peu le feu si les pancakes dorent avant d’être cuits à cœur.",
    ].join("\n");
  }

  if (language === "en") {
    return [
      "For about **8 pancakes** (serves 3–4):",
      "",
      "**Ingredients**",
      "• 250 g (2 cups) flour",
      "• 2 eggs",
      "• 300 ml (1¼ cups) milk",
      "• 30 g (2 tbsp) sugar",
      "• 1 packet baking powder (about 11 g)",
      "• 40 g (3 tbsp) melted butter",
      "• A pinch of salt",
      "",
      "**Method**",
      "1. Mix the flour, baking powder, sugar, and salt.",
      "2. Add the eggs, then gradually whisk in the milk. Stir in the melted butter and stop as soon as the batter is combined.",
      "3. Let the batter rest for 10 minutes.",
      "4. Heat a lightly buttered pan over medium heat. Pour in a small ladle of batter.",
      "5. Flip when bubbles appear and the edges begin to set; cook the other side for about 1 minute.",
      "",
      "Tip: Don’t overmix the batter. Lower the heat if the pancakes brown before they cook through.",
    ].join("\n");
  }

  return null;
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
