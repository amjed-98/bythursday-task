import type { NextAuthConfig } from "next-auth";
import { z } from "zod";
import { ROLES } from "@/domain/roles";
import { canAccessPath, homePathFor } from "@/lib/route-access";

const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

const tokenClaimsSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(ROLES),
  classId: z.number().int().nullable(),
});

/** Edge-safe part of the auth config (no database, no bcrypt) so middleware can use it. */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) return { ...token, uid: user.id ?? "", role: user.role, classId: user.classId };
      return token;
    },
    session({ session, token }) {
      const claims = tokenClaimsSchema.safeParse(token);
      if (!claims.success) return session;
      const { uid, role, classId } = claims.data;
      return { ...session, user: { ...session.user, id: uid, role, classId } };
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname === "/login") return true;
      const role = auth?.user?.role;
      if (!role) return false;
      if (canAccessPath(pathname, role)) return true;
      return Response.redirect(new URL(homePathFor(role), request.nextUrl));
    },
  },
} satisfies NextAuthConfig;
