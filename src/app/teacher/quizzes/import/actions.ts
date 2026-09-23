"use server";

import { revalidatePath } from "next/cache";
import { readQuizMeta } from "@/app/quizzes/form-data";
import { getDb } from "@/db/client";
import type { RowError } from "@/domain/import/validate";
import { quizFormSchema } from "@/domain/quiz-input";
import { actionError } from "@/lib/action-result";
import { formatIssues } from "@/lib/format-issues";
import { requireActor } from "@/lib/session";
import { readUploadedSpreadsheet } from "@/lib/uploaded-file";
import { questionsFromRows } from "@/server/imports";
import { createQuiz } from "@/server/quizzes";

export type QuizImportState = { rowErrors: RowError[]; errors: string[]; savedQuizId: number | null };

const failed = (errors: string[], rowErrors: RowError[] = []): QuizImportState => ({ errors, rowErrors, savedQuizId: null });

export async function importQuizAction(_previous: QuizImportState, formData: FormData): Promise<QuizImportState> {
  const actor = await requireActor(["teacher"]);
  try {
    const questions = questionsFromRows(await readUploadedSpreadsheet(formData));
    if (!questions.ok) return failed([], questions.errors);

    const parsed = quizFormSchema.safeParse({ ...readQuizMeta(formData), questions: questions.summary });
    if (!parsed.success) return failed(formatIssues(parsed.error.issues));

    const quizId = await createQuiz(getDb(), actor, parsed.data);
    revalidatePath("/teacher");
    return { errors: [], rowErrors: [], savedQuizId: quizId };
  } catch (error) {
    const failure = actionError(error, "importQuiz");
    return failed(failure.ok ? [] : [failure.message]);
  }
}
