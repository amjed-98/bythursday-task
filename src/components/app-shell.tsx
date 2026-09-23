import Link from "next/link";
import { signOut } from "@/auth";
import type { Role } from "@/domain/roles";
import { buttonClass } from "./ui";

const NAV_LINKS: Record<Role, { href: string; label: string }[]> = {
  student: [{ href: "/student", label: "My quizzes" }],
  teacher: [
    { href: "/teacher", label: "My quizzes" },
    { href: "/teacher/quizzes/new", label: "New quiz" },
    { href: "/teacher/quizzes/import", label: "Import" },
  ],
  admin: [
    { href: "/admin", label: "Quizzes" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/import", label: "Import" },
  ],
};

type AppShellProps = { role: Role; name: string; children: React.ReactNode };

export function AppShell({ role, name, children }: AppShellProps) {
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-white">Q</span>
            <span className="hidden sm:inline">Quizzes</span>
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1" aria-label="Main">
            {NAV_LINKS[role].map((link) => (
              <Link key={link.href} href={link.href} className={buttonClass("ghost", "min-h-9 px-3")}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span dir="auto" className="max-w-40 truncate text-sm text-muted">
              {name}
            </span>
            <form action={signOutAction}>
              <button type="submit" className={buttonClass("secondary", "min-h-9 px-3")}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
