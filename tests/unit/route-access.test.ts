import { describe, expect, it } from "vitest";
import { canAccessPath, homePathFor } from "@/lib/route-access";

describe("canAccessPath", () => {
  it.each([
    ["/student", "student", true],
    ["/student/quiz/3", "teacher", false],
    ["/teacher", "student", false],
    ["/teacher/quizzes/new", "teacher", true],
    ["/teacher", "admin", false],
    ["/quizzes/4/results", "student", false],
    ["/quizzes/4/results", "teacher", true],
    ["/quizzes/4/results", "admin", true],
    ["/admin", "teacher", false],
    ["/admin/users", "admin", true],
    ["/", "student", true],
  ] as const)("%s for %s -> %s", (path, role, expected) => {
    expect(canAccessPath(path, role)).toBe(expected);
  });

  it("does not treat a path that merely starts with the same letters as a protected section", () => {
    expect(canAccessPath("/administrator", "student")).toBe(true);
  });
});

describe("homePathFor", () => {
  it.each([
    ["student", "/student"],
    ["teacher", "/teacher"],
    ["admin", "/admin"],
  ] as const)("sends %s to %s", (role, path) => {
    expect(homePathFor(role)).toBe(path);
  });
});
