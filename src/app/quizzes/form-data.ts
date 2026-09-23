import { z } from "zod";

const questionsJsonSchema = z.string().transform((value, ctx) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    ctx.addIssue({ code: "custom", message: "Questions could not be read" });
    return z.NEVER;
  }
});

export function readQuizMeta(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    classIds: formData.getAll("classIds").map(Number),
    timeLimitMinutes: String(formData.get("timeLimitMinutes") ?? ""),
    penaltyPercent: String(formData.get("penaltyPercent") ?? ""),
    opensAt: String(formData.get("opensAt") ?? ""),
    closesAt: String(formData.get("closesAt") ?? ""),
  };
}

export function readQuestionsJson(formData: FormData): unknown {
  const parsed = questionsJsonSchema.safeParse(String(formData.get("questions") ?? "[]"));
  return parsed.success ? parsed.data : [];
}
