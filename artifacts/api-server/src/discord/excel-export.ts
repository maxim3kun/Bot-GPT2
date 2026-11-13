import ExcelJS from "exceljs";
import { JSDOM } from "jsdom";
import {
  cleanText,
  DATA_EXPORT_LIMITS,
  PageFetchError,
  type PublicPageSnapshot,
} from "./public-page-fetcher.js";

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  truncated: boolean;
  omittedTables?: number;
}

interface HtmlElement {
  textContent: string | null;
  querySelectorAll(selector: string): ArrayLike<HtmlElement>;
}

interface HtmlDocument {
  querySelectorAll(selector: string): ArrayLike<HtmlElement>;
}

function parseTable(table: HtmlElement): ExtractedTable | null {
  const allRows = Array.from(table.querySelectorAll("tr"))
    .map((row) => Array.from(row.querySelectorAll(":scope > th, :scope > td"))
      .map((cell) => cleanText(cell.textContent ?? "", DATA_EXPORT_LIMITS.maxHtmlBytes)))
    .filter((row) => row.some(Boolean));
  const extractedRows = allRows.slice(0, DATA_EXPORT_LIMITS.maxRowsPerTable + 1);
  if (extractedRows.length < 2) return null;
  const headers = extractedRows[0]!.slice(0, DATA_EXPORT_LIMITS.maxColumnsPerTable);
  const rows = extractedRows.slice(1).map((row) => row.slice(0, DATA_EXPORT_LIMITS.maxColumnsPerTable));
  const truncated = allRows.length > DATA_EXPORT_LIMITS.maxRowsPerTable + 1
    || allRows.some((row) => row.length > DATA_EXPORT_LIMITS.maxColumnsPerTable
      || row.some((cell) => cell.length > DATA_EXPORT_LIMITS.maxCellCharacters));
  if (!headers.length || !rows.length) return null;

  for (let index = 0; index < headers.length; index += 1) {
    headers[index] = headers[index] || `Column ${index + 1}`;
    headers[index] = headers[index]!.slice(0, DATA_EXPORT_LIMITS.maxCellCharacters);
    if (/^[=+\-@]/.test(headers[index]!)) headers[index] = `'${headers[index]}`;
  }
  const width = headers.length;
  const normalizedRows = rows.map((row) => Array.from({ length: width }, (_, index) => {
    const value = (row[index] ?? "").slice(0, DATA_EXPORT_LIMITS.maxCellCharacters);
    return /^[=+\-@]/.test(value.trim()) ? `'${value}` : value;
  }));
  return { headers: headers.slice(0, width), rows: normalizedRows, truncated };
}

export function extractPageTables(html: string): ExtractedTable[] {
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document as unknown as HtmlDocument;
    const allTables = Array.from(document.querySelectorAll("table"))
      .map(parseTable)
      .filter((table): table is ExtractedTable => table !== null);
    const tables = allTables.slice(0, DATA_EXPORT_LIMITS.maxTables);
    if (tables.length && allTables.length > tables.length) {
      tables[tables.length - 1]!.omittedTables = allTables.length - tables.length;
    }
    return tables;
  } finally {
    dom.window.close();
  }
}

function styleHeader(row: ExcelJS.Row): void {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4655D6" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

export async function createExcelWorkbook(
  page: PublicPageSnapshot,
  tables: ExtractedTable[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MaximeGPT";
  workbook.created = page.retrievedAt;
  workbook.modified = page.retrievedAt;
  workbook.subject = `Données extraites de ${page.url}`;
  workbook.title = page.title.slice(0, 160);

  const source = workbook.addWorksheet("Source");
  source.columns = [{ width: 28 }, { width: 90 }];
  source.addRows([
    ["Information", "Valeur"],
    ["Titre de la page", page.title],
    ["Source", page.url],
    ["Collecté le (UTC)", page.retrievedAt.toISOString()],
    ["Tableaux", String(tables.length)],
    ["Données réelles", "Valeurs extraites directement des tableaux HTML de la page. Aucune donnée manquante n’a été inventée."],
  ]);
  styleHeader(source.getRow(1));
  source.views = [{ state: "frozen", ySplit: 1 }];
  source.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  tables.forEach((table, tableIndex) => {
    const worksheet = workbook.addWorksheet(tables.length === 1 ? "Données" : `Données ${tableIndex + 1}`);
    worksheet.addRow(table.headers);
    styleHeader(worksheet.getRow(1));
    for (const values of table.rows) worksheet.addRow(values);
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: table.rows.length + 1, column: table.headers.length },
    };
    worksheet.columns = table.headers.map((header, columnIndex) => {
      const longest = Math.max(
        header.length,
        ...table.rows.slice(0, 100).map((row) => row[columnIndex]?.length ?? 0),
      );
      return { width: Math.min(42, Math.max(12, longest + 2)), style: { alignment: { vertical: "top", wrapText: true } } };
    });
    if (table.truncated) {
      source.addRow([`Tableau ${tableIndex + 1}`, `Limité à ${DATA_EXPORT_LIMITS.maxRowsPerTable} lignes, ${DATA_EXPORT_LIMITS.maxColumnsPerTable} colonnes et ${DATA_EXPORT_LIMITS.maxCellCharacters} caractères par cellule.`]);
    }
    if (table.omittedTables) {
      source.addRow(["Tableaux supplémentaires", `${table.omittedTables} tableau(x) omis au-delà de la limite de ${DATA_EXPORT_LIMITS.maxTables}.`]);
    }
  });

  const result = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(result);
  if (buffer.length > DATA_EXPORT_LIMITS.maxOutputBytes) throw new PageFetchError("too_large");
  return buffer;
}
