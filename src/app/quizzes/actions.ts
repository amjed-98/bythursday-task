"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { quizFormSchema } from "@/domain/quiz-input";
import { actionError } from "@/lib/action-result";
import { formatIssues } from "@/lib/format-issues";
import { requireActor } from "@/lib/session";
import { createQuiz, updateQuiz } from "@/server/quizzes";
import { readQuestionsJson, readQuizMeta } from "./form-data";

export type QuizFormState = { status: "idle" | "error" | "saved"; errors: string[]; quizId: number | null };

const optionalId = z.coerce.number().int().positive().nullable();

export async function saveQuizAction(_previous: QuizFormState, formData: FormData): Promise<QuizFormState> {
  const actor = await requireActor(["teacher", "admin"]);
  const quizId = optionalId.parse(formData.get("quizId") || null);
  const parsed = quizFormSchema.safeParse({ ...readQuizMeta(formData), questions: readQuestionsJson(formData) });
  if (!parsed.success) return { status: "error", errors: formatIssues(parsed.error.issues), quizId };

  try {
    const db = getDb();
    const savedId = quizId ?? (await createQuiz(db, actor, parsed.data));
    if (quizId) await updateQuiz(db, actor, quizId, parsed.data);
    revalidatePath("/teacher");
    return { status: "saved", errors: [], quizId: savedId };
  } catch (error) {
    const failure = actionError(error, "saveQuiz");
    return { status: "error", errors: failure.ok ? [] : [failure.message], quizId };
  }
}
