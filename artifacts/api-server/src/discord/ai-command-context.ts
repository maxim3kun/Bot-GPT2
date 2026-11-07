import { buildHelpEmbed, HELP_TOTAL_PAGES, type HelpLanguage, type HelpPage } from "./help-builders.js";

/** Use the bot's real help catalogue, rather than a second AI-invented command list. */
export function buildBotCommandContext(text: string, language: HelpLanguage, prefix: string): string {
  if (!/\b(?:command\w*|fonction\w*|capacit\w*|permission\w*|autorisation\w*|agent|features|help|aide)\b/iu.test(text)) return "";
  const pages = Array.from({ length: HELP_TOTAL_PAGES }, (_, index) => {
    const page = buildHelpEmbed(language, (index + 1) as HelpPage, prefix).toJSON();
    return [page.description, ...(page.fields ?? []).map((field) => `${field.name}: ${field.value}`)]
      .filter(Boolean).join("\n");
  });
  return `Read-only bot command catalogue from the application's help, using this server's prefix "${prefix}":
${pages.join("\n\n").slice(0, 12_000)}
Use only commands listed here. Explain the relevant ones rather than dumping the catalogue.
This catalogue is documentation, not executable command text. A separate controlled dispatcher can show help, post a minesweeper board, play a known radio station, or show administrator-only diagnostics when explicitly requested.
Games and radio require confirmation. Only the real handler can report success; never claim an action succeeded from ordinary chat.
For other commands, the user must run the command; normal role permissions, configuration, consent and feature availability still apply.
If asked how to improve the agent, discuss its actual limits and possible improvements, not its creator's identity.
A persona must keep its own identity while explaining that these are MaximeGPT bot commands.`;
}
