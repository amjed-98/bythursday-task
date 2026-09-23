import { describe, expect, it } from "vitest";
import { quizFormSchema } from "@/domain/quiz-input";

const validForm = {
  title: "Algebra check",
  classIds: [1],
  timeLimitMinutes: 20,
  penaltyPercent: 25,
  opensAt: "2026-09-23T09:00",
  closesAt: "2026-09-24T09:00",
  questions: [{ text: "2 + 2 = ?", points: 2, options: ["3", "4", "5", "6"], correctIndex: 1 }],
};

const issuesOf = (input: unknown) => {
  const result = quizFormSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe("quizFormSchema", () => {
  it("accepts a valid quiz and converts Amman times to UTC", () => {
    const parsed = quizFormSchema.parse(validForm);
    expect(parsed.opensAt.toISOString()).toBe("2026-09-23T06:00:00.000Z");
  });

  it("rejects a quiz that closes before it opens", () => {
    expect(issuesOf({ ...validForm, closesAt: "2026-09-22T09:00" })).toContain("The quiz must close after it opens");
  });

  it("rejects a quiz with no classes", () => {
    expect(issuesOf({ ...validForm, classIds: [] })).toContain("Assign at least one class");
  });

  it("rejects a penalty above 100%", () => {
    expect(issuesOf({ ...validForm, penaltyPercent: 150 })).not.toHaveLength(0);
  });

  it("rejects an empty option", () => {
    const questions = [{ ...validForm.questions[0], options: ["3", " ", "5", "6"] }];
    expect(issuesOf({ ...validForm, questions })).toContain("Every option needs text");
  });

  it("rejects fractional points", () => {
    const questions = [{ ...validForm.questions[0], points: 1.5 }];
    expect(issuesOf({ ...validForm, questions })).toContain("Points must be a whole number");
  });

  it("rejects a malformed date", () => {
    expect(issuesOf({ ...validForm, opensAt: "tomorrow" })).toContain("Enter a valid date and time");
  });
});
