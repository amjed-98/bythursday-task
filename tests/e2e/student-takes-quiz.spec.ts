import { expect, test, type Page } from "@playwright/test";
import { login, signOut } from "./helpers";

const ENGLISH_QUIZ_TITLE = "English Vocabulary — Unit 3";
const STUDENT_PASSWORD = "e2e-pass-123";

/** A fresh student per run keeps the one-attempt rule from failing re-runs, and exercises the import UI. */
async function importFreshStudent(page: Page): Promise<string> {
  const username = `e2e.${Date.now()}`;
  await login(page, "admin", "admin123");
  await page.goto("/admin/import");
  await page.getByLabel("Spreadsheet (.xlsx or .csv)").setInputFiles({
    name: "students.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`username,password,full_name,full_name_latin,class\n${username},${STUDENT_PASSWORD},طالب تجريبي,E2E Student,10A\n`),
  });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("1 created")).toBeVisible();
  await signOut(page);
  return username;
}

test("a student logs in, takes a quiz, submits and sees the score", async ({ page }) => {
  const username = await importFreshStudent(page);
  await login(page, username, STUDENT_PASSWORD);
  await expect(page.getByRole("heading", { name: "My quizzes" })).toBeVisible();

  const card = page.getByRole("listitem").filter({ hasText: ENGLISH_QUIZ_TITLE });
  await card.getByRole("link", { name: "Open quiz" }).click();
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.getByRole("timer")).toBeVisible();

  const questionCount = await page.getByRole("navigation", { name: "Questions" }).getByRole("button").count();
  for (let i = 0; i < questionCount; i += 1) {
    await page.getByRole("radio").first().click();
    await expect(page.getByText("Saved")).toBeVisible();
    if (i < questionCount - 1) await page.getByRole("button", { name: "Next" }).click();
  }

  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("button", { name: "Submit now" }).click();

  await expect(page.getByText("Your score")).toBeVisible();
  await expect(page.getByTestId("score")).toContainText("/ 21");
  const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(hasHorizontalScroll).toBe(false);

  await page.goto("/teacher");
  await expect(page).toHaveURL(/\/student$/);
});
