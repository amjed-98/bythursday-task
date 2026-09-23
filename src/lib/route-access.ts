import { ROLES, type Role } from "@/domain/roles";

const SECTION_ROLES: readonly { prefix: string; roles: readonly Role[] }[] = [
  { prefix: "/", roles: ROLES },
  { prefix: "/student", roles: ["student"] },
  { prefix: "/teacher", roles: ["teacher"] },
  { prefix: "/quizzes", roles: ["teacher", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
];

const HOME_PATHS: Record<Role, string> = { student: "/student", teacher: "/teacher", admin: "/admin" };

const isInSection = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Default-deny: a new route is unreachable until it is added to SECTION_ROLES. */
export function canAccessPath(path: string, role: Role): boolean {
  const section = SECTION_ROLES.find(({ prefix }) => isInSection(path, prefix));
  return section ? section.roles.includes(role) : false;
}

export function homePathFor(role: Role): string {
  return HOME_PATHS[role];
}
