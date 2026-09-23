import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseSpreadsheet } from "@/domain/import/parse-file";

async function xlsxBuffer(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("parseSpreadsheet (xlsx)", () => {
  it("reads rows keyed by normalised header with spreadsheet row numbers", async () => {
    const buffer = await xlsxBuffer([["Username", "Full Name"], ["sara", "سارة"]]);

    const rows = await parseSpreadsheet(buffer, "students.xlsx");

    expect(rows).toEqual([{ rowNumber: 2, values: { username: "sara", full_name: "سارة" } }]);
  });

  it("turns numeric cells into plain strings", async () => {
    const buffer = await xlsxBuffer([["username", "points"], [1042, 2]]);

    const rows = await parseSpreadsheet(buffer, "q.xlsx");

    expect(rows[0]?.values).toEqual({ username: "1042", points: "2" });
  });

  it("flattens rich text cells", async () => {
    const buffer = await xlsxBuffer([
      ["question"],
      [{ richText: [{ text: "What is " }, { font: { bold: true }, text: "2+2" }] }],
    ]);

    const rows = await parseSpreadsheet(buffer, "q.xlsx");

    expect(rows[0]?.values.question).toBe("What is 2+2");
  });

  it("skips fully empty rows but keeps numbering of later rows", async () => {
    const buffer = await xlsxBuffer([["username"], ["a"], [], ["b"]]);

    const rows = await parseSpreadsheet(buffer, "s.xlsx");

    expect(rows.map((r) => r.rowNumber)).toEqual([2, 4]);
  });
});

describe("parseSpreadsheet (csv)", () => {
  it("strips a UTF-8 BOM from the first header and keeps Arabic text", async () => {
    const csv = "﻿username,full_name\nomar,عمر الخطيب\n";

    const rows = await parseSpreadsheet(Buffer.from(csv, "utf8"), "students.csv");

    expect(rows).toEqual([{ rowNumber: 2, values: { username: "omar", full_name: "عمر الخطيب" } }]);
  });

  it("handles quoted cells containing commas", async () => {
    const csv = 'question,option_a\n"Pick one, please",yes\n';

    const rows = await parseSpreadsheet(Buffer.from(csv, "utf8"), "q.csv");

    expect(rows[0]?.values.question).toBe("Pick one, please");
  });
});

describe("parseSpreadsheet (other files)", () => {
  it("rejects unsupported file types", async () => {
    await expect(parseSpreadsheet(Buffer.from("x"), "notes.txt")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("rejects a corrupt xlsx file with a readable message", async () => {
    await expect(parseSpreadsheet(Buffer.from("not a zip"), "broken.xlsx")).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
