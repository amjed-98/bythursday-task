"use server";

import { z } from "zod";
import { getDb } from "@/db/client";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { requireActor } from "@/lib/session";
import { resetPassword } from "@/server/users";

const userIdSchema = z.coerce.number().int().positive();

export async function resetPasswordAction(userId: number, newPassword: string): Promise<ActionResult> {
  const actor = await requireActor(["admin"]);
  const parsedId = userIdSchema.safeParse(userId);
  if (!parsedId.success) return { ok: false, code: "VALIDATION", message: "Invalid user" };
  try {
    await resetPassword(getDb(), actor, parsedId.data, newPassword);
    return actionOk(undefined);
  } catch (error) {
    return actionError(error, "resetPassword");
  }
}
