import type { Role } from "@/db/schema";
import { DomainError } from "@/domain/errors";

export type Actor = { id: number; role: Role; classId: number | null };

export function assertRole(actor: Actor, roles: readonly Role[]): void {
  if (!roles.includes(actor.role)) {
    throw new DomainError("FORBIDDEN", `This action needs one of these roles: ${roles.join(", ")}`);
  }
}
