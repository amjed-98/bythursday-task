import { and, asc, eq, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { classes, users, type Role } from "@/db/schema";
import { DomainError } from "@/domain/errors";
import { hashPassword } from "@/lib/password";
import { assertRole, type Actor } from "./actor";

export type UserListItem = {
  id: number;
  username: string;
  role: Role;
  fullName: string;
  fullNameLatin: string | null;
  className: string | null;
};

export const newPasswordSchema = z.string().min(6, "Password must be at least 6 characters").max(200);

export async function listUsers(db: Db, actor: Actor, filter: { role?: Role; classId?: number } = {}): Promise<UserListItem[]> {
  assertRole(actor, ["admin"]);
  const conditions: SQL[] = [];
  if (filter.role) conditions.push(eq(users.role, filter.role));
  if (filter.classId) conditions.push(eq(users.classId, filter.classId));

  return db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      fullName: users.fullName,
      fullNameLatin: users.fullNameLatin,
      className: classes.name,
    })
    .from(users)
    .leftJoin(classes, eq(classes.id, users.classId))
    .where(and(...conditions))
    .orderBy(asc(users.role), asc(classes.name), asc(users.username));
}

export async function resetPassword(db: Db, actor: Actor, userId: number, newPassword: string): Promise<void> {
  assertRole(actor, ["admin"]);
  const parsed = newPasswordSchema.safeParse(newPassword);
  if (!parsed.success) throw new DomainError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid password");
  const updated = await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data) })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length === 0) throw new DomainError("NOT_FOUND", "User not found");
}
