import { describe, expect, it } from "vitest";
import type { QuizInput } from "@/domain/quiz-input";
import { getAttemptView, saveAnswer, startAttempt, submitAttempt } from "@/server/attempts";
import { createQuiz, getQuizForEdit, listQuizzesForActor, updateQuiz } from "@/server/quizzes";
import { createClass, createUser, hoursFrom, minutesFrom, NOW } from "./factories";
import { testDb } from "./setup";

const quizInput = (classIds: number[], overrides: Partial<QuizInput> = {}): QuizInput => ({
  title: "Fractions",
  classIds,
  timeLimitMinutes: 20,
  opensAt: hoursFrom(NOW, -1),
  closesAt: hoursFrom(NOW, 24),
  penaltyPercent: 25,
  questions: [
    { text: "1/2 + 1/2 = ?", points: 2, options: ["1", "2", "1/4", "0"], correctIndex: 0 },
    { text: "1/3 of 9 = ?", points: 1, options: ["2", "3", "6", "9"], correctIndex: 1 },
  ],
  ...overrides,
});

async function setup() {
  const classId = await createClass();
  const owner = await createUser("teacher");
  const otherTeacher = await createUser("teacher");
  const admin = await createUser("admin");
  const student = await createUser("student", classId);
  const quizId = await createQuiz(testDb, owner, quizInput([classId]));
  return { classId, owner, otherTeacher, admin, student, quizId };
}

const expectCode = (promise: Promise<unknown>, code: string) =>
  expect(promise).rejects.toMatchObject({ name: "DomainError", code });

describe("quiz ownership", () => {
  it("round-trips a created quiz for its owner", async () => {
    const { owner, quizId, classId } = await setup();

    const loaded = await getQuizForEdit(testDb, owner, quizId);

    expect(loaded).toMatchObject({ ...quizInput([classId]), id: quizId, isLocked: false });
  });

  it("forbids another teacher from viewing the quiz", async () => {
    const { otherTeacher, quizId } = await setup();

    await expectCode(getQuizForEdit(testDb, otherTeacher, quizId), "FORBIDDEN");
  });

  it("forbids another teacher from editing the quiz", async () => {
    const { otherTeacher, quizId, classId } = await setup();

    await expectCode(updateQuiz(testDb, otherTeacher, quizId, quizInput([classId], { title: "Hijacked" })), "FORBIDDEN");
  });

  it("lets the admin view any quiz", async () => {
    const { admin, quizId } = await setup();

    await expect(getQuizForEdit(testDb, admin, quizId)).resolves.toMatchObject({ id: quizId });
  });

  it("forbids students from creating quizzes", async () => {
    const { student, classId } = await setup();

    await expectCode(createQuiz(testDb, student, quizInput([classId])), "FORBIDDEN");
  });

  it("lists only the teacher's own quizzes", async () => {
    const { otherTeacher, classId } = await setup();
    const theirs = await createQuiz(testDb, otherTeacher, quizInput([classId], { title: "Theirs" }));

    const list = await listQuizzesForActor(testDb, otherTeacher);

    expect(list.map((q) => q.id)).toEqual([theirs]);
  });

  it("filters the admin list by class", async () => {
    const { admin, owner, quizId } = await setup();
    const otherClass = await createClass();
    await createQuiz(testDb, owner, quizInput([otherClass], { title: "Other class" }));

    const list = await listQuizzesForActor(testDb, admin, { classId: otherClass });

    expect(list.map((q) => q.id)).not.toContain(quizId);
    expect(list).toHaveLength(1);
  });
});

describe("editing rules", () => {
  it("replaces questions while no attempt exists", async () => {
    const { owner, quizId, classId } = await setup();
    const questions = [{ text: "New?", points: 5, options: ["a", "b", "c", "d"] as [string, string, string, string], correctIndex: 3 }];

    await updateQuiz(testDb, owner, quizId, quizInput([classId], { questions }));

    expect((await getQuizForEdit(testDb, owner, quizId)).questions).toEqual(questions);
  });

  it("locks questions once a student has started", async () => {
    const { owner, student, quizId, classId } = await setup();
    await startAttempt(testDb, student, quizId, NOW);
    const questions = [{ text: "Changed", points: 1, options: ["a", "b", "c", "d"] as [string, string, string, string], correctIndex: 0 }];

    await expectCode(updateQuiz(testDb, owner, quizId, quizInput([classId], { questions })), "LOCKED");
  });

  it("locks the penalty once a student has started", async () => {
    const { owner, student, quizId, classId } = await setup();
    await startAttempt(testDb, student, quizId, NOW);

    await expectCode(updateQuiz(testDb, owner, quizId, quizInput([classId], { penaltyPercent: 0 })), "LOCKED");
  });

  it("still allows title and schedule changes on a locked quiz", async () => {
    const { owner, student, quizId, classId } = await setup();
    await startAttempt(testDb, student, quizId, NOW);

    await updateQuiz(testDb, owner, quizId, quizInput([classId], { title: "Renamed", closesAt: hoursFrom(NOW, 48) }));

    expect(await getQuizForEdit(testDb, owner, quizId)).toMatchObject({ title: "Renamed", isLocked: true });
  });

  it("rejects an answer saved after an earlier close time set mid-attempt", async () => {
    const { owner, student, quizId, classId } = await setup();
    await startAttempt(testDb, student, quizId, NOW);
    const view = (await getAttemptView(testDb, student, quizId, NOW))!;
    const question = view.questions[0]!;
    await updateQuiz(testDb, owner, quizId, quizInput([classId], { closesAt: minutesFrom(NOW, 5) }));

    await expectCode(
      saveAnswer(testDb, student, { attemptId: view.attemptId, questionId: question.id, optionId: question.options[0]!.id }, minutesFrom(NOW, 6)),
      "ATTEMPT_CLOSED",
    );
  });

  it("keeps the review closed while an attempt started before an earlier close time is still running", async () => {
    const { owner, student, quizId, classId } = await setup();
    const finisher = await createUser("student", classId);
    const { attemptId } = await startAttempt(testDb, finisher, quizId, NOW);
    await submitAttempt(testDb, finisher, attemptId, minutesFrom(NOW, 1));
    await startAttempt(testDb, student, quizId, minutesFrom(NOW, 2));
    await updateQuiz(testDb, owner, quizId, quizInput([classId], { closesAt: minutesFrom(NOW, 5) }));

    const view = await getAttemptView(testDb, student, quizId, minutesFrom(NOW, 6));

    expect(view?.status).toBe("expired");
  });

  it("rejects an unknown class id", async () => {
    const { owner } = await setup();

    await expectCode(createQuiz(testDb, owner, quizInput([99999])), "VALIDATION");
  });
});
