import postgres from "postgres";
import { runMigrations } from "../../scripts/migrate";
import { TEST_DATABASE_URL } from "./test-db-url";

export default async function setup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const databaseName = url.pathname.slice(1);
  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = "/postgres";

  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
  try {
    const existing = await admin`select 1 from pg_database where datname = ${databaseName}`;
    if (existing.length === 0) await admin.unsafe(`create database "${databaseName}"`);
  } finally {
    await admin.end();
  }
  await runMigrations(TEST_DATABASE_URL);
}
