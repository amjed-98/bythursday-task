import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { createLoginThrottle } from "@/lib/login-throttle";

const credentialsSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(100),
  password: z.string().min(1).max(200),
});

const loginThrottle = createLoginThrottle({ maxFailures: 10, windowMs: 15 * 60_000 });

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        if (loginThrottle.isBlocked(username, Date.now())) return null;

        const [user] = await getDb().select().from(users).where(eq(users.username, username));
        const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false;
        if (!user || !isValid) {
          loginThrottle.recordFailure(username, Date.now());
          return null;
        }

        loginThrottle.reset(username);
        return { id: String(user.id), name: user.fullName, role: user.role, classId: user.classId };
      },
    }),
  ],
});
