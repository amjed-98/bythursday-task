import { isDomainError, type DomainErrorCode } from "@/domain/errors";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: DomainErrorCode | "UNEXPECTED"; message: string };

export const actionOk = <T>(data: T): ActionResult<T> => ({ ok: true, data });

/** Domain errors are safe to show; anything else is logged server-side and hidden from the client. */
export function actionError(error: unknown, context: string): ActionResult<never> {
  if (isDomainError(error)) return { ok: false, code: error.code, message: error.message };
  console.error(`[${context}]`, error);
  return { ok: false, code: "UNEXPECTED", message: "Something went wrong. Please try again." };
}
