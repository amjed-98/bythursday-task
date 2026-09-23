import { and, asc, eq, inArray, or } from "drizzle-orm";
import Papa from "papaparse";
import type { Db } from "@/db/client";
import { answers, attempts, classes, quizClasses, users, type AttemptStatus } from "@/db/schema";
import { windowState, type WindowState } from "@/domain/deadline";
import { CENTI_PER_POINT, formatCenti } from "@/domain/scoring";
import type { Actor } from "./actor";
import { finaliseExpiredAttempts } from "./attempts";
import { loadQuestionsWithOptions } from "./quiz-access";
import { loadManagedQuiz } from "./quizzes";

export type ResultStatus = AttemptStatus | "not_started";

export type StudentResultRow = {
  studentId: number;
  username: string;
  fullName: string;
  fullNameLatin: string | null;
  className: string | null;
  status: ResultStatus;
  scoreCenti: number | null;
  correct: number | null;
  wrong: number | null;
  blank: number | null;
  timeTakenSeconds: number | null;
};

export type QuestionStat = { questionId: number; position: number; text: string; points: number; percentCorrect: number | null };

export type QuizResults = {
  quiz: { id: number; title: string; penaltyPercent: number; closesAt: Date; state: WindowState; maxScoreCenti: number };
  rows: StudentResultRow[];
  questionStats: QuestionStat[];
  summary: { finished: number; notStarted: number; inProgress: number; averageScoreCenti: number | null };
};

const MS_PER_SECOND = 1000;
const isFinished = (status: ResultStatus) => status === "submitted" || status === "expired";

export async function getQuizResults(db: Db, actor: Actor, quizId: number, now: Date): Promise<QuizResults> {
  const quiz = await loadManagedQuiz(db, actor, quizId);
  await finaliseExpiredAttempts(db, { quizId }, now);

  const [attemptRows, questionList] = await Promise.all([
    db.select().from(attempts).where(eq(attempts.quizId, quizId)),
    loadQuestionsWithOptions(db, quizId),
  ]);
  const assignedClassIds = db.select({ id: quizClasses.classId }).from(quizClasses).where(eq(quizClasses.quizId, quizId));
  const attemptStudentIds = attemptRows.map((a) => a.studentId);

  // Students who attempted stay listed even if their class was later unassigned.
  const students = await db
    .select({ user: users, className: classes.name })
    .from(users)
    .leftJoin(classes, eq(classes.id, users.classId))
    .where(
      and(
        eq(users.role, "student"),
        or(inArray(users.classId, assignedClassIds), attemptStudentIds.length > 0 ? inArray(users.id, attemptStudentIds) : undefined),
      ),
    )
    .orderBy(asc(classes.name), asc(users.fullName));

  const rows = students.map(({ user, className }): StudentResultRow => {
    const attempt = attemptRows.find((a) => a.studentId === user.id);
    return {
      studentId: user.id,
      username: user.username,
      fullName: user.fullName,
      fullNameLatin: user.fullNameLatin,
      className,
      status: attempt?.status ?? "not_started",
      scoreCenti: attempt?.scoreCenti ?? null,
      correct: attempt?.correctCount ?? null,
      wrong: attempt?.wrongCount ?? null,
      blank: attempt?.blankCount ?? null,
      timeTakenSeconds:
        attempt?.finishedAt ? Math.round((attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / MS_PER_SECOND) : null,
    };
  });

  const finishedAttemptIds = attemptRows.filter((a) => isFinished(a.status)).map((a) => a.id);
  const answerRows =
    finishedAttemptIds.length > 0
      ? await db.select().from(answers).where(inArray(answers.attemptId, finishedAttemptIds))
      : [];

  const questionStats = questionList.map((q): QuestionStat => {
    const correctId = q.options.find((o) => o.isCorrect)?.id;
    const correctCount = answerRows.filter((a) => a.questionId === q.id && a.optionId === correctId).length;
    return {
      questionId: q.id,
      position: q.position,
      text: q.text,
      points: q.points,
      percentCorrect: finishedAttemptIds.length > 0 ? Math.round((correctCount / finishedAttemptIds.length) * 100) : null,
    };
  });

  const finishedScores = rows.filter((r) => isFinished(r.status)).map((r) => r.scoreCenti ?? 0);
  return {
    quiz: {
      id: quiz.id,
      title: quiz.title,
      penaltyPercent: quiz.penaltyPercent,
      closesAt: quiz.closesAt,
      state: windowState(quiz, now),
      maxScoreCenti: questionList.reduce((sum, q) => sum + q.points * CENTI_PER_POINT, 0),
    },
    rows,
    questionStats,
    summary: {
      finished: finishedScores.length,
      notStarted: rows.filter((r) => r.status === "not_started").length,
      inProgress: rows.filter((r) => r.status === "in_progress").length,
      averageScoreCenti:
        finishedScores.length > 0 ? Math.round(finishedScores.reduce((a, b) => a + b, 0) / finishedScores.length) : null,
    },
  };
}

export const STATUS_LABELS: Record<ResultStatus, string> = {
  submitted: "Submitted",
  expired: "Time ran out",
  in_progress: "In progress",
  not_started: "Not started",
};

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const UTF8_BOM = "﻿";

/** BOM so Excel opens Arabic names correctly; Papa handles quoting of commas and quotes. */
export function resultsToCsv(results: QuizResults): string {
  const max = formatCenti(results.quiz.maxScoreCenti);
  const body = Papa.unparse({
    fields: ["Name", "Name (Latin)", "Username", "Class", "Status", "Score", "Max score", "Correct", "Wrong", "Blank", "Time taken (m:ss)"],
    data: results.rows.map((row) => [
      row.fullName,
      row.fullNameLatin ?? "",
      row.username,
      row.className ?? "",
      STATUS_LABELS[row.status],
      row.scoreCenti === null ? "" : formatCenti(row.scoreCenti),
      max,
      row.correct ?? "",
      row.wrong ?? "",
      row.blank ?? "",
      formatDuration(row.timeTakenSeconds),
    ]),
  });
  return `${UTF8_BOM}${body}\r\n`;
}
