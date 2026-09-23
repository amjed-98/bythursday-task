import { inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { classes, users, type Role } from "@/db/schema";
import type { Tx } from "@/db/types";
import { DomainError } from "@/domain/errors";
import type { RawRow } from "@/domain/import/parse-file";
import { QUESTION_IMPORT, STUDENT_IMPORT, TEACHER_IMPORT, type StudentImportRow, type TeacherImportRow } from "@/domain/import/schemas";
import { validateRows, type RowError } from "@/domain/import/validate";
import type { QuestionInput } from "@/domain/quiz-input";
import { hashPassword } from "@/lib/password";
import { assertRole, type Actor } from "./actor";

export type UserImportKind = "students" | "teachers";
export type ImportOutcome<T> = { ok: true; summary: T } | { ok: false; errors: RowError[] };
export type UserImportSummary = { created: number; updated: number };

type UserRow = (StudentImportRow | TeacherImportRow) & { rowNumber: number };

const ROLE_FOR_KIND: Record<UserImportKind, Role> = { students: "student", teachers: "teacher" };

function validateUserRows(kind: UserImportKind, rows: RawRow[]) {
  return kind === "students" ? validateRows(rows, STUDENT_IMPORT) : validateRows(rows, TEACHER_IMPORT);
}

async function ensureClasses(tx: Tx, names: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(names)];
  if (unique.length === 0) return new Map();
  await tx.insert(classes).values(unique.map((name) => ({ name }))).onConflictDoNothing({ target: classes.name });
  const rows = await tx.select().from(classes).where(inArray(classes.name, unique));
  return new Map(rows.map((row) => [row.name, row.id]));
}

function findRowConflicts(rows: UserRow[], existing: Map<string, Role>, role: Role): RowError[] {
  return rows.flatMap((row) => {
    const existingRole = existing.get(row.username);
    if (existingRole && existingRole !== role) {
      return [{ row: row.rowNumber, message: `username: "${row.username}" already belongs to a ${existingRole}` }];
    }
    if (!existingRole && row.password === null) {
      return [{ row: row.rowNumber, message: "password: is required for a new user" }];
    }
    return [];
  });
}

/**
 * Upserts by username inside one transaction. A blank password keeps an existing user's password,
 * so a class-list re-import does not lock everyone out.
 */
export async function importUsers(
  db: Db,
  actor: Actor,
  kind: UserImportKind,
  rawRows: RawRow[],
): Promise<ImportOutcome<UserImportSummary>> {
  assertRole(actor, ["admin"]);
  const validation = validateUserRows(kind, rawRows);
  if (!validation.ok) return validation;

  const role = ROLE_FOR_KIND[kind];
  const rows: UserRow[] = validation.rows.map((row, i) => ({ ...row, rowNumber: rawRows[i]!.rowNumber }));
  const hashes = await Promise.all(rows.map((row) => (row.password ? hashPassword(row.password) : null)));

  return db.transaction(async (tx) => {
    const existingRows = await tx
      .select({ username: users.username, role: users.role })
      .from(users)
      .where(inArray(users.username, rows.map((r) => r.username)))
      .for("update");
    const existing = new Map(existingRows.map((r) => [r.username, r.role]));
    const conflicts = findRowConflicts(rows, existing, role);
    if (conflicts.length > 0) return { ok: false, errors: conflicts } as const;

    const classIds = await ensureClasses(tx, rows.flatMap((row) => ("className" in row ? [row.className] : [])));

    for (const [i, row] of rows.entries()) {
      const hash = hashes[i] ?? null;
      const profile = {
        fullName: row.fullName,
        fullNameLatin: "fullNameLatin" in row ? row.fullNameLatin : null,
        classId: "className" in row ? (classIds.get(row.className) ?? null) : null,
      };
      await tx
        .insert(users)
        .values({ username: row.username, role, passwordHash: hash ?? "", ...profile })
        .onConflictDoUpdate({
          target: users.username,
          set: { ...profile, ...(hash ? { passwordHash: hash } : {}) },
        });
    }
    return { ok: true, summary: { created: rows.length - existing.size, updated: existing.size } } as const;
  });
}

export function questionsFromRows(rawRows: RawRow[]): ImportOutcome<QuestionInput[]> {
  const validation = validateRows(rawRows, QUESTION_IMPORT);
  return validation.ok ? { ok: true, summary: validation.rows } : validation;
}

export async function countUsersByRole(db: Db): Promise<Record<Role, number>> {
  const rows = await db
    .select({ role: users.role, total: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.role);
  const counts: Record<Role, number> = { student: 0, teacher: 0, admin: 0 };
  return rows.reduce((acc, row) => ({ ...acc, [row.role]: row.total }), counts);
}

export function assertImportKind(value: unknown): UserImportKind {
  if (value === "students" || value === "teachers") return value;
  throw new DomainError("VALIDATION", "Choose students or teachers");
}
