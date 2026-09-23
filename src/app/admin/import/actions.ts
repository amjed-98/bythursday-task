"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import type { RowError } from "@/domain/import/validate";
import { actionError } from "@/lib/action-result";
import { requireActor } from "@/lib/session";
import { readUploadedSpreadsheet } from "@/lib/uploaded-file";
import { assertImportKind, importUsers } from "@/server/imports";

export type ImportState = { errors: RowError[]; message: string | null; success: string | null };

export async function importUsersAction(_previous: ImportState, formData: FormData): Promise<ImportState> {
  const actor = await requireActor(["admin"]);
  try {
    const kind = assertImportKind(formData.get("kind"));
    const rows = await readUploadedSpreadsheet(formData);
    const outcome = await importUsers(getDb(), actor, kind, rows);
    if (!outcome.ok) return { errors: outcome.errors, message: null, success: null };
    revalidatePath("/admin/users");
    const { created, updated } = outcome.summary;
    return { errors: [], message: null, success: `Imported ${kind}: ${created} created, ${updated} updated.` };
  } catch (error) {
    const failure = actionError(error, "importUsers");
    return { errors: [], message: failure.ok ? null : failure.message, success: null };
  }
}
