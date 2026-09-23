import type { Role } from "@/domain/roles";
import { requireActor } from "@/lib/session";
import { AppShell } from "./app-shell";

export async function RoleLayout({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const actor = await requireActor(roles);
  return (
    <AppShell role={actor.role} name={actor.name}>
      {children}
    </AppShell>
  );
}
