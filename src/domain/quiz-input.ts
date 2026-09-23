import { z } from "zod";
import { ammanInputToUtc } from "./time";

export const OPTIONS_PER_QUESTION = 4;
export const MAX_QUESTIONS = 100;
export const MAX_POINTS = 100;
export const MAX_TIME_LIMIT_MINUTES = 300;

const optionText = z.string().trim().min(1, "Every option needs text").max(500);

export const questionInputSchema = z.object({
  text: z.string().trim().min(1, "Question text is required").max(2000),
  points: z.coerce.number().int("Points must be a whole number").min(1).max(MAX_POINTS),
  options: z.tuple([optionText, optionText, optionText, optionText]),
  correctIndex: z.coerce.number().int().min(0).max(OPTIONS_PER_QUESTION - 1),
});

const quizFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  classIds: z.array(z.coerce.number().int().positive()).min(1, "Assign at least one class"),
  timeLimitMinutes: z.coerce.number().int().min(1).max(MAX_TIME_LIMIT_MINUTES),
  penaltyPercent: z.coerce.number().int().min(0).max(100),
  questions: z.array(questionInputSchema).min(1, "Add at least one question").max(MAX_QUESTIONS),
};

const windowIsOrdered = (quiz: { opensAt: Date; closesAt: Date }) => quiz.closesAt > quiz.opensAt;
const WINDOW_ORDER_ISSUE = { message: "The quiz must close after it opens", path: ["closesAt"] };

export const quizInputSchema = z
  .object({ ...quizFields, opensAt: z.date(), closesAt: z.date() })
  .refine(windowIsOrdered, WINDOW_ORDER_ISSUE);

export type QuizInput = z.infer<typeof quizInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;

const ammanDateTime = z.string().transform((value, ctx) => {
  try {
    return ammanInputToUtc(value);
  } catch {
    ctx.addIssue({ code: "custom", message: "Enter a valid date and time" });
    return z.NEVER;
  }
});

/** Same rules as quizInputSchema, but dates arrive as Amman wall-clock strings from datetime-local inputs. */
export const quizFormSchema = z
  .object({ ...quizFields, opensAt: ammanDateTime, closesAt: ammanDateTime })
  .refine(windowIsOrdered, WINDOW_ORDER_ISSUE);

export type QuizFormValues = z.input<typeof quizFormSchema>;
