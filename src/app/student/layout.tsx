import { AppShell } from "@/components/app-shell";
import { requireActor } from "@/lib/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor(["student"]);
  return (
    <AppShell role="student" name={actor.name}>
      {children}
    </AppShell>
  );
}
