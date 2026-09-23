import { describe, expect, it } from "vitest";
import { startAttempt, submitAttempt } from "@/server/attempts";
import { getStudentDashboard } from "@/server/dashboard";
import { createClass, createQuiz, createUser, hoursFrom, minutesFrom, NOW } from "./factories";
import { testDb } from "./setup";

async function setup() {
  const classId = await createClass();
  const otherClassId = await createClass();
  const teacher = await createUser("teacher");
  const student = await createUser("student", classId);
  const make = (opensAt: Date, closesAt: Date, classIds = [classId]) =>
    createQuiz({ classIds, teacherId: teacher.id, opensAt, closesAt });
  return { classId, otherClassId, student, make };
}

const idsOf = (cards: { id: number }[]) => cards.map((c) => c.id);

describe("student dashboard", () => {
  it("sorts assigned quizzes into available, upcoming and completed", async () => {
    const { student, make } = await setup();
    const open = await make(hoursFrom(NOW, -1), hoursFrom(NOW, 5));
    const upcoming = await make(hoursFrom(NOW, 2), hoursFrom(NOW, 5));
    const done = await make(hoursFrom(NOW, -1), hoursFrom(NOW, 5));
    const { attemptId } = await startAttempt(testDb, student, done.quizId, NOW);
    await submitAttempt(testDb, student, attemptId, minutesFrom(NOW, 3));

    const dashboard = await getStudentDashboard(testDb, student, minutesFrom(NOW, 5));

    expect(idsOf(dashboard.available)).toEqual([open.quizId]);
    expect(idsOf(dashboard.upcoming)).toEqual([upcoming.quizId]);
    expect(idsOf(dashboard.completed)).toEqual([done.quizId]);
  });

  it("excludes quizzes assigned only to other classes", async () => {
    const { student, make, otherClassId } = await setup();
    await make(hoursFrom(NOW, -1), hoursFrom(NOW, 5), [otherClassId]);

    const dashboard = await getStudentDashboard(testDb, student, NOW);

    expect(dashboard.available).toHaveLength(0);
  });

  it("keeps an in-progress attempt under available so the student can resume", async () => {
    const { student, make } = await setup();
    const quiz = await make(hoursFrom(NOW, -1), hoursFrom(NOW, 5));
    await startAttempt(testDb, student, quiz.quizId, NOW);

    const dashboard = await getStudentDashboard(testDb, student, minutesFrom(NOW, 1));

    expect(dashboard.available[0]).toMatchObject({ id: quiz.quizId, attemptStatus: "in_progress" });
  });

  it("moves an attempt whose time ran out to completed as expired", async () => {
    const { student, make } = await setup();
    const quiz = await make(hoursFrom(NOW, -1), hoursFrom(NOW, 5));
    await startAttempt(testDb, student, quiz.quizId, NOW);

    const dashboard = await getStudentDashboard(testDb, student, minutesFrom(NOW, 25));

    expect(dashboard.completed[0]).toMatchObject({ id: quiz.quizId, attemptStatus: "expired", scoreCenti: 0 });
  });

  it("lists a closed quiz the student never took under completed with no attempt", async () => {
    const { student, make } = await setup();
    const quiz = await make(hoursFrom(NOW, -5), hoursFrom(NOW, -1));

    const dashboard = await getStudentDashboard(testDb, student, NOW);

    expect(dashboard.completed[0]).toMatchObject({ id: quiz.quizId, attemptStatus: null });
  });
});
