import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export function createDb(url: string, maxConnections = 10): { db: Db; close: () => Promise<void> } {
  // Notices are informational (e.g. the migrator's "already exists, skipping"); errors still throw.
  const client = postgres(url, { max: maxConnections, onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

const globalForDb = globalThis as unknown as { appDb?: Db };

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env or run via docker compose.");
  return url;
}

export function getDb(): Db {
  globalForDb.appDb ??= createDb(requireDatabaseUrl()).db;
  return globalForDb.appDb;
}
