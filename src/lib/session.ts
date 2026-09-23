import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/db/schema";
import type { Actor } from "@/server/actor";
import { homePathFor } from "./route-access";

/** Server-side gate for every page and server action; middleware redirects are only a convenience. */
export async function requireActor(roles?: readonly Role[]): Promise<Actor & { name: string }> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) redirect("/login");

  const actor = { id: Number(user.id), role: user.role, classId: user.classId, name: user.name ?? "" };
  if (roles && !roles.includes(actor.role)) redirect(homePathFor(actor.role));
  return actor;
}
