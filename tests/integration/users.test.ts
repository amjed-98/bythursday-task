import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { users } from "@/db/schema";
import { listUsers, resetPassword } from "@/server/users";
import { createClass, createUser } from "./factories";
import { testDb } from "./setup";

describe("user management", () => {
  it("lets the admin filter users by role", async () => {
    const admin = await createUser("admin");
    const classId = await createClass();
    await createUser("student", classId);
    await createUser("teacher");

    const students = await listUsers(testDb, admin, { role: "student" });

    expect(students.map((u) => u.role)).toEqual(["student"]);
  });

  it("forbids teachers from listing users", async () => {
    const teacher = await createUser("teacher");

    await expect(listUsers(testDb, teacher)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("resets a password so the new one works", async () => {
    const admin = await createUser("admin");
    const student = await createUser("student", await createClass());

    await resetPassword(testDb, admin, student.id, "fresh-pass");

    const [row] = await testDb.select().from(users).where(eq(users.id, student.id));
    expect(await bcrypt.compare("fresh-pass", row!.passwordHash)).toBe(true);
  });

  it("rejects a password that is too short", async () => {
    const admin = await createUser("admin");
    const student = await createUser("student", await createClass());

    await expect(resetPassword(testDb, admin, student.id, "123")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("forbids students from resetting passwords", async () => {
    const student = await createUser("student", await createClass());

    await expect(resetPassword(testDb, student, student.id, "fresh-pass")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
