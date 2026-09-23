import type { z } from "zod";

/** Turns zod issues into sentences a teacher can act on, e.g. "Question 3: Every option needs text". */
export function formatIssues(issues: readonly z.core.$ZodIssue[]): string[] {
  return issues.map((issue) => {
    const [field, index] = issue.path;
    if (field === "questions" && typeof index === "number") return `Question ${index + 1}: ${issue.message}`;
    return issue.message;
  });
}
