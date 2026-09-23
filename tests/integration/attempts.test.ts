import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { answers, attempts } from "@/db/schema";
import { DomainError } from "@/domain/errors";
import {
  getAttemptResult,
  getAttemptView,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from "@/server/attempts";
import { createStandardSetup, createUser, hoursFrom, minutesFrom, NOW } from "./factories";
import { testDb } from "./setup";

const expectCode = async (promise: Promise<unknown>, code: DomainError["code"]) => {
  await expect(promise).rejects.toMatchObject({ name: "DomainError", code });
};

describe("one attempt per student per quiz", () => {
  it("creates exactly one attempt under 20 concurrent start requests", async () => {
    const { student, quiz } = await createStandardSetup();

    const results = await Promise.all(
      Array.from({ length: 20 }, () => startAttempt(testDb, student, quiz.quizId, NOW)),
    );

    const rows = await testDb.select().from(attempts).where(eq(attempts.quizId, quiz.quizId));
    expect(rows).toHaveLength(1);
    expect(new Set(results.map((r) => r.attemptId))).toEqual(new Set([rows[0]!.id]));
  });

  it("resumes the same attempt with the same deadline when started again later", async () => {
    const { student, quiz } = await createStandardSetup();
    const first = await startAttempt(testDb, student, quiz.quizId, NOW);

    const second = await startAttempt(testDb, student, quiz.quizId, minutesFrom(NOW, 5));
    const view = await getAttemptView(testDb, student, quiz.quizId, minutesFrom(NOW, 5));

    expect(second.attemptId).toBe(first.attemptId);
    expect(view?.deadline).toBe(minutesFrom(NOW, 20).toISOString());
    expect(view?.remainingMs).toBe(15 * 60_000);
  });

  it("does not allow a new attempt after the first one was submitted", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    await submitAttempt(testDb, student, attemptId, minutesFrom(NOW, 1));

    const again = await startAttempt(testDb, student, quiz.quizId, minutesFrom(NOW, 2));
    const view = await getAttemptView(testDb, student, quiz.quizId, minutesFrom(NOW, 2));

    expect(again.attemptId).toBe(attemptId);
    expect(view?.status).toBe("submitted");
  });
});

describe("deadline enforcement", () => {
  it("caps the deadline at the quiz closing time", async () => {
    const { student, quiz } = await createStandardSetup({ closesAt: minutesFrom(NOW, 5) });

    await startAttempt(testDb, student, quiz.quizId, NOW);
    const view = await getAttemptView(testDb, student, quiz.quizId, NOW);

    expect(view?.deadline).toBe(minutesFrom(NOW, 5).toISOString());
  });

  it("rejects an answer saved after the deadline", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    const question = quiz.questions[0]!;

    await expectCode(
      saveAnswer(
        testDb,
        student,
        { attemptId, questionId: question.id, optionId: question.correctOptionId },
        minutesFrom(NOW, 20),
      ),
      "ATTEMPT_CLOSED",
    );
    const saved = await testDb.select().from(answers).where(eq(answers.attemptId, attemptId));
    expect(saved).toHaveLength(0);
  });

  it("rejects a replay of an earlier valid save once the deadline has passed", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    const question = quiz.questions[0]!;
    const payload = { attemptId, questionId: question.id, optionId: question.wrongOptionId };
    await saveAnswer(testDb, student, payload, minutesFrom(NOW, 1));

    await expectCode(
      saveAnswer(testDb, student, { ...payload, optionId: question.correctOptionId }, minutesFrom(NOW, 21)),
      "ATTEMPT_CLOSED",
    );
    const [saved] = await testDb.select().from(answers).where(eq(answers.attemptId, attemptId));
    expect(saved?.optionId).toBe(question.wrongOptionId);
  });

  it("finalises an expired attempt as expired when it is next read, scoring saved answers", async () => {
    const { student, quiz } = await createStandardSetup({ points: [2, 3] });
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    const question = quiz.questions[0]!;
    await saveAnswer(
      testDb,
      student,
      { attemptId, questionId: question.id, optionId: question.correctOptionId },
      minutesFrom(NOW, 1),
    );

    const view = await getAttemptView(testDb, student, quiz.quizId, minutesFrom(NOW, 30));
    const result = await getAttemptResult(testDb, student, quiz.quizId, minutesFrom(NOW, 30));

    expect(view?.status).toBe("expired");
    expect(result.score).toMatchObject({ scoreCenti: 200, maxScoreCenti: 500, correct: 1, blank: 1 });
  });

  it("marks a submit that arrives after the deadline as expired instead of failing", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);

    await submitAttempt(testDb, student, attemptId, minutesFrom(NOW, 20.05));

    const [row] = await testDb.select().from(attempts).where(eq(attempts.id, attemptId));
    expect(row?.status).toBe("expired");
  });
});

describe("answer validation", () => {
  it("rejects an option that belongs to a different question", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    const [first, second] = quiz.questions;

    await expectCode(
      saveAnswer(
        testDb,
        student,
        { attemptId, questionId: first!.id, optionId: second!.correctOptionId },
        minutesFrom(NOW, 1),
      ),
      "INVALID_ANSWER",
    );
  });

  it("rejects saving into another student's attempt", async () => {
    const { student, quiz, classId } = await createStandardSetup();
    const intruder = await createUser("student", classId);
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    const question = quiz.questions[0]!;

    await expectCode(
      saveAnswer(
        testDb,
        intruder,
        { attemptId, questionId: question.id, optionId: question.correctOptionId },
        minutesFrom(NOW, 1),
      ),
      "FORBIDDEN",
    );
  });

  it("clears an answer when saved as blank", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    const question = quiz.questions[0]!;
    await saveAnswer(testDb, student, { attemptId, questionId: question.id, optionId: question.correctOptionId }, NOW);

    await saveAnswer(testDb, student, { attemptId, questionId: question.id, optionId: null }, minutesFrom(NOW, 1));

    const view = await getAttemptView(testDb, student, quiz.quizId, minutesFrom(NOW, 1));
    expect(view?.answers[question.id]).toBeNull();
  });
});

describe("quiz access for students", () => {
  it("hides a quiz that is not assigned to the student's class", async () => {
    const { quiz, otherClassId } = await createStandardSetup();
    const outsider = await createUser("student", otherClassId);

    await expectCode(startAttempt(testDb, outsider, quiz.quizId, NOW), "NOT_FOUND");
  });

  it("refuses to start a quiz before it opens", async () => {
    const { student, quiz } = await createStandardSetup({ opensAt: hoursFrom(NOW, 1), closesAt: hoursFrom(NOW, 5) });

    await expectCode(startAttempt(testDb, student, quiz.quizId, NOW), "NOT_OPEN");
  });

  it("refuses to start a quiz after it closes", async () => {
    const { student, quiz } = await createStandardSetup({ opensAt: hoursFrom(NOW, -5), closesAt: hoursFrom(NOW, -1) });

    await expectCode(startAttempt(testDb, student, quiz.quizId, NOW), "NOT_OPEN");
  });

  it("does not let teachers start attempts", async () => {
    const { teacher, quiz } = await createStandardSetup();

    await expectCode(startAttempt(testDb, teacher, quiz.quizId, NOW), "FORBIDDEN");
  });
});

describe("answer secrecy", () => {
  it("never includes correctness data in the attempt view", async () => {
    const { student, quiz } = await createStandardSetup();
    await startAttempt(testDb, student, quiz.quizId, NOW);

    const view = await getAttemptView(testDb, student, quiz.quizId, NOW);

    expect(JSON.stringify(view)).not.toMatch(/isCorrect|correct/i);
  });

  it("withholds the per-question review until the quiz window closes", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    await submitAttempt(testDb, student, attemptId, minutesFrom(NOW, 2));

    const result = await getAttemptResult(testDb, student, quiz.quizId, minutesFrom(NOW, 3));

    expect(result.review).toBeNull();
    expect(result.score).not.toBeNull();
  });

  it("opens the per-question review after the quiz window closes", async () => {
    const { student, quiz } = await createStandardSetup();
    const { attemptId } = await startAttempt(testDb, student, quiz.quizId, NOW);
    await submitAttempt(testDb, student, attemptId, minutesFrom(NOW, 2));

    const result = await getAttemptResult(testDb, student, quiz.quizId, hoursFrom(NOW, 25));

    expect(result.review).toHaveLength(quiz.questions.length);
  });
});
