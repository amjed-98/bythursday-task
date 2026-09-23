import { z } from "zod";
import type { QuestionInput } from "@/domain/quiz-input";

export type ImportSpec<T> = {
  requiredColumns: readonly string[];
  schema: z.ZodType<T, Record<string, string | undefined>>;
  uniqueKey?: { label: string; of: (row: T) => string };
};

const MIN_PASSWORD_LENGTH = 6;
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

const required = (max: number) => z.string({ error: "is required" }).trim().min(1, "is required").max(max, `must be at most ${max} characters`);

const username = required(50)
  .toLowerCase()
  .regex(/^[a-z0-9._-]+$/, "use letters, digits, dot, dash or underscore only");

const optionalPassword = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || value.length >= MIN_PASSWORD_LENGTH, `must be at least ${MIN_PASSWORD_LENGTH} characters`);

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => value || null);

export type StudentImportRow = {
  username: string;
  password: string | null;
  fullName: string;
  fullNameLatin: string | null;
  className: string;
};

export type TeacherImportRow = Omit<StudentImportRow, "className" | "fullNameLatin">;

export const STUDENT_IMPORT: ImportSpec<StudentImportRow> = {
  requiredColumns: ["username", "full_name", "class"],
  schema: z
    .object({
      username,
      password: optionalPassword,
      full_name: required(200),
      full_name_latin: optionalText,
      class: required(20),
    })
    .transform((row) => ({
      username: row.username,
      password: row.password,
      fullName: row.full_name,
      fullNameLatin: row.full_name_latin,
      className: row.class,
    })),
  uniqueKey: { label: "username", of: (row) => row.username },
};

export const TEACHER_IMPORT: ImportSpec<TeacherImportRow> = {
  requiredColumns: ["username", "full_name"],
  schema: z
    .object({ username, password: optionalPassword, full_name: required(200) })
    .transform((row) => ({ username: row.username, password: row.password, fullName: row.full_name })),
  uniqueKey: { label: "username", of: (row) => row.username },
};

const letterToIndex = (letter: string) => OPTION_LETTERS.indexOf(letter as (typeof OPTION_LETTERS)[number]);

export const QUESTION_IMPORT: ImportSpec<QuestionInput> = {
  requiredColumns: ["question", "points", "option_a", "option_b", "option_c", "option_d", "correct"],
  schema: z
    .object({
      question: required(2000),
      points: z
        .string({ error: "is required" })
        .trim()
        .regex(/^\d+$/, "must be a whole number")
        .transform(Number)
        .pipe(z.number().min(1, "must be at least 1").max(100, "must be at most 100")),
      option_a: required(500),
      option_b: required(500),
      option_c: required(500),
      option_d: required(500),
      correct: z
        .string({ error: "is required" })
        .trim()
        .toUpperCase()
        .refine((value) => letterToIndex(value) >= 0, "must be A, B, C or D"),
    })
    .transform((row) => ({
      text: row.question,
      points: row.points,
      options: [row.option_a, row.option_b, row.option_c, row.option_d] as QuestionInput["options"],
      correctIndex: letterToIndex(row.correct),
    })),
};
