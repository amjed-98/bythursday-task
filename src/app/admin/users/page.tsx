import Link from "next/link";
import { FilterLinks } from "@/components/filter-links";
import { buttonClass } from "@/components/ui";
import { getDb } from "@/db/client";
import { ROLES, type Role } from "@/domain/roles";
import { requireActor } from "@/lib/session";
import { listUsers } from "@/server/users";
import { ResetPassword } from "./reset-password";

type PageProps = { searchParams: Promise<{ role?: string }> };

const ALL = "all";
const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const actor = await requireActor(["admin"]);
  const requested = (await searchParams).role ?? ALL;
  const role = isRole(requested) ? requested : undefined;
  const users = await listUsers(getDb(), actor, { role });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Users ({users.length})</h1>
        <Link href="/admin/import" className={buttonClass("primary")}>
          Import users
        </Link>
      </div>
      <FilterLinks
        label="Filter by role"
        current={role ?? ALL}
        options={[{ value: ALL, label: "Everyone" }, ...ROLES.map((r) => ({ value: r, label: `${r[0]!.toUpperCase()}${r.slice(1)}s` }))]}
        hrefFor={(value) => (value === ALL ? "/admin/users" : `/admin/users?role=${value}`)}
      />
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {users.map((user) => (
          <li key={user.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p dir="auto" className="font-medium">
                {user.fullName}
              </p>
              <p className="text-xs text-muted">
                <span className="font-mono">{user.username}</span> · {user.role}
                {user.className && ` · ${user.className}`}
                {user.fullNameLatin && ` · ${user.fullNameLatin}`}
              </p>
            </div>
            <ResetPassword userId={user.id} username={user.username} />
          </li>
        ))}
      </ul>
    </div>
  );
}
