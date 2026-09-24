import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempts, classes, options, questions, quizClasses, quizzes, users } from "@/db/schema";
import type { Tx } from "@/db/types";
import { DomainError } from "@/domain/errors";
import { quizInputSchema, type QuestionInput, type QuizInput } from "@/domain/quiz-input";
import { assertRole, type Actor } from "./actor";
import { loadQuestionsWithOptions, loadQuizOrThrow, type QuizRow } from "./quiz-access";

export type ClassOption = { id: number; name: string };

export type QuizForEdit = QuizInput & { id: number; teacherId: number; isLocked: boolean };

export type QuizListItem = {
  id: number;
  title: string;
  teacherName: string;
  classNames: string[];
  opensAt: Date;
  closesAt: Date;
  timeLimitMinutes: number;
  penaltyPercent: number;
  questionCount: number;
  attemptCount: number;
};

export function canManageQuiz(actor: Actor, quiz: Pick<QuizRow, "teacherId">): boolean {
  return actor.role === "admin" || (actor.role === "teacher" && quiz.teacherId === actor.id);
}

export async function loadManagedQuiz(db: Db, actor: Actor, quizId: number): Promise<QuizRow> {
  assertRole(actor, ["teacher", "admin"]);
  const quiz = await loadQuizOrThrow(db, quizId);
  if (!canManageQuiz(actor, quiz)) throw new DomainError("FORBIDDEN", "This quiz belongs to another teacher");
  return quiz;
}

export async function listClasses(db: Db): Promise<ClassOption[]> {
  return db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(asc(classes.name));
}

function parseQuizInput(input: QuizInput): QuizInput {
  const parsed = quizInputSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("VALIDATION", parsed.error.issues.map((i) => i.message).join("; "));
  return parsed.data;
}

async function assertClassesExist(tx: Tx, classIds: number[]): Promise<void> {
  const found = await tx.select({ id: classes.id }).from(classes).where(inArray(classes.id, classIds));
  if (found.length !== new Set(classIds).size) throw new DomainError("VALIDATION", "One of the selected classes does not exist");
}

async function insertQuestions(tx: Tx, quizId: number, questionList: QuestionInput[]): Promise<void> {
  const inserted = await tx
    .insert(questions)
    .values(questionList.map((q, i) => ({ quizId, position: i + 1, text: q.text, points: q.points })))
    .returning({ id: questions.id, position: questions.position });

  const optionRows = inserted.flatMap(({ id, position }) => {
    const source = questionList[position - 1]!;
    return source.options.map((text, optionIndex) => ({
      questionId: id,
      position: optionIndex,
      text,
      isCorrect: optionIndex === source.correctIndex,
    }));
  });
  await tx.insert(options).values(optionRows);
}

async function replaceClasses(tx: Tx, quizId: number, classIds: number[]): Promise<void> {
  await tx.delete(quizClasses).where(eq(quizClasses.quizId, quizId));
  await tx.insert(quizClasses).values([...new Set(classIds)].map((classId) => ({ quizId, classId })));
}

export async function createQuiz(db: Db, actor: Actor, rawInput: QuizInput): Promise<number> {
  assertRole(actor, ["teacher"]);
  const input = parseQuizInput(rawInput);

  return db.transaction(async (tx) => {
    await assertClassesExist(tx, input.classIds);
    const [quiz] = await tx
      .insert(quizzes)
      .values({
        teacherId: actor.id,
        title: input.title,
        timeLimitMinutes: input.timeLimitMinutes,
        opensAt: input.opensAt,
        closesAt: input.closesAt,
        penaltyPercent: input.penaltyPercent,
      })
      .returning({ id: quizzes.id });
    const quizId = quiz!.id;
    await replaceClasses(tx, quizId, input.classIds);
    await insertQuestions(tx, quizId, input.questions);
    return quizId;
  });
}

async function hasAttempts(db: Db | Tx, quizId: number): Promise<boolean> {
  const [row] = await db.select({ total: count() }).from(attempts).where(eq(attempts.quizId, quizId));
  return (row?.total ?? 0) > 0;
}

const questionFingerprint = (list: QuestionInput[]) =>
  JSON.stringify(list.map((q) => [q.text, q.points, q.options, q.correctIndex]));

async function loadQuestionInputs(db: Db | Tx, quizId: number): Promise<QuestionInput[]> {
  const list = await loadQuestionsWithOptions(db, quizId);
  return list.map((q) => ({
    text: q.text,
    points: q.points,
    options: q.options.map((o) => o.text) as QuestionInput["options"],
    correctIndex: Math.max(
      0,
      q.options.findIndex((o) => o.isCorrect),
    ),
  }));
}

/**
 * Keeps `deadline <= closesAt` for attempts already running when the close time moves earlier.
 * Without it, the review would open at the new close time while those students could still answer.
 */
async function capRunningDeadlines(tx: Tx, quizId: number, closesAt: Date): Promise<void> {
  await tx
    .update(attempts)
    .set({ deadline: sql`least(${attempts.deadline}, ${closesAt.toISOString()}::timestamptz)` })
    .where(and(eq(attempts.quizId, quizId), eq(attempts.status, "in_progress")));
}

/** Once a student has started, questions and the penalty are frozen so every attempt is scored by the same rules. */
export async function updateQuiz(db: Db, actor: Actor, quizId: number, rawInput: QuizInput): Promise<void> {
  const quiz = await loadManagedQuiz(db, actor, quizId);
  const input = parseQuizInput(rawInput);

  await db.transaction(async (tx) => {
    await tx.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.id, quizId)).for("update");
    await assertClassesExist(tx, input.classIds);
    const isLocked = await hasAttempts(tx, quizId);
    const questionsChanged = questionFingerprint(await loadQuestionInputs(tx, quizId)) !== questionFingerprint(input.questions);

    if (isLocked && (questionsChanged || input.penaltyPercent !== quiz.penaltyPercent)) {
      throw new DomainError("LOCKED", "Students have already started this quiz, so questions and penalty can no longer change");
    }

    await tx
      .update(quizzes)
      .set({
        title: input.title,
        timeLimitMinutes: input.timeLimitMinutes,
        opensAt: input.opensAt,
        closesAt: input.closesAt,
        penaltyPercent: input.penaltyPercent,
      })
      .where(eq(quizzes.id, quizId));
    await capRunningDeadlines(tx, quizId, input.closesAt);
    await replaceClasses(tx, quizId, input.classIds);
    if (questionsChanged) {
      await tx.delete(questions).where(eq(questions.quizId, quizId));
      await insertQuestions(tx, quizId, input.questions);
    }
  });
}

export async function getQuizForEdit(db: Db, actor: Actor, quizId: number): Promise<QuizForEdit> {
  const quiz = await loadManagedQuiz(db, actor, quizId);
  const [classRows, questionInputs, isLocked] = await Promise.all([
    db.select({ classId: quizClasses.classId }).from(quizClasses).where(eq(quizClasses.quizId, quizId)),
    loadQuestionInputs(db, quizId),
    hasAttempts(db, quizId),
  ]);
  return {
    id: quiz.id,
    teacherId: quiz.teacherId,
    title: quiz.title,
    classIds: classRows.map((r) => r.classId),
    timeLimitMinutes: quiz.timeLimitMinutes,
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    penaltyPercent: quiz.penaltyPercent,
    questions: questionInputs,
    isLocked,
  };
}

export async function listQuizzesForActor(
  db: Db,
  actor: Actor,
  filter: { classId?: number } = {},
): Promise<QuizListItem[]> {
  assertRole(actor, ["teacher", "admin"]);
  const ownership = actor.role === "teacher" ? eq(quizzes.teacherId, actor.id) : undefined;
  const classFilter = filter.classId
    ? inArray(
        quizzes.id,
        db.select({ id: quizClasses.quizId }).from(quizClasses).where(eq(quizClasses.classId, filter.classId)),
      )
    : undefined;

  const rows = await db
    .select({
      quiz: quizzes,
      teacherName: users.fullName,
      questionCount: sql<number>`(select count(*)::int from ${questions} where ${questions.quizId} = ${quizzes.id})`,
      attemptCount: sql<number>`(select count(*)::int from ${attempts} where ${attempts.quizId} = ${quizzes.id})`,
    })
    .from(quizzes)
    .innerJoin(users, eq(users.id, quizzes.teacherId))
    .where(and(ownership, classFilter))
    .orderBy(desc(quizzes.opensAt));
  if (rows.length === 0) return [];

  const classLinks = await db
    .select({ quizId: quizClasses.quizId, name: classes.name })
    .from(quizClasses)
    .innerJoin(classes, eq(classes.id, quizClasses.classId))
    .where(
      inArray(
        quizClasses.quizId,
        rows.map((r) => r.quiz.id),
      ),
    )
    .orderBy(asc(classes.name));

  return rows.map(({ quiz, teacherName, questionCount, attemptCount }) => ({
    id: quiz.id,
    title: quiz.title,
    teacherName,
    classNames: classLinks.filter((l) => l.quizId === quiz.id).map((l) => l.name),
    opensAt: quiz.opensAt,
    closesAt: quiz.closesAt,
    timeLimitMinutes: quiz.timeLimitMinutes,
    penaltyPercent: quiz.penaltyPercent,
    questionCount,
    attemptCount,
  }));
}
