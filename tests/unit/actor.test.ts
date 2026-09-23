import { describe, expect, it } from "vitest";
import { assertRole } from "@/server/actor";

describe("assertRole", () => {
  it("passes when the actor has an allowed role", () => {
    expect(() => assertRole({ id: 1, role: "admin", classId: null }, ["teacher", "admin"])).not.toThrow();
  });

  it("throws FORBIDDEN when the actor's role is not allowed", () => {
    expect(() => assertRole({ id: 1, role: "student", classId: 2 }, ["teacher"])).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});
