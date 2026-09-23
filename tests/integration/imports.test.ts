import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { classes, users } from "@/db/schema";
import { importUsers } from "@/server/imports";
import { createUser } from "./factories";
import { testDb } from "./setup";

const studentRow = (rowNumber: number, overrides: Record<string, string> = {}) => ({
  rowNumber,
  values: {
    username: `student${rowNumber}`,
    password: "secret1",
    full_name: "ليلى حداد",
    full_name_latin: "Layla Haddad",
    class: "10A",
    ...overrides,
  },
});

describe("importUsers", () => {
  it("creates students and their classes in one go", async () => {
    const admin = await createUser("admin");

    const outcome = await importUsers(testDb, admin, "students", [studentRow(2), studentRow(3, { class: "10B" })]);

    expect(outcome).toEqual({ ok: true, summary: { created: 2, updated: 0 } });
    expect((await testDb.select().from(classes)).map((c) => c.name).sort()).toEqual(["10A", "10B"]);
  });

  it("commits nothing when any row is invalid", async () => {
    const admin = await createUser("admin");

    const outcome = await importUsers(testDb, admin, "students", [studentRow(2), studentRow(3, { full_name: "" })]);

    expect(outcome).toEqual({ ok: false, errors: [{ row: 3, message: "full_name: is required" }] });
    expect(await testDb.select().from(users).where(eq(users.role, "student"))).toHaveLength(0);
    expect(await testDb.select().from(classes)).toHaveLength(0);
  });

  it("updates existing students on re-import and keeps their password when left blank", async () => {
    const admin = await createUser("admin");
    await importUsers(testDb, admin, "students", [studentRow(2)]);

    const outcome = await importUsers(testDb, admin, "students", [studentRow(2, { password: "", class: "11A" })]);

    const [student] = await testDb.select().from(users).where(eq(users.username, "student2"));
    expect(outcome).toEqual({ ok: true, summary: { created: 0, updated: 1 } });
    expect(await bcrypt.compare("secret1", student!.passwordHash)).toBe(true);
  });

  it("requires a password for new users", async () => {
    const admin = await createUser("admin");

    const outcome = await importUsers(testDb, admin, "students", [studentRow(2, { password: "" })]);

    expect(outcome).toEqual({ ok: false, errors: [{ row: 2, message: "password: is required for a new user" }] });
  });

  it("refuses to turn an existing teacher into a student", async () => {
    const admin = await createUser("admin");
    await importUsers(testDb, admin, "teachers", [{ rowNumber: 2, values: { username: "t.ahmad", password: "secret1", full_name: "أحمد" } }]);

    const outcome = await importUsers(testDb, admin, "students", [studentRow(5, { username: "t.ahmad" })]);

    expect(outcome).toEqual({ ok: false, errors: [{ row: 5, message: 'username: "t.ahmad" already belongs to a teacher' }] });
  });

  it("is admin-only", async () => {
    const teacher = await createUser("teacher");

    await expect(importUsers(testDb, teacher, "students", [studentRow(2)])).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
