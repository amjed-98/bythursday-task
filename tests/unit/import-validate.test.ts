import { describe, expect, it } from "vitest";
import { QUESTION_IMPORT, STUDENT_IMPORT } from "@/domain/import/schemas";
import { validateRows } from "@/domain/import/validate";

const row = (rowNumber: number, values: Record<string, string>) => ({ rowNumber, values });

const student = (overrides: Record<string, string> = {}) => ({
  username: "sara.k",
  password: "secret1",
  full_name: "سارة خليل",
  full_name_latin: "Sara Khalil",
  class: "10A",
  ...overrides,
});

const question = (overrides: Record<string, string> = {}) => ({
  question: "2 + 2 = ?",
  points: "2",
  option_a: "3",
  option_b: "4",
  option_c: "5",
  option_d: "6",
  correct: "b",
  ...overrides,
});

describe("validateRows for students", () => {
  it("returns parsed rows when every row is valid", () => {
    const result = validateRows([row(2, student())], STUDENT_IMPORT);

    expect(result).toEqual({
      ok: true,
      rows: [{ username: "sara.k", password: "secret1", fullName: "سارة خليل", fullNameLatin: "Sara Khalil", className: "10A" }],
    });
  });

  it("reports a missing required column against the header row", () => {
    const withoutClass = Object.fromEntries(Object.entries(student()).filter(([key]) => key !== "class"));

    const result = validateRows([row(2, withoutClass)], STUDENT_IMPORT);

    expect(result).toEqual({ ok: false, errors: [{ row: 1, message: "Missing column: class" }] });
  });

  it("reports the row number and reason for an invalid row", () => {
    const result = validateRows([row(2, student()), row(3, student({ username: "has space" }))], STUDENT_IMPORT);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toEqual([
      { row: 3, message: "username: use letters, digits, dot, dash or underscore only" },
    ]);
  });

  it("reports duplicate usernames within the file", () => {
    const result = validateRows([row(2, student()), row(3, student({ username: "SARA.K" }))], STUDENT_IMPORT);

    expect(!result.ok && result.errors).toEqual([{ row: 3, message: 'Duplicate username "sara.k" (first seen on row 2)' }]);
  });

  it("lowercases usernames so logins are case-insensitive", () => {
    const result = validateRows([row(2, student({ username: "Sara.K" }))], STUDENT_IMPORT);

    expect(result.ok && result.rows[0]?.username).toBe("sara.k");
  });

  it("reports an empty file", () => {
    expect(validateRows([], STUDENT_IMPORT)).toEqual({ ok: false, errors: [{ row: 1, message: "The file has no data rows" }] });
  });
});

describe("validateRows for quiz questions", () => {
  it("maps the correct letter to an option index", () => {
    const result = validateRows([row(2, question())], QUESTION_IMPORT);

    expect(result.ok && result.rows[0]).toEqual({ text: "2 + 2 = ?", points: 2, options: ["3", "4", "5", "6"], correctIndex: 1 });
  });

  it("rejects a correct answer outside A to D", () => {
    const result = validateRows([row(2, question()), row(3, question({ correct: "E" }))], QUESTION_IMPORT);

    expect(!result.ok && result.errors).toEqual([{ row: 3, message: "correct: must be A, B, C or D" }]);
  });

  it("rejects zero or non-numeric points", () => {
    const result = validateRows([row(4, question({ points: "abc" }))], QUESTION_IMPORT);

    expect(!result.ok && result.errors[0]?.row).toBe(4);
  });

  it("collects errors from several rows at once", () => {
    const result = validateRows(
      [row(2, question({ option_c: "" })), row(3, question()), row(4, question({ question: "" }))],
      QUESTION_IMPORT,
    );

    expect(!result.ok && result.errors.map((e) => e.row)).toEqual([2, 4]);
  });
});
