export const ROLES = ["student", "teacher", "admin"] as const;
export type Role = (typeof ROLES)[number];
