import { mkdir } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  ARABIC_QUIZ,
  CLASSES,
  ENGLISH_QUIZ,
  FAMILY_NAMES,
  FIRST_NAMES,
  MATH_QUIZ,
  SAMPLE_FILES,
  STUDENT_PASSWORD,
  STUDENTS_PER_CLASS,
  TEACHER_PASSWORD,
  TEACHERS,
  type SampleQuestion,
} from "./sample-content";

const OUTPUT_DIR = path.resolve("sample-data");
const FAMILY_STRIDE = 7;

async function writeSheet(fileName: string, header: string[], rows: (string | number)[][]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(header).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));
  sheet.columns.forEach((column) => {
    column.width = 24;
  });
  await workbook.xlsx.writeFile(path.join(OUTPUT_DIR, fileName));
}

const usernameFrom = (first: string, family: string) =>
  `${first}.${family.replace(/^Al-/, "").replace(/\s+/g, "")}`.toLowerCase();

function buildStudents(): (string | number)[][] {
  const taken = new Set<string>();
  return CLASSES.flatMap((className, classIndex) =>
    Array.from({ length: STUDENTS_PER_CLASS }, (_, i) => {
      const n = classIndex * STUDENTS_PER_CLASS + i;
      const [firstAr, firstEn] = FIRST_NAMES[n % FIRST_NAMES.length]!;
      const [familyAr, familyEn] = FAMILY_NAMES[(n * FAMILY_STRIDE) % FAMILY_NAMES.length]!;
      const base = usernameFrom(firstEn, familyEn);
      const username = taken.has(base) ? `${base}${n}` : base;
      taken.add(username);
      return [username, STUDENT_PASSWORD, `${firstAr} ${familyAr}`, `${firstEn} ${familyEn}`, className];
    }),
  );
}

const questionRows = (questions: SampleQuestion[]) =>
  questions.map(([text, points, [a, b, c, d], correct]) => [text, points, a, b, c, d, correct]);

const QUESTION_HEADER = ["question", "points", "option_a", "option_b", "option_c", "option_d", "correct"];

await mkdir(OUTPUT_DIR, { recursive: true });
await writeSheet(SAMPLE_FILES.students, ["username", "password", "full_name", "full_name_latin", "class"], buildStudents());
await writeSheet(
  SAMPLE_FILES.teachers,
  ["username", "password", "full_name"],
  TEACHERS.map((t) => [t.username, TEACHER_PASSWORD, t.fullName]),
);
await writeSheet(SAMPLE_FILES.englishQuiz, QUESTION_HEADER, questionRows(ENGLISH_QUIZ));
await writeSheet(SAMPLE_FILES.arabicQuiz, QUESTION_HEADER, questionRows(ARABIC_QUIZ));
await writeSheet(SAMPLE_FILES.mathQuiz, QUESTION_HEADER, questionRows(MATH_QUIZ));
console.log(`Sample spreadsheets written to ${OUTPUT_DIR}`);
