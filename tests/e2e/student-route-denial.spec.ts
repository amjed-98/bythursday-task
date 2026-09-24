import { expect, test, type Page } from "@playwright/test";
import { login, signOut } from "./helpers";

const SEEDED_TEACHER = { username: "t.rana", password: "teacher123" };
const SEEDED_STUDENT = { username: "layla.khatib", password: "student123" };

async function findTeacherQuizId(page: Page): Promise<string> {
  await login(page, SEEDED_TEACHER.username, SEEDED_TEACHER.password);
  const href = await page.locator('a[href$="/results"]').first().getAttribute("href");
  const quizId = href?.match(/\/quizzes\/(\d+)\/results$/)?.[1];
  if (!quizId) throw new Error("The seeded teacher has no quiz to probe");
  await signOut(page);
  return quizId;
}

test("a student is sent home from every teacher and admin page", async ({ page }) => {
  const quizId = await findTeacherQuizId(page);
  await login(page, SEEDED_STUDENT.username, SEEDED_STUDENT.password);
  const forbiddenPages = [
    "/teacher",
    "/teacher/quizzes/new",
    "/teacher/quizzes/import",
    `/quizzes/${quizId}/edit`,
    `/quizzes/${quizId}/results`,
    "/admin",
    "/admin/users",
    "/admin/import",
  ];

  const landedOn: Record<string, string> = {};
  for (const path of forbiddenPages) {
    await page.goto(path);
    landedOn[path] = new URL(page.url()).pathname;
  }

  expect(landedOn).toEqual(Object.fromEntries(forbiddenPages.map((path) => [path, "/student"])));
});

test("a student cannot download a quiz's results as csv", async ({ page }) => {
  const quizId = await findTeacherQuizId(page);
  await login(page, SEEDED_STUDENT.username, SEEDED_STUDENT.password);

  const response = await page.request.get(`/quizzes/${quizId}/results/export`, { maxRedirects: 0 });

  expect(response.headers()["content-type"] ?? "").not.toContain("text/csv");
});
