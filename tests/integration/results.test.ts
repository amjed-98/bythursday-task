import { describe, expect, it } from "vitest";
import { saveAnswer, startAttempt, submitAttempt } from "@/server/attempts";
import { getQuizResults, resultsToCsv } from "@/server/results";
import { createStandardSetup, createUser, minutesFrom, NOW } from "./factories";
import { testDb } from "./setup";

async function setupWithAttempts() {
  const setup = await createStandardSetup({ points: [2, 2], penaltyPercent: 50 });
  const { student, quiz, classId } = setup;
  const idle = await createUser("student", classId);
  const [first, second] = quiz.questions;
  const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
  await saveAnswer(testDb, student, { attemptId, questionId: first!.id, optionId: first!.correctOptionId }, NOW);
  await saveAnswer(testDb, student, { attemptId, questionId: second!.id, optionId: second!.wrongOptionId }, NOW);
  await submitAttempt(testDb, student, attemptId, minutesFrom(NOW, 6));
  return { ...setup, idle };
}

describe("quiz results", () => {
  it("lists every assigned student with status, score and time taken", async () => {
    const { owner, student, idle, quiz } = await setupWithAttempts().then((s) => ({ ...s, owner: s.teacher }));

    const results = await getQuizResults(testDb, owner, quiz.quizId, minutesFrom(NOW, 10));

    expect(results.rows.find((r) => r.studentId === student.id)).toMatchObject({
      status: "submitted",
      scoreCenti: 100,
      timeTakenSeconds: 360,
    });
    expect(results.rows.find((r) => r.studentId === idle.id)).toMatchObject({ status: "not_started", scoreCenti: null });
  });

  it("computes per-question percent correct over finished attempts", async () => {
    const { teacher, quiz } = await setupWithAttempts();

    const results = await getQuizResults(testDb, teacher, quiz.quizId, minutesFrom(NOW, 10));

    expect(results.questionStats.map((s) => s.percentCorrect)).toEqual([100, 0]);
  });

  it("forbids another teacher from viewing results", async () => {
    const { quiz } = await setupWithAttempts();
    const outsider = await createUser("teacher");

    await expect(getQuizResults(testDb, outsider, quiz.quizId, NOW)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("forbids students from viewing results", async () => {
    const { quiz, student } = await setupWithAttempts();

    await expect(getQuizResults(testDb, student, quiz.quizId, NOW)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets the admin view results", async () => {
    const { quiz } = await setupWithAttempts();
    const admin = await createUser("admin");

    await expect(getQuizResults(testDb, admin, quiz.quizId, NOW)).resolves.toMatchObject({ quiz: { id: quiz.quizId } });
  });

  it("finalises attempts whose time ran out before reporting", async () => {
    const { teacher, quiz, idle } = await setupWithAttempts();
    await startAttempt(testDb, idle, quiz.quizId, NOW);

    const results = await getQuizResults(testDb, teacher, quiz.quizId, minutesFrom(NOW, 30));

    expect(results.rows.find((r) => r.studentId === idle.id)?.status).toBe("expired");
  });

  it("exports a CSV with a BOM and one line per student", async () => {
    const { teacher, quiz } = await setupWithAttempts();
    const results = await getQuizResults(testDb, teacher, quiz.quizId, minutesFrom(NOW, 10));

    const csv = resultsToCsv(results);

    expect(csv.startsWith("﻿Name,")).toBe(true);
    expect(csv.trim().split("\r\n")).toHaveLength(1 + results.rows.length);
  });
});
