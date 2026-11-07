/** Discord does not render Markdown tables. Prefer readable lists in roleplay.
 * This is a presentation default, not additional persistent user memory. */
export const PERSONA_FORMAT_GUIDANCE = "Use natural conversational paragraphs or short bullet lists, not Markdown tables or pipe-delimited grids. Only use a table when the current speaker explicitly requests one in the current message.";

function explicitlyRequestsTable(prompt: string): boolean {
  const text = prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:pas|plus|sans|arrete|evite|stop|no|not|don't|avoid)\b[^.!?\n]{0,50}\b(?:tableaux?|tables?)\b/.test(text)) return false;
  return /\b(?:fais|fait|faire|cree|presente|mets|donne|affiche|veux|voudrais|souhaite|utilise|make|create|show|use|give|want|in|en|sous forme de)\b[^.!?\n]{0,45}\b(?:tableau|table)\b/.test(text);
}

export function formatPersonaAnswer(answer: string, prompt: string): string {
  if (explicitlyRequestsTable(prompt)) return answer;
  const lines = answer.split("\n");
  const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(s => s.trim());
  const output: string[] = [];
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const separator = lines[i + 1];
    if (!fenced && line.includes("|") && separator?.includes("|")
      && cells(separator).every(cell => /^:?-{3,}:?$/.test(cell))) {
      const headers = cells(line);
      i += 2;
      for (; i < lines.length && lines[i]!.includes("|") && lines[i]!.trim(); i++) {
        output.push(`• ${cells(lines[i]!).map((cell, n) => headers[n] ? `${headers[n]} : ${cell}` : cell).join(" — ")}`);
      }
      i--;
    } else output.push(line);
  }
  return output.join("\n");
}
