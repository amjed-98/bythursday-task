import { notFound } from "next/navigation";
import { isDomainError } from "@/domain/errors";

/** Maps "not found" and "not yours" to a 404 so pages do not reveal which quiz ids exist. */
export async function loadOr404<T>(load: Promise<T>): Promise<T> {
  try {
    return await load;
  } catch (error) {
    if (isDomainError(error) && (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")) notFound();
    throw error;
  }
}

export function parseIdOr404(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return id;
}
