import type { DefaultSession } from "next-auth";
import type { Role } from "@/domain/roles";

declare module "next-auth" {
  interface User {
    role: Role;
    classId: number | null;
  }

  interface Session {
    user: { id: string; role: Role; classId: number | null } & DefaultSession["user"];
  }
}
