import { classes, options, questions, quizClasses, quizzes, users, type Role } from "@/db/schema";
import type { Actor } from "@/server/actor";
import { testDb } from "./setup";

const HOUR_MS = 3_600_000;
export const NOW = new Date("2026-09-23T08:00:00Z");
export const hoursFrom = (base: Date, hours: number) => new Date(base.getTime() + hours * HOUR_MS);
export const minutesFrom = (base: Date, minutes: number) => new Date(base.getTime() + minutes * 60_000);

let sequence = 0;

export async function createClass(name = `C${++sequence}`): Promise<number> {
  const [row] = await testDb.insert(classes).values({ name }).returning({ id: classes.id });
  return row!.id;
}

export async function createUser(role: Role, classId: number | null = null): Promise<Actor> {
  const n = ++sequence;
  const [row] = await testDb
    .insert(users)
    .values({ username: `${role}${n}`, passwordHash: "x", role, fullName: `${role} ${n}`, classId })
    .returning({ id: users.id });
  return { id: row!.id, role, classId };
}

export type QuizFixture = {
  quizId: number;
  questions: { id: number; points: number; correctOptionId: number; wrongOptionId: number }[];
};

type QuizOverrides = {
  classIds: number[];
  teacherId: number;
  opensAt?: Date;
  closesAt?: Date;
  timeLimitMinutes?: number;
  penaltyPercent?: number;
  points?: number[];
};

export async function createQuiz(overrides: QuizOverrides): Promise<QuizFixture> {
  const [quiz] = await testDb
    .insert(quizzes)
    .values({
      teacherId: overrides.teacherId,
      title: `Quiz ${++sequence}`,
      timeLimitMinutes: overrides.timeLimitMinutes ?? 20,
      opensAt: overrides.opensAt ?? hoursFrom(NOW, -1),
      closesAt: overrides.closesAt ?? hoursFrom(NOW, 24),
      penaltyPercent: overrides.penaltyPercent ?? 0,
    })
    .returning({ id: quizzes.id });
  const quizId = quiz!.id;
  await testDb.insert(quizClasses).values(overrides.classIds.map((classId) => ({ quizId, classId })));

  const created: QuizFixture["questions"] = [];
  for (const [index, points] of (overrides.points ?? [1, 2, 3]).entries()) {
    const [question] = await testDb
      .insert(questions)
      .values({ quizId, position: index + 1, text: `Question ${index + 1}`, points })
      .returning({ id: questions.id });
    const optionRows = await testDb
      .insert(options)
      .values(
        [0, 1, 2, 3].map((position) => ({
          questionId: question!.id,
          position,
          text: `Option ${position}`,
          isCorrect: position === 0,
        })),
      )
      .returning({ id: options.id, isCorrect: options.isCorrect });
    created.push({
      id: question!.id,
      points,
      correctOptionId: optionRows.find((o) => o.isCorrect)!.id,
      wrongOptionId: optionRows.find((o) => !o.isCorrect)!.id,
    });
  }
  return { quizId, questions: created };
}

export async function createStandardSetup(quizOverrides: Partial<QuizOverrides> = {}) {
  const classId = await createClass();
  const otherClassId = await createClass();
  const teacher = await createUser("teacher");
  const student = await createUser("student", classId);
  const quiz = await createQuiz({ classIds: [classId], teacherId: teacher.id, ...quizOverrides });
  return { classId, otherClassId, teacher, student, quiz };
}
