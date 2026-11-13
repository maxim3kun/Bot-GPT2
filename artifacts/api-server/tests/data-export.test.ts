import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import type { Message } from "discord.js";
import {
  createExcelWorkbook,
  createPagePdf,
  createPublicPageFetcher,
  DATA_EXPORT_LIMITS,
  extractPageTables,
  extractPageTextBlocks,
  handleDataExportCommand,
  isPublicAddress,
  isDataExportCommand,
  PageFetchError,
  validatePublicHttpsUrl,
  type PublicPageSnapshot,
} from "../src/discord/data-export.js";

const publicAddress = [{ address: "8.8.8.8", family: 4 as const }];

function page(html: string): PublicPageSnapshot {
  return {
    url: "https://example.org/report",
    title: "Rapport public",
    html,
    retrievedAt: new Date("2026-11-13T12:00:00.000Z"),
  };
}

test("Only HTTPS public hostnames are accepted; private, local and credentialed URLs are rejected", () => {
  assert.equal(validatePublicHttpsUrl("https://example.org/public").hostname, "example.org");
  for (const address of [
    "http://example.org",
    "https://localhost/",
    "https://api.internal/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://user:password@example.org/",
    "https://example.org:8443/",
  ]) {
    assert.throws(() => validatePublicHttpsUrl(address), PageFetchError);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  for (const address of ["0.0.0.0", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1", "172.16.0.1", "192.168.1.1", "192.0.2.1", "::1", "fc00::1", "fe80::1", "2001:db8::1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test("Public page fetch pins DNS results, follows only a few safe redirects, and records the final source", async () => {
  const requested: string[] = [];
  const fetchPage = createPublicPageFetcher({
    resolveHost: async () => publicAddress,
    requestPage: async (url) => {
      requested.push(url.toString());
      if (url.pathname === "/start") return { status: 302, location: "/final", body: Buffer.alloc(0) };
      return {
        status: 200,
        contentType: "text/html; charset=utf-8",
        contentEncoding: "identity",
        body: Buffer.from("<title>Rapport</title><main><p>Donnée vérifiée</p></main>"),
      };
    },
    now: () => new Date("2026-11-13T12:00:00.000Z"),
  });
  const result = await fetchPage("https://example.org/start");
  assert.deepEqual(requested, ["https://example.org/start", "https://example.org/final"]);
  assert.equal(result.url, "https://example.org/final");
  assert.equal(result.title, "Rapport");
  assert.equal(result.retrievedAt.toISOString(), "2026-11-13T12:00:00.000Z");
});

test("Redirects to private hosts, non-HTML responses, and oversized pages fail without bypasses", async () => {
  const privateRedirect = createPublicPageFetcher({
    resolveHost: async () => publicAddress,
    requestPage: async () => ({ status: 302, location: "https://127.0.0.1/admin", body: Buffer.alloc(0) }),
  });
  await assert.rejects(privateRedirect("https://example.org"), { code: "private_address" });

  const imageResponse = createPublicPageFetcher({
    resolveHost: async () => publicAddress,
    requestPage: async () => ({ status: 200, contentType: "image/png", body: Buffer.from("png") }),
  });
  await assert.rejects(imageResponse("https://example.org"), { code: "not_html" });

  const oversizedResponse = createPublicPageFetcher({
    resolveHost: async () => publicAddress,
    requestPage: async () => ({
      status: 200,
      contentType: "text/html",
      body: Buffer.alloc(DATA_EXPORT_LIMITS.maxHtmlBytes + 1),
    }),
  });
  await assert.rejects(oversizedResponse("https://example.org"), { code: "too_large" });

  const protectedPage = createPublicPageFetcher({
    resolveHost: async () => publicAddress,
    requestPage: async () => ({ status: 403, contentType: "text/html", body: Buffer.from("sign in") }),
  });
  await assert.rejects(protectedPage("https://example.org"), { code: "http" });

  let redirects = 0;
  const redirectLoop = createPublicPageFetcher({
    resolveHost: async () => publicAddress,
    requestPage: async (url) => {
      redirects += 1;
      return { status: 302, location: `${url.pathname}/next`, body: Buffer.alloc(0) };
    },
  });
  await assert.rejects(redirectLoop("https://example.org"), { code: "redirect" });
  assert.equal(redirects, DATA_EXPORT_LIMITS.maxRedirects + 1);
});

test("Excel extracts only real HTML table values and includes source and collection time", async () => {
  const tables = extractPageTables(`
    <table>
      <thead><tr><th>Ville</th><th>Population</th></tr></thead>
      <tbody><tr><td>Beauvais</td><td>56 000</td></tr><tr><td>Amiens</td><td>=HYPERLINK("https://bad.test")</td></tr></tbody>
    </table>`);
  assert.equal(tables.length, 1);
  assert.deepEqual(tables[0]!.headers, ["Ville", "Population"]);
  assert.deepEqual(tables[0]!.rows[0], ["Beauvais", "56 000"]);
  assert.ok(tables[0]!.rows[1]![1]!.startsWith("'="));

  const largeTable = `<table><tr><th>Index</th></tr>${Array.from({ length: DATA_EXPORT_LIMITS.maxRowsPerTable + 5 }, (_, index) => `<tr><td>${index}</td></tr>`).join("")}</table>`;
  const bounded = extractPageTables(largeTable)[0]!;
  assert.equal(bounded.rows.length, DATA_EXPORT_LIMITS.maxRowsPerTable);
  assert.equal(bounded.truncated, true);
  const overlongCell = extractPageTables(`<table><tr><th>Valeur</th></tr><tr><td>${"x".repeat(DATA_EXPORT_LIMITS.maxCellCharacters + 1)}</td></tr></table>`)[0]!;
  assert.equal(overlongCell.rows[0]![0]!.length, DATA_EXPORT_LIMITS.maxCellCharacters);
  assert.equal(overlongCell.truncated, true);
  const extraTables = extractPageTables(Array.from({ length: DATA_EXPORT_LIMITS.maxTables + 1 }, (_, index) =>
    `<table><tr><th>Table ${index}</th></tr><tr><td>${index}</td></tr></table>`).join(""));
  assert.equal(extraTables.length, DATA_EXPORT_LIMITS.maxTables);
  assert.equal(extraTables.at(-1)?.omittedTables, 1);
  const cappedWorkbook = await createExcelWorkbook(page(""), extraTables);
  const cappedBook = new ExcelJS.Workbook();
  await cappedBook.xlsx.load(cappedWorkbook);
  assert.ok(cappedBook.getWorksheet("Source")!.getSheetValues().some((row) =>
    Array.isArray(row) && row.some((cell) => String(cell).includes("omis au-delà de la limite"))));
  assert.deepEqual(extractPageTables("<main><p>No table</p></main>"), []);

  const output = await createExcelWorkbook(page("<title>Rapport</title>"), tables);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(output);
  assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Source", "Données"]);
  assert.equal(workbook.getWorksheet("Données")!.getCell("A2").value, "Beauvais");
  assert.equal(workbook.getWorksheet("Source")!.getCell("B3").value, "https://example.org/report");
  assert.equal(workbook.getWorksheet("Source")!.getCell("B4").value, "2026-11-13T12:00:00.000Z");
  assert.equal(workbook.getWorksheet("Données")!.views[0]?.state, "frozen");
});

test("PDF extraction omits scripts and navigation, preserves text, and creates a bounded PDF", async () => {
  const html = `
    <html><head><title>Page test</title><script>privateScript()</script></head>
    <body><nav>Menu à ignorer</nav><main><h1>Horaires</h1><p>Le train arrive à 18 h 30.</p>
    <table><tr><th>Départ</th><th>Arrivée</th></tr><tr><td>18:00</td><td>18:30</td></tr></table></main></body></html>`;
  const blocks = extractPageTextBlocks(html);
  assert.ok(blocks.some((block) => block.text.includes("Horaires")));
  assert.ok(blocks.some((block) => block.text.includes("18:00")));
  assert.equal(blocks.some((block) => block.text.includes("privateScript")), false);
  assert.equal(blocks.some((block) => block.text.includes("Menu à ignorer")), false);

  const output = await createPagePdf(page(html));
  assert.ok(output.subarray(0, 5).toString("ascii").startsWith("%PDF-"));
  assert.ok(output.length < DATA_EXPORT_LIMITS.maxOutputBytes);
  await assert.rejects(createPagePdf(page("<main></main>")), { code: "no_content" });
});

test("Discord export commands attach files, reject empty input and respect the user cooldown", async () => {
  assert.equal(isDataExportCommand("excel"), true);
  assert.equal(isDataExportCommand("pdf"), true);
  assert.equal(isDataExportCommand("ask"), false);
  const makeMessage = (userId: string, replies: Array<string | Record<string, unknown>>) => ({
    author: { id: userId },
    reply: async (reply: string | Record<string, unknown>) => { replies.push(reply); return {}; },
  } as unknown as Message);
  const fetchPage = async () => page(`
    <table><tr><th>Nom</th></tr><tr><td>Source réelle</td></tr></table>
    <main><h1>Rapport public</h1><p>Données vérifiées.</p></main>`);

  const replies: Array<string | Record<string, unknown>> = [];
  const message = makeMessage("export-test-user", replies);
  await handleDataExportCommand(message, "excel", [], "fr", "!", fetchPage);
  assert.match(String(replies.at(-1)), /Utilisation/);
  await handleDataExportCommand(message, "excel", ["https://example.org/report"], "fr", "!", fetchPage);
  const attachmentReply = replies.at(-1) as { files?: Array<{ attachment?: Buffer }> };
  assert.ok(attachmentReply.files?.length);
  assert.match(String((attachmentReply as { content?: string }).content), /Classeur créé/);

  const pdfReplies: Array<string | Record<string, unknown>> = [];
  const pdfMessage = makeMessage("pdf-export-test-user", pdfReplies);
  await handleDataExportCommand(pdfMessage, "pdf", ["https://example.org/report"], "fr", "!", fetchPage);
  const pdfReply = pdfReplies.at(-1) as { files?: unknown[]; content?: string };
  assert.ok(pdfReply.files?.length);
  assert.match(pdfReply.content ?? "", /Copie PDF lisible/);
  await handleDataExportCommand(pdfMessage, "pdf", ["https://example.org/report"], "fr", "!", fetchPage);
  const cooldownReply = pdfReplies.at(-1);
  assert.match(typeof cooldownReply === "string" ? cooldownReply : String(cooldownReply?.content), /Attends encore/);

  const emptyReplies: Array<string | Record<string, unknown>> = [];
  const emptyMessage = makeMessage("export-empty-table-user", emptyReplies);
  await handleDataExportCommand(emptyMessage, "excel", ["https://example.org/no-table"], "fr", "!", async () => page("<main><p>Aucune table</p></main>"));
  const emptyReply = emptyReplies.at(-1);
  assert.match(typeof emptyReply === "string" ? emptyReply : String(emptyReply?.content), /Aucun tableau/);
});
