import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP_DIR = join(process.cwd(), "src/app");
const PUBLIC_PREFIXES = ["login/", "api/auth/"];

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const protectedFiles = listFiles(APP_DIR)
  .map((path) => relative(APP_DIR, path))
  .filter((path) => !PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix)));

const byName = (name: string) => protectedFiles.filter((path) => path.endsWith(`/${name}`) || path === name);
const source = (path: string) => readFileSync(join(APP_DIR, path), "utf8");

/** Middleware only redirects; these checks are the server-side guard that stays if the matcher ever misses a path. */
describe("server-side guards", () => {
  it.each(byName("page.tsx"))("page %s calls requireActor", (path) => {
    expect(source(path)).toMatch(/requireActor\(/);
  });

  it.each(byName("actions.ts"))("every server action in %s calls requireActor", (path) => {
    const actionBodies = source(path).split(/export async function /).slice(1);
    const unguarded = actionBodies.filter((body) => !/requireActor\(/.test(body)).map((body) => body.split("(")[0]);

    expect(actionBodies.length).toBeGreaterThan(0);
    expect(unguarded).toEqual([]);
  });

  it.each(byName("route.ts"))("route handler %s reads the session", (path) => {
    expect(source(path)).toMatch(/\bauth\(\)/);
  });
});
