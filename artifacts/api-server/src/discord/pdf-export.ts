import PDFDocument from "pdfkit";
import { JSDOM } from "jsdom";
import {
  cleanText,
  DATA_EXPORT_LIMITS,
  PageFetchError,
  type PublicPageSnapshot,
} from "./public-page-fetcher.js";

export type PdfBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; text: string }
  | { kind: "table"; text: string };

interface HtmlElement {
  tagName: string;
  textContent: string | null;
  querySelectorAll(selector: string): ArrayLike<HtmlElement>;
  querySelector(selector: string): HtmlElement | null;
  closest(selector: string): HtmlElement | null;
  remove(): void;
}

interface HtmlDocument {
  body: HtmlElement;
  querySelectorAll(selector: string): ArrayLike<HtmlElement>;
  querySelector(selector: string): HtmlElement | null;
}

export function extractPageTextBlocks(html: string): PdfBlock[] {
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document as unknown as HtmlDocument;
    Array.from(document.querySelectorAll(
      "script, style, noscript, template, iframe, object, embed, svg, form, nav, footer, aside, button, input, [hidden], [aria-hidden='true']",
    )).forEach((element) => element.remove());
    const root = document.querySelector("main, article") ?? document.body;
    const blocks: PdfBlock[] = [];
    let totalCharacters = 0;
    const selector = "h1, h2, h3, h4, p, li, blockquote, pre, table";
    for (const element of Array.from(root.querySelectorAll(selector))) {
      if (element.tagName !== "LI" && element.closest("li")) continue;
      const tag = element.tagName.toLowerCase();
      let kind: PdfBlock["kind"] = "paragraph";
      let text = "";
      if (/^h[1-4]$/.test(tag)) {
        kind = "heading";
        text = cleanText(element.textContent ?? "", 800);
      } else if (tag === "li") {
        kind = "list";
        text = cleanText(element.textContent ?? "", 1_000);
      } else if (tag === "table") {
        kind = "table";
        text = Array.from(element.querySelectorAll("tr"))
          .slice(0, 80)
          .map((row) => Array.from(row.querySelectorAll(":scope > th, :scope > td"))
            .map((cell) => cleanText(cell.textContent ?? "", 300))
            .join("  | "))
          .filter(Boolean)
          .join("\n");
      } else {
        text = cleanText(element.textContent ?? "", 1_000);
      }
      if (!text) continue;
      const remaining = DATA_EXPORT_LIMITS.maxPdfCharacters - totalCharacters;
      if (remaining <= 0) break;
      text = text.slice(0, remaining);
      totalCharacters += text.length;
      blocks.push({ kind, ...(kind === "heading" ? { level: Number(tag[1]) } : {}), text } as PdfBlock);
    }
    if (!blocks.length) {
      const text = cleanText(root.textContent ?? "", DATA_EXPORT_LIMITS.maxPdfCharacters);
      if (text) blocks.push({ kind: "paragraph", text });
    }
    return blocks;
  } finally {
    dom.window.close();
  }
}

export async function createPagePdf(page: PublicPageSnapshot): Promise<Buffer> {
  const blocks = extractPageTextBlocks(page.html);
  if (!blocks.length) throw new PageFetchError("no_content");
  const chunks: Buffer[] = [];
  let bytes = 0;
  let pageCount = 1;
  const document = new PDFDocument({
    size: "A4",
    margins: { top: 48, bottom: 48, left: 48, right: 48 },
    info: { Title: page.title, Author: "MaximeGPT", Subject: page.url, Creator: "MaximeGPT" },
  });

  const output = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > DATA_EXPORT_LIMITS.maxOutputBytes) {
        document.destroy(new PageFetchError("too_large"));
        return;
      }
      chunks.push(chunk);
    });
    document.on("pageAdded", () => { pageCount += 1; });
    document.on("end", () => {
      if (pageCount > DATA_EXPORT_LIMITS.maxPdfPages) reject(new PageFetchError("pdf_limit"));
      else resolve(Buffer.concat(chunks));
    });
    document.on("error", reject);
  });

  document.font("Helvetica-Bold").fontSize(18).fillColor("#27346B").text(page.title.slice(0, 160));
  document.moveDown(0.4);
  document.font("Helvetica").fontSize(9).fillColor("#555555").text(`Source : ${page.url}`);
  document.text(`Collecté le : ${page.retrievedAt.toISOString()} (UTC)`);
  document.moveDown(0.5);
  document.moveTo(48, document.y).lineTo(547, document.y).strokeColor("#D4D8E8").stroke();
  document.moveDown(0.7);

  for (const block of blocks) {
    if (block.kind === "heading") {
      document.moveDown(0.35);
      document.font("Helvetica-Bold").fontSize(block.level === 1 ? 15 : block.level === 2 ? 13 : 11).fillColor("#27346B");
      document.text(block.text, { paragraphGap: 3 });
    } else if (block.kind === "list") {
      document.font("Helvetica").fontSize(10).fillColor("#202124").text(`• ${block.text}`, { indent: 10, paragraphGap: 4 });
    } else if (block.kind === "table") {
      document.font("Helvetica").fontSize(8.5).fillColor("#202124").text(block.text, { paragraphGap: 2 });
      document.moveDown(0.25);
    } else {
      document.font("Helvetica").fontSize(10).fillColor("#202124").text(block.text, { paragraphGap: 5 });
      document.moveDown(0.25);
    }
  }
  if (pageCount > DATA_EXPORT_LIMITS.maxPdfPages) {
    document.destroy(new PageFetchError("pdf_limit"));
  } else {
    document.end();
  }
  return output;
}
