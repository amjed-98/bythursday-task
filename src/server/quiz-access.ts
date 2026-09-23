import { and, asc, eq, inArray } from "drizzle-orm";
import { options, questions, quizClasses, quizzes } from "@/db/schema";
import type { DbOrTx } from "@/db/types";
import { DomainError } from "@/domain/errors";
import type { ScorableQuestion } from "@/domain/scoring";
import type { Actor } from "./actor";

export type QuizRow = typeof quizzes.$inferSelect;

/** Students only ever see quizzes assigned to their class; anything else is reported as missing. */
export async function loadQuizForStudent(db: DbOrTx, actor: Actor, quizId: number): Promise<QuizRow> {
  if (actor.classId === null) throw new DomainError("NOT_FOUND", "Quiz not found");
  const [row] = await db
    .select({ quiz: quizzes })
    .from(quizzes)
    .innerJoin(quizClasses, and(eq(quizClasses.quizId, quizzes.id), eq(quizClasses.classId, actor.classId)))
    .where(eq(quizzes.id, quizId));
  if (!row) throw new DomainError("NOT_FOUND", "Quiz not found");
  return row.quiz;
}

export async function loadQuizOrThrow(db: DbOrTx, quizId: number): Promise<QuizRow> {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
  if (!quiz) throw new DomainError("NOT_FOUND", "Quiz not found");
  return quiz;
}

export type QuestionWithOptions = {
  id: number;
  position: number;
  text: string;
  points: number;
  options: { id: number; position: number; text: string; isCorrect: boolean }[];
};

export async function loadQuestionsWithOptions(db: DbOrTx, quizId: number): Promise<QuestionWithOptions[]> {
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.position));
  if (questionRows.length === 0) return [];

  const optionRows = await db
    .select()
    .from(options)
    .where(
      inArray(
        options.questionId,
        questionRows.map((q) => q.id),
      ),
    )
    .orderBy(asc(options.questionId), asc(options.position));

  return questionRows.map((q) => ({
    id: q.id,
    position: q.position,
    text: q.text,
    points: q.points,
    options: optionRows
      .filter((o) => o.questionId === q.id)
      .map((o) => ({ id: o.id, position: o.position, text: o.text, isCorrect: o.isCorrect })),
  }));
}

export function toScorable(questionList: readonly QuestionWithOptions[]): ScorableQuestion[] {
  return questionList.map((q) => {
    const correct = q.options.find((o) => o.isCorrect);
    if (!correct) throw new Error(`Question ${q.id} has no correct option`);
    return { id: q.id, points: q.points, correctOptionId: correct.id };
  });
}
