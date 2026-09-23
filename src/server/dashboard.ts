import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempts, questions, quizClasses, quizzes, type AttemptStatus } from "@/db/schema";
import { windowState } from "@/domain/deadline";
import { CENTI_PER_POINT } from "@/domain/scoring";
import { assertRole, type Actor } from "./actor";
import { finaliseExpiredAttempts } from "./attempts";

export type QuizCard = {
  id: number;
  title: string;
  opensAt: Date;
  closesAt: Date;
  timeLimitMinutes: number;
  penaltyPercent: number;
  questionCount: number;
  maxScoreCenti: number;
  attemptStatus: AttemptStatus | null;
  scoreCenti: number | null;
};

export type StudentDashboard = { available: QuizCard[]; upcoming: QuizCard[]; completed: QuizCard[] };

const EMPTY_DASHBOARD: StudentDashboard = { available: [], upcoming: [], completed: [] };

export async function getStudentDashboard(db: Db, actor: Actor, now: Date): Promise<StudentDashboard> {
  assertRole(actor, ["student"]);
  if (actor.classId === null) return EMPTY_DASHBOARD;
  await finaliseExpiredAttempts(db, { studentId: actor.id }, now);

  const assigned = await db
    .select({ quiz: quizzes })
    .from(quizzes)
    .innerJoin(quizClasses, and(eq(quizClasses.quizId, quizzes.id), eq(quizClasses.classId, actor.classId)))
    .orderBy(asc(quizzes.closesAt));
  if (assigned.length === 0) return EMPTY_DASHBOARD;

  const quizIds = assigned.map((row) => row.quiz.id);
  const [questionTotals, myAttempts] = await Promise.all([
    db
      .select({ quizId: questions.quizId, questionCount: count(), points: questions.points })
      .from(questions)
      .where(inArray(questions.quizId, quizIds))
      .groupBy(questions.quizId, questions.points),
    db
      .select()
      .from(attempts)
      .where(and(eq(attempts.studentId, actor.id), inArray(attempts.quizId, quizIds))),
  ]);

  const cards = assigned.map(({ quiz }): QuizCard => {
    const totals = questionTotals.filter((t) => t.quizId === quiz.id);
    const attempt = myAttempts.find((a) => a.quizId === quiz.id);
    return {
      id: quiz.id,
      title: quiz.title,
      opensAt: quiz.opensAt,
      closesAt: quiz.closesAt,
      timeLimitMinutes: quiz.timeLimitMinutes,
      penaltyPercent: quiz.penaltyPercent,
      questionCount: totals.reduce((sum, t) => sum + t.questionCount, 0),
      maxScoreCenti: totals.reduce((sum, t) => sum + t.questionCount * t.points * CENTI_PER_POINT, 0),
      attemptStatus: attempt?.status ?? null,
      scoreCenti: attempt?.scoreCenti ?? null,
    };
  });

  const isFinished = (card: QuizCard) => card.attemptStatus === "submitted" || card.attemptStatus === "expired";
  const stateOf = (card: QuizCard) => windowState(card, now);

  return {
    available: cards.filter((c) => !isFinished(c) && stateOf(c) === "open"),
    upcoming: cards.filter((c) => stateOf(c) === "upcoming"),
    completed: cards.filter((c) => isFinished(c) || (stateOf(c) === "closed" && c.attemptStatus === null)),
  };
}

export type QuizIntro = QuizCard & { state: ReturnType<typeof windowState> };

export async function getQuizIntro(db: Db, actor: Actor, quizId: number, now: Date): Promise<QuizIntro | null> {
  const dashboard = await getStudentDashboard(db, actor, now);
  const card = [...dashboard.available, ...dashboard.upcoming, ...dashboard.completed].find((c) => c.id === quizId);
  return card ? { ...card, state: windowState(card, now) } : null;
}
