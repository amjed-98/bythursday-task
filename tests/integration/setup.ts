import { sql } from "drizzle-orm";
import { afterAll, beforeEach } from "vitest";
import { createDb } from "@/db/client";
import { TEST_DATABASE_URL } from "./test-db-url";

const connection = createDb(TEST_DATABASE_URL, 25);
export const testDb = connection.db;

beforeEach(async () => {
  await testDb.execute(
    sql`truncate table answers, attempts, options, questions, quiz_classes, quizzes, users, classes restart identity cascade`,
  );
});

afterAll(async () => {
  await connection.close();
});
