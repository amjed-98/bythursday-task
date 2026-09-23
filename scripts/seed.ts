import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { createDb, type Db } from "../src/db/client";
import { answers, attempts, classes, quizzes, users } from "../src/db/schema";
import { parseSpreadsheet } from "../src/domain/import/parse-file";
import { hashPassword } from "../src/lib/password";
import type { Actor } from "../src/server/actor";
import { submitAttempt } from "../src/server/attempts";
import { importUsers, questionsFromRows, type UserImportKind } from "../src/server/imports";
import { loadQuestionsWithOptions } from "../src/server/quiz-access";
import { createQuiz } from "../src/server/quizzes";
import { SAMPLE_FILES } from "./sample-content";

const SAMPLE_DIR = path.resolve("sample-data");
const ADMIN = { username: "admin", password: "admin123", fullName: "نور (Nour) — Admin" };
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

type SampleQuiz = {
  file: string;
  title: string;
  teacher: string;
  classes: string[];
  timeLimitMinutes: number;
  penaltyPercent: number;
  opensInDays: number;
  closesInDays: number;
  seedPastAttempts?: boolean;
};

const SAMPLE_QUIZZES: SampleQuiz[] = [
  {
    file: SAMPLE_FILES.englishQuiz,
    title: "English Vocabulary — Unit 3",
    teacher: "t.rana",
    classes: ["10A", "10B"],
    timeLimitMinutes: 20,
    penaltyPercent: 0,
    opensInDays: -1,
    closesInDays: 30,
  },
  {
    file: SAMPLE_FILES.arabicQuiz,
    title: "قواعد اللغة العربية — الوحدة الأولى",
    teacher: "t.khaled",
    classes: ["10A", "10B", "11A"],
    timeLimitMinutes: 20,
    penaltyPercent: 25,
    opensInDays: -1,
    closesInDays: 30,
  },
  {
    file: SAMPLE_FILES.mathQuiz,
    title: "Algebra Basics — Week 2",
    teacher: "t.huda",
    classes: ["10A", "11A"],
    timeLimitMinutes: 20,
    penaltyPercent: 50,
    opensInDays: -10,
    closesInDays: -3,
    seedPastAttempts: true,
  },
];

const systemAdmin = (id: number): Actor => ({ id, role: "admin", classId: null });

/** mulberry32: tiny deterministic PRNG so re-seeding produces the same past attempts. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

async function readSample(file: string) {
  return parseSpreadsheet(await readFile(path.join(SAMPLE_DIR, file)), file);
}

async function ensureAdmin(db: Db): Promise<number> {
  await db
    .insert(users)
    .values({ username: ADMIN.username, passwordHash: await hashPassword(ADMIN.password), role: "admin", fullName: ADMIN.fullName })
    .onConflictDoNothing({ target: users.username });
  const [admin] = await db.select().from(users).where(eq(users.username, ADMIN.username));
  return admin!.id;
}

const ROLE_OF_KIND = { students: "student", teachers: "teacher" } as const;

/** Skips once that role exists: hashing 60 passwords on every `docker compose up` is slow and changes nothing. */
async function importSampleUsers(db: Db, admin: Actor, kind: UserImportKind, file: string): Promise<void> {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.role, ROLE_OF_KIND[kind])).limit(1);
  if (existing) {
    console.log(`  ${kind}: already present, skipped`);
    return;
  }
  const outcome = await importUsers(db, admin, kind, await readSample(file));
  if (!outcome.ok) throw new Error(`Sample ${file} failed validation: ${JSON.stringify(outcome.errors)}`);
  console.log(`  ${kind}: ${outcome.summary.created} created, ${outcome.summary.updated} updated`);
}

async function findUser(db: Db, username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) throw new Error(`Seed user ${username} is missing`);
  return user;
}

async function ensureQuiz(db: Db, sample: SampleQuiz, now: Date): Promise<number> {
  const teacher = await findUser(db, sample.teacher);
  const [existing] = await db
    .select({ id: quizzes.id })
    .from(quizzes)
    .where(and(eq(quizzes.teacherId, teacher.id), eq(quizzes.title, sample.title)));
  if (existing) {
    console.log(`  quiz "${sample.title}" already exists`);
    return existing.id;
  }

  const questions = questionsFromRows(await readSample(sample.file));
  if (!questions.ok) throw new Error(`Sample ${sample.file} failed validation: ${JSON.stringify(questions.errors)}`);
  const classRows = await db.select().from(classes).where(inArray(classes.name, sample.classes));

  const quizId = await createQuiz(db, { id: teacher.id, role: "teacher", classId: null }, {
    title: sample.title,
    classIds: classRows.map((c) => c.id),
    timeLimitMinutes: sample.timeLimitMinutes,
    penaltyPercent: sample.penaltyPercent,
    opensAt: new Date(now.getTime() + sample.opensInDays * DAY_MS),
    closesAt: new Date(now.getTime() + sample.closesInDays * DAY_MS),
    questions: questions.summary,
  });
  console.log(`  quiz "${sample.title}" created`);
  return quizId;
}

type Behaviour = "skip" | "expire" | "submit";

function pickBehaviour(random: () => number): Behaviour {
  const roll = random();
  if (roll < 0.15) return "skip";
  if (roll < 0.25) return "expire";
  return "submit";
}

/** Past attempts go through submitAttempt so seeded scores use the real scoring rules. */
async function seedPastAttempts(db: Db, quizId: number, classNames: string[]): Promise<void> {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
  const questionList = await loadQuestionsWithOptions(db, quizId);
  const students = await db
    .select({ id: users.id, classId: users.classId })
    .from(users)
    .innerJoin(classes, eq(classes.id, users.classId))
    .where(and(eq(users.role, "student"), inArray(classes.name, classNames)));

  let created = 0;
  for (const student of students) {
    const random = seededRandom(student.id * 7919 + quizId);
    const behaviour = pickBehaviour(random);
    if (behaviour === "skip") continue;

    const startedAt = new Date(quiz!.opensAt.getTime() + Math.floor(random() * 3 * DAY_MS));
    const deadline = new Date(startedAt.getTime() + quiz!.timeLimitMinutes * MINUTE_MS);
    const [attempt] = await db
      .insert(attempts)
      .values({ studentId: student.id, quizId, startedAt, deadline, status: "in_progress" })
      .onConflictDoNothing({ target: [attempts.studentId, attempts.quizId] })
      .returning({ id: attempts.id });
    if (!attempt) continue;

    const answered = behaviour === "expire" ? questionList.slice(0, Math.floor(questionList.length / 2)) : questionList;
    const answerRows = answered.flatMap((question) => {
      const roll = random();
      if (roll < 0.1) return [];
      const correct = question.options.find((o) => o.isCorrect)!;
      const wrong = question.options.filter((o) => !o.isCorrect);
      const option = roll < 0.72 ? correct : wrong[Math.floor(random() * wrong.length)]!;
      return [{ attemptId: attempt.id, questionId: question.id, optionId: option.id, answeredAt: startedAt }];
    });
    if (answerRows.length > 0) await db.insert(answers).values(answerRows);

    const finishedAt =
      behaviour === "expire" ? new Date(deadline.getTime() + MINUTE_MS) : new Date(startedAt.getTime() + (8 + Math.floor(random() * 11)) * MINUTE_MS);
    await submitAttempt(db, { id: student.id, role: "student", classId: student.classId }, attempt.id, finishedAt);
    created += 1;
  }
  console.log(`  past attempts: ${created} created`);
}

async function seed(url: string): Promise<void> {
  const { db, close } = createDb(url, 5);
  try {
    const now = new Date();
    console.log("Seeding…");
    const admin = systemAdmin(await ensureAdmin(db));
    await importSampleUsers(db, admin, "teachers", SAMPLE_FILES.teachers);
    await importSampleUsers(db, admin, "students", SAMPLE_FILES.students);
    for (const sample of SAMPLE_QUIZZES) {
      const quizId = await ensureQuiz(db, sample, now);
      if (sample.seedPastAttempts) await seedPastAttempts(db, quizId, sample.classes);
    }
    console.log("Seed complete");
  } finally {
    await close();
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
await seed(databaseUrl);
