import { describe, expect, it } from "vitest";
import { computeDeadline, isReviewOpen, remainingMs, windowState } from "@/domain/deadline";

const at = (iso: string) => new Date(iso);
const quiz = { opensAt: at("2026-09-20T06:00:00Z"), closesAt: at("2026-09-27T06:00:00Z") };

describe("computeDeadline", () => {
  it("uses the time limit when the quiz closes later", () => {
    expect(computeDeadline(at("2026-09-23T08:00:00Z"), 20, quiz.closesAt)).toEqual(at("2026-09-23T08:20:00Z"));
  });

  it("uses the closing time when the quiz closes before the time limit ends", () => {
    expect(computeDeadline(at("2026-09-27T05:55:00Z"), 20, quiz.closesAt)).toEqual(quiz.closesAt);
  });
});

describe("windowState", () => {
  it("is upcoming before opensAt", () => {
    expect(windowState(quiz, at("2026-09-20T05:59:59Z"))).toBe("upcoming");
  });

  it("is open exactly at opensAt", () => {
    expect(windowState(quiz, quiz.opensAt)).toBe("open");
  });

  it("is closed exactly at closesAt", () => {
    expect(windowState(quiz, quiz.closesAt)).toBe("closed");
  });
});

describe("remainingMs", () => {
  it("returns the time left before the deadline", () => {
    expect(remainingMs(at("2026-09-23T08:20:00Z"), at("2026-09-23T08:19:30Z"))).toBe(30_000);
  });

  it("never returns a negative value after the deadline", () => {
    expect(remainingMs(at("2026-09-23T08:20:00Z"), at("2026-09-23T09:00:00Z"))).toBe(0);
  });
});

describe("isReviewOpen", () => {
  it("is closed while the quiz window is open", () => {
    expect(isReviewOpen(quiz, at("2026-09-26T00:00:00Z"))).toBe(false);
  });

  it("opens once the quiz window has closed", () => {
    expect(isReviewOpen(quiz, quiz.closesAt)).toBe(true);
  });
});
