import { and, eq, lte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { answers, attempts, options, questions, type AttemptStatus } from "@/db/schema";
import type { DbOrTx, Tx } from "@/db/types";
import { computeDeadline, isPastDeadline, isReviewOpen, remainingMs, windowState } from "@/domain/deadline";
import { DomainError } from "@/domain/errors";
import { CENTI_PER_POINT, scoreAttempt, type AttemptScore } from "@/domain/scoring";
import { assertRole, type Actor } from "./actor";
import { loadQuestionsWithOptions, loadQuizForStudent, loadQuizOrThrow, toScorable } from "./quiz-access";

type AttemptRow = typeof attempts.$inferSelect;

export type AttemptView = {
  attemptId: number;
  status: AttemptStatus;
  quiz: { id: number; title: string; penaltyPercent: number };
  deadline: string;
  remainingMs: number;
  questions: {
    id: number;
    position: number;
    text: string;
    points: number;
    options: { id: number; position: number; text: string }[];
  }[];
  answers: Record<number, number | null>;
};

export type ReviewItem = {
  questionId: number;
  position: number;
  text: string;
  points: number;
  chosenOptionId: number | null;
  options: { id: number; text: string; isCorrect: boolean }[];
};

export type AttemptResult = {
  quizId: number;
  quizTitle: string;
  status: AttemptStatus;
  score: AttemptScore | null;
  closesAt: string;
  review: ReviewItem[] | null;
};

async function findAttempt(db: DbOrTx, studentId: number, quizId: number): Promise<AttemptRow | undefined> {
  const [row] = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.studentId, studentId), eq(attempts.quizId, quizId)));
  return row;
}

async function lockAttempt(tx: Tx, attemptId: number): Promise<AttemptRow | undefined> {
  const [row] = await tx.select().from(attempts).where(eq(attempts.id, attemptId)).for("update");
  return row;
}

async function loadAnswerMap(db: DbOrTx, attemptId: number): Promise<Map<number, number | null>> {
  const rows = await db.select().from(answers).where(eq(answers.attemptId, attemptId));
  return new Map(rows.map((row) => [row.questionId, row.optionId]));
}

/** Caller must hold the row lock on the attempt. Submitting on or after the deadline counts as expired. */
async function finaliseLocked(tx: Tx, attempt: AttemptRow, now: Date): Promise<void> {
  if (attempt.status !== "in_progress") return;
  const quiz = await loadQuizOrThrow(tx, attempt.quizId);
  const questionList = await loadQuestionsWithOptions(tx, attempt.quizId);
  const score = scoreAttempt(toScorable(questionList), await loadAnswerMap(tx, attempt.id), quiz.penaltyPercent);
  const expired = isPastDeadline(attempt.deadline, now);

  await tx
    .update(attempts)
    .set({
      status: expired ? "expired" : "submitted",
      finishedAt: expired ? attempt.deadline : now,
      scoreCenti: score.scoreCenti,
      correctCount: score.correct,
      wrongCount: score.wrong,
      blankCount: score.blank,
    })
    .where(eq(attempts.id, attempt.id));
}

async function finaliseIfExpired(db: Db, attempt: AttemptRow, now: Date): Promise<AttemptRow> {
  if (attempt.status !== "in_progress" || !isPastDeadline(attempt.deadline, now)) return attempt;
  return db.transaction(async (tx) => {
    const locked = await lockAttempt(tx, attempt.id);
    if (!locked) throw new DomainError("NOT_FOUND", "Attempt not found");
    await finaliseLocked(tx, locked, now);
    const refreshed = await lockAttempt(tx, attempt.id);
    if (!refreshed) throw new DomainError("NOT_FOUND", "Attempt not found");
    return refreshed;
  });
}

export async function finaliseExpiredAttempts(db: Db, quizId: number, now: Date): Promise<void> {
  const stale = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.quizId, quizId), eq(attempts.status, "in_progress"), lte(attempts.deadline, now)));
  for (const attempt of stale) await finaliseIfExpired(db, attempt, now);
}

/** Idempotent: a second call (refresh, second tab, replay) resumes the existing attempt. */
export async function startAttempt(db: Db, actor: Actor, quizId: number, now: Date): Promise<{ attemptId: number }> {
  assertRole(actor, ["student"]);
  const quiz = await loadQuizForStudent(db, actor, quizId);

  const existing = await findAttempt(db, actor.id, quizId);
  if (existing) return { attemptId: existing.id };

  if (windowState(quiz, now) !== "open") throw new DomainError("NOT_OPEN", "This quiz is not open right now");

  await db
    .insert(attempts)
    .values({
      studentId: actor.id,
      quizId,
      startedAt: now,
      deadline: computeDeadline(now, quiz.timeLimitMinutes, quiz.closesAt),
      status: "in_progress",
    })
    .onConflictDoNothing({ target: [attempts.studentId, attempts.quizId] });

  const created = await findAttempt(db, actor.id, quizId);
  if (!created) throw new Error(`Attempt for student ${actor.id} on quiz ${quizId} vanished after insert`);
  return { attemptId: created.id };
}

export async function getAttemptView(db: Db, actor: Actor, quizId: number, now: Date): Promise<AttemptView | null> {
  assertRole(actor, ["student"]);
  const quiz = await loadQuizForStudent(db, actor, quizId);
  const found = await findAttempt(db, actor.id, quizId);
  if (!found) return null;

  const attempt = await finaliseIfExpired(db, found, now);
  const questionList = await loadQuestionsWithOptions(db, quizId);
  const answerMap = await loadAnswerMap(db, attempt.id);

  return {
    attemptId: attempt.id,
    status: attempt.status,
    quiz: { id: quiz.id, title: quiz.title, penaltyPercent: quiz.penaltyPercent },
    deadline: attempt.deadline.toISOString(),
    remainingMs: attempt.status === "in_progress" ? remainingMs(attempt.deadline, now) : 0,
    questions: questionList.map((q) => ({
      id: q.id,
      position: q.position,
      text: q.text,
      points: q.points,
      options: q.options.map((o) => ({ id: o.id, position: o.position, text: o.text })),
    })),
    answers: Object.fromEntries(answerMap),
  };
}

export type SaveAnswerInput = { attemptId: number; questionId: number; optionId: number | null };

async function assertAnswerBelongsToQuiz(tx: Tx, quizId: number, input: SaveAnswerInput): Promise<void> {
  const [question] = await tx
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.id, input.questionId), eq(questions.quizId, quizId)));
  if (!question) throw new DomainError("INVALID_ANSWER", "That question is not part of this quiz");
  if (input.optionId === null) return;

  const [option] = await tx
    .select({ id: options.id })
    .from(options)
    .where(and(eq(options.id, input.optionId), eq(options.questionId, input.questionId)));
  if (!option) throw new DomainError("INVALID_ANSWER", "That option does not belong to this question");
}

export async function saveAnswer(db: Db, actor: Actor, input: SaveAnswerInput, now: Date): Promise<void> {
  assertRole(actor, ["student"]);

  const outcome = await db.transaction(async (tx) => {
    const attempt = await lockAttempt(tx, input.attemptId);
    if (!attempt) throw new DomainError("NOT_FOUND", "Attempt not found");
    if (attempt.studentId !== actor.id) throw new DomainError("FORBIDDEN", "This is not your attempt");
    if (attempt.status !== "in_progress") return "closed" as const;
    if (isPastDeadline(attempt.deadline, now)) {
      await finaliseLocked(tx, attempt, now);
      return "closed" as const;
    }

    await assertAnswerBelongsToQuiz(tx, attempt.quizId, input);
    await tx
      .insert(answers)
      .values({ attemptId: attempt.id, questionId: input.questionId, optionId: input.optionId, answeredAt: now })
      .onConflictDoUpdate({
        target: [answers.attemptId, answers.questionId],
        set: { optionId: input.optionId, answeredAt: now },
      });
    return "saved" as const;
  });

  if (outcome === "closed") throw new DomainError("ATTEMPT_CLOSED", "Time is up. This attempt is closed.");
}

export async function submitAttempt(db: Db, actor: Actor, attemptId: number, now: Date): Promise<void> {
  assertRole(actor, ["student"]);
  await db.transaction(async (tx) => {
    const attempt = await lockAttempt(tx, attemptId);
    if (!attempt) throw new DomainError("NOT_FOUND", "Attempt not found");
    if (attempt.studentId !== actor.id) throw new DomainError("FORBIDDEN", "This is not your attempt");
    await finaliseLocked(tx, attempt, now);
  });
}

function storedScore(attempt: AttemptRow, maxScoreCenti: number): AttemptScore | null {
  if (attempt.scoreCenti === null) return null;
  return {
    scoreCenti: attempt.scoreCenti,
    maxScoreCenti,
    correct: attempt.correctCount ?? 0,
    wrong: attempt.wrongCount ?? 0,
    blank: attempt.blankCount ?? 0,
  };
}

export async function getAttemptResult(db: Db, actor: Actor, quizId: number, now: Date): Promise<AttemptResult> {
  assertRole(actor, ["student"]);
  const quiz = await loadQuizForStudent(db, actor, quizId);
  const found = await findAttempt(db, actor.id, quizId);
  if (!found) throw new DomainError("NOT_FOUND", "You have not taken this quiz");

  const attempt = await finaliseIfExpired(db, found, now);
  const questionList = await loadQuestionsWithOptions(db, quizId);
  const maxScoreCenti = questionList.reduce((sum, q) => sum + q.points * CENTI_PER_POINT, 0);
  const canReview = attempt.status !== "in_progress" && isReviewOpen(quiz, now);
  const answerMap = canReview ? await loadAnswerMap(db, attempt.id) : new Map<number, number | null>();

  return {
    quizId: quiz.id,
    quizTitle: quiz.title,
    status: attempt.status,
    score: storedScore(attempt, maxScoreCenti),
    closesAt: quiz.closesAt.toISOString(),
    review: canReview
      ? questionList.map((q) => ({
          questionId: q.id,
          position: q.position,
          text: q.text,
          points: q.points,
          chosenOptionId: answerMap.get(q.id) ?? null,
          options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        }))
      : null,
  };
}
