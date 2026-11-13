import { AttachmentBuilder, type Message } from "discord.js";
import type { Language } from "./responses.js";
import {
  DATA_EXPORT_LIMITS,
  fetchPublicPage,
  PageFetchError,
  validatePublicHttpsUrl,
  type PageFetchErrorCode,
  type PublicPageSnapshot,
} from "./public-page-fetcher.js";
import { createExcelWorkbook, extractPageTables } from "./excel-export.js";
import { createPagePdf } from "./pdf-export.js";
import { isSendable } from "./message-utils.js";

export {
  createPublicPageFetcher,
  DATA_EXPORT_LIMITS,
  fetchPublicPage,
  isPublicAddress,
  PageFetchError,
  validatePublicHttpsUrl,
  type PageFetchErrorCode,
  type PublicPageSnapshot,
} from "./public-page-fetcher.js";
export { createExcelWorkbook, extractPageTables, type ExtractedTable } from "./excel-export.js";
export { createPagePdf, extractPageTextBlocks, type PdfBlock } from "./pdf-export.js";

export type ExportCommand = "excel" | "pdf";

export function isDataExportCommand(command: string | undefined): command is ExportCommand {
  return command === "excel" || command === "pdf";
}

function safeFilename(title: string, extension: "xlsx" | "pdf"): string {
  const base = title.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "page";
  return `${base}_${new Date().toISOString().slice(0, 10)}.${extension}`;
}

function fileReplyText(kind: ExportCommand, language: Language, title: string, tables = 0): string {
  if (language === "fr") {
    return kind === "excel"
      ? `📊 Classeur créé à partir de ${tables} tableau(x) de **${title}**. La source et la date de collecte sont incluses.`
      : `📄 Copie PDF lisible de **${title}** prête. La source et la date de collecte sont indiquées dans le fichier.`;
  }
  return kind === "excel"
    ? `📊 Workbook created from ${tables} table(s) on **${title}**. The source and collection date are included.`
    : `📄 A readable PDF copy of **${title}** is ready. The file includes its source and collection date.`;
}

function errorReplyText(error: unknown, language: Language): string {
  const code = error instanceof PageFetchError ? error.code : "http";
  const french = language === "fr";
  const messages: Record<PageFetchErrorCode, string> = french ? {
    invalid_url: "Fournis une URL HTTPS complète, sans identifiant ni mot de passe.",
    private_address: "Cette adresse n’est pas publique ou n’est pas autorisée.",
    dns: "Le site n’a pas pu être résolu publiquement.",
    timeout: "Le site a mis trop longtemps à répondre. Réessaie plus tard.",
    too_large: "La page ou le fichier dépasse la limite de taille autorisée.",
    redirect: "La redirection est absente, trop longue ou non autorisée.",
    not_html: "Cette adresse ne renvoie pas une page HTML exploitable.",
    http: "La page est inaccessible ou a refusé la requête. Les pages protégées ne sont pas contournées.",
    no_tables: "Aucun tableau de données exploitable n’a été trouvé sur cette page.",
    no_content: "Aucun texte exploitable n’a été trouvé sur cette page.",
    pdf_limit: "Le PDF dépasserait la limite de pages autorisée.",
  } : {
    invalid_url: "Provide a complete HTTPS URL without a username or password.",
    private_address: "This address is not public or is not allowed.",
    dns: "The site could not be resolved publicly.",
    timeout: "The site took too long to respond. Try again later.",
    too_large: "The page or file exceeds the allowed size limit.",
    redirect: "The redirect is missing, too long or not allowed.",
    not_html: "This address does not return a usable HTML page.",
    http: "The page is unavailable or refused the request. Protected pages are not bypassed.",
    no_tables: "No usable data table was found on this page.",
    no_content: "No usable text was found on this page.",
    pdf_limit: "The PDF would exceed the allowed page limit.",
  };
  return `⚠️ ${messages[code]}`;
}

function usageText(command: ExportCommand, prefix: string, language: Language): string {
  return language === "fr"
    ? `Utilisation : \`${prefix}${command} https://exemple.fr/page\`. ${command === "excel" ? "La page doit contenir un tableau HTML." : "La page doit être publique et accessible sans connexion."}`
    : `Usage: \`${prefix}${command} https://example.com/page\`. ${command === "excel" ? "The page must contain an HTML table." : "The page must be public and accessible without signing in."}`;
}

const cooldowns = new Map<string, number>();
let activeExports = 0;

function checkRateLimit(userId: string, now: number): number | null {
  for (const [key, expiresAt] of cooldowns) if (expiresAt <= now) cooldowns.delete(key);
  const existing = cooldowns.get(userId);
  if (existing && existing > now) return Math.ceil((existing - now) / 1000);
  cooldowns.set(userId, now + DATA_EXPORT_LIMITS.cooldownMs);
  return null;
}

export async function handleDataExportCommand(
  message: Message,
  command: ExportCommand,
  args: string[],
  language: Language,
  prefix: string,
  fetchPage: (url: string) => Promise<PublicPageSnapshot> = fetchPublicPage,
): Promise<void> {
  const input = args.join(" ").trim().replace(/^<|>$/g, "").replace(/^['"]|['"]$/g, "");
  if (!input) {
    await message.reply(usageText(command, prefix, language));
    return;
  }
  try {
    validatePublicHttpsUrl(input);
  } catch (error) {
    await message.reply(errorReplyText(error, language));
    return;
  }
  if (activeExports >= DATA_EXPORT_LIMITS.maxConcurrentExports) {
    await message.reply(language === "fr" ? "⏳ Trop d’exports sont en cours. Réessaie dans un instant." : "⏳ Too many exports are running. Try again shortly.");
    return;
  }
  const remainingCooldown = checkRateLimit(message.author.id, Date.now());
  if (remainingCooldown !== null) {
    await message.reply(language === "fr"
      ? `⏳ Attends encore ${remainingCooldown} s avant un autre export.`
      : `⏳ Wait ${remainingCooldown}s before starting another export.`);
    return;
  }

  activeExports += 1;
  try {
    if (isSendable(message.channel)) await message.channel.sendTyping().catch(() => undefined);
    const page = await fetchPage(input);
    if (command === "excel") {
      const tables = extractPageTables(page.html);
      if (!tables.length) throw new PageFetchError("no_tables");
      const buffer = await createExcelWorkbook(page, tables);
      const filename = safeFilename(page.title, "xlsx");
      await message.reply({
        content: fileReplyText("excel", language, page.title, tables.length),
        files: [new AttachmentBuilder(buffer, { name: filename })],
        allowedMentions: { parse: [] },
      });
      return;
    }

    const buffer = await createPagePdf(page);
    const filename = safeFilename(page.title, "pdf");
    await message.reply({
      content: fileReplyText("pdf", language, page.title),
      files: [new AttachmentBuilder(buffer, { name: filename })],
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    await message.reply(errorReplyText(error, language)).catch(() => null);
  } finally {
    activeExports -= 1;
  }
}
