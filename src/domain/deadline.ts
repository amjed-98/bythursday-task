const MS_PER_MINUTE = 60_000;

export type QuizWindow = { opensAt: Date; closesAt: Date };
export type WindowState = "upcoming" | "open" | "closed";

export function computeDeadline(startedAt: Date, timeLimitMinutes: number, closesAt: Date): Date {
  return new Date(Math.min(startedAt.getTime() + timeLimitMinutes * MS_PER_MINUTE, closesAt.getTime()));
}

export function windowState(quiz: QuizWindow, now: Date): WindowState {
  if (now < quiz.opensAt) return "upcoming";
  if (now >= quiz.closesAt) return "closed";
  return "open";
}

export function remainingMs(deadline: Date, now: Date): number {
  return Math.max(0, deadline.getTime() - now.getTime());
}

export function isPastDeadline(deadline: Date, now: Date): boolean {
  return now >= deadline;
}

export function isReviewOpen(quiz: Pick<QuizWindow, "closesAt">, now: Date): boolean {
  return now >= quiz.closesAt;
}
