import ExcelJS from "exceljs";
import Papa from "papaparse";
import { DomainError } from "@/domain/errors";

export type RawRow = { rowNumber: number; values: Record<string, string> };

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const HEADER_ROW_NUMBER = 1;
const BOM = /^﻿/;

const normaliseHeader = (header: string) =>
  header.replace(BOM, "").trim().toLowerCase().replace(/[\s-]+/g, "_");

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
  if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
  if ("text" in value) return String(value.text).trim();
  return "";
}

function toRawRows(headers: string[], dataRows: { rowNumber: number; cells: string[] }[]): RawRow[] {
  return dataRows
    .filter(({ cells }) => cells.some((cell) => cell !== ""))
    .map(({ rowNumber, cells }) => ({
      rowNumber,
      values: Object.fromEntries(
        headers.flatMap((header, i) => (header ? [[header, cells[i] ?? ""] as const] : [])),
      ),
    }));
}

async function parseXlsx(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new DomainError("VALIDATION", "Could not read the file as an Excel workbook (.xlsx)");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new DomainError("VALIDATION", "The workbook has no sheets");

  const columnCount = sheet.getRow(HEADER_ROW_NUMBER).cellCount;
  const readCells = (row: ExcelJS.Row) =>
    Array.from({ length: columnCount }, (_, i) => cellToString(row.getCell(i + 1).value));

  const headers = readCells(sheet.getRow(HEADER_ROW_NUMBER)).map(normaliseHeader);
  const dataRows: { rowNumber: number; cells: string[] }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > HEADER_ROW_NUMBER) dataRows.push({ rowNumber, cells: readCells(row) });
  });
  return toRawRows(headers, dataRows);
}

function parseCsv(buffer: Buffer): RawRow[] {
  const text = buffer.toString("utf8").replace(BOM, "");
  const { data } = Papa.parse<string[]>(text, { skipEmptyLines: false });
  const [headerCells = [], ...rest] = data;
  const headers = headerCells.map(normaliseHeader);
  return toRawRows(
    headers,
    rest.map((cells, i) => ({ rowNumber: i + HEADER_ROW_NUMBER + 1, cells: cells.map((c) => c.trim()) })),
  );
}

export async function parseSpreadsheet(buffer: Buffer, fileName: string): Promise<RawRow[]> {
  if (buffer.byteLength > MAX_IMPORT_BYTES) throw new DomainError("VALIDATION", "The file is larger than 2 MB");
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "xlsx") return parseXlsx(buffer);
  if (extension === "csv") return parseCsv(buffer);
  throw new DomainError("VALIDATION", "Upload an .xlsx or .csv file");
}
