import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/db/client";

export async function runMigrations(url: string): Promise<void> {
  const { db, close } = createDb(url, 1);
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
  } finally {
    await close();
  }
}

const isEntrypoint = process.argv[1]?.endsWith("migrate.ts");
if (isEntrypoint) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  await runMigrations(url);
  console.log("Migrations applied");
}
