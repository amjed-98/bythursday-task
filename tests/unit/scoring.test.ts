import { describe, expect, it } from "vitest";
import { formatCenti, scoreAttempt, type ScorableQuestion } from "@/domain/scoring";

const questions: ScorableQuestion[] = [
  { id: 1, points: 2, correctOptionId: 10 },
  { id: 2, points: 1, correctOptionId: 20 },
  { id: 3, points: 4, correctOptionId: 30 },
];

const answersOf = (entries: [number, number | null][]) => new Map(entries);

describe("scoreAttempt", () => {
  it("gives full marks when every answer is correct with no penalty", () => {
    const result = scoreAttempt(questions, answersOf([[1, 10], [2, 20], [3, 30]]), 0);
    expect(result).toEqual({ scoreCenti: 700, maxScoreCenti: 700, correct: 3, wrong: 0, blank: 0 });
  });

  it("does not deduct for wrong answers at 0% penalty", () => {
    const result = scoreAttempt(questions, answersOf([[1, 10], [2, 21], [3, 31]]), 0);
    expect(result.scoreCenti).toBe(200);
  });

  it("deducts 25% of the question's points for a wrong answer at 25% penalty", () => {
    const result = scoreAttempt(questions, answersOf([[1, 10], [2, 21], [3, null]]), 25);
    expect(result).toEqual({ scoreCenti: 175, maxScoreCenti: 700, correct: 1, wrong: 1, blank: 1 });
  });

  it("deducts the full question points for a wrong answer at 100% penalty", () => {
    const result = scoreAttempt(questions, answersOf([[1, 10], [2, 21], [3, 30]]), 100);
    expect(result.scoreCenti).toBe(200 - 100 + 400);
  });

  it("floors the total at zero when penalties exceed earned points", () => {
    const result = scoreAttempt(questions, answersOf([[1, 11], [2, 21], [3, 31]]), 100);
    expect(result.scoreCenti).toBe(0);
  });

  it("treats unanswered questions as blank with zero points", () => {
    const result = scoreAttempt(questions, answersOf([]), 100);
    expect(result).toEqual({ scoreCenti: 0, maxScoreCenti: 700, correct: 0, wrong: 0, blank: 3 });
  });

  it("ignores answers for questions that are not part of the quiz", () => {
    const result = scoreAttempt(questions, answersOf([[99, 10]]), 25);
    expect(result.blank).toBe(3);
  });
});

describe("formatCenti", () => {
  it.each([
    [1000, "10"],
    [1250, "12.5"],
    [1275, "12.75"],
    [0, "0"],
  ])("formats %i centi-points as %s", (centi, expected) => {
    expect(formatCenti(centi)).toBe(expected);
  });
});
