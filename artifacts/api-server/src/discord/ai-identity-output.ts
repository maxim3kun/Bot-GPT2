export const DISCORD_IDENTITY_GUIDANCE =
  "Discord identity fields (id, username, displayName, bot) are internal routing metadata, not part of the conversation. " +
  "Use IDs only to distinguish participants and select the correct private memory. " +
  "Address people by their display name or naturally as you; never append their Discord ID, username, or bot flag to a greeting. " +
  "Only reproduce a Discord ID when the user explicitly asks for that identifier or supplies it as part of the current request. " +
  "Do not copy internal identity JSON into your answer.";

/** Narrow output guard: known participant IDs only, never arbitrary numbers or estimates. */
export function removeUnrequestedDiscordIds(answer: string, ids: string[], request: string): string {
  const asksForId = /\b(?:quel(?:\s+est)?|quelle(?:\s+est)?|donne(?:-moi)?|montre(?:-moi)?|what(?:\s+is)?|show\s+me|give\s+me)\b[^.!?\n]{0,60}\b(?:id|identifiant|identifier|snowflake)s?\b/i.test(request);
  if (asksForId) return answer;
  let result = answer;
  for (const id of new Set(ids)) {
    if (!/^\d{17,20}$/.test(id) || request.includes(id)) continue;
    const label = "(?:(?:Discord\\s+)?(?:ID|identifiant|identifier|snowflake)(?:\\s+Discord)?\\s*[:#=]?\\s*)?";
    // Strip the entire metadata aside rather than leaving "(ID )" in a greeting.
    result = result
      .replace(new RegExp(`\\s*[\\[(]\\s*${label}\`?${id}\`?\\s*[\\])]`, "gi"), "")
      .replace(new RegExp(`\\s*\\b(?:Discord\\s+)?(?:ID|identifiant|identifier|snowflake)(?:\\s+Discord)?\\s*[:#=]?\\s*\`?${id}\`?(?!\\d)`, "gi"), "")
      .replace(new RegExp(`<@!?${id}>`, "g"), "")
      .replace(new RegExp(`(?<!\\d)\`?${id}\`?(?!\\d)`, "g"), "");
  }
  return result.replace(/[ \t]+([,!.?])/g, "$1").trim();
}
