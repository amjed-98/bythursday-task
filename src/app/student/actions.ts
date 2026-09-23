"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { requireActor } from "@/lib/session";
import { saveAnswer, startAttempt, submitAttempt } from "@/server/attempts";

const idSchema = z.coerce.number().int().positive();

const saveAnswerSchema = z.object({
  attemptId: idSchema,
  questionId: idSchema,
  optionId: idSchema.nullable(),
});

export async function startAttemptAction(formData: FormData): Promise<void> {
  const actor = await requireActor(["student"]);
  const quizId = idSchema.parse(formData.get("quizId"));
  const failure = await startAttempt(getDb(), actor, quizId, new Date()).then(
    () => null,
    (error: unknown) => actionError(error, "startAttempt"),
  );
  redirect(failure && !failure.ok ? `/student/quiz/${quizId}?error=${failure.code}` : `/student/quiz/${quizId}`);
}

export async function saveAnswerAction(input: z.input<typeof saveAnswerSchema>): Promise<ActionResult> {
  const actor = await requireActor(["student"]);
  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Invalid answer" };
  try {
    await saveAnswer(getDb(), actor, parsed.data, new Date());
    return actionOk(undefined);
  } catch (error) {
    return actionError(error, "saveAnswer");
  }
}

export async function submitAttemptAction(attemptId: number): Promise<ActionResult> {
  const actor = await requireActor(["student"]);
  const parsed = idSchema.safeParse(attemptId);
  if (!parsed.success) return { ok: false, code: "VALIDATION", message: "Invalid attempt" };
  try {
    await submitAttempt(getDb(), actor, parsed.data, new Date());
    return actionOk(undefined);
  } catch (error) {
    return actionError(error, "submitAttempt");
  }
}
