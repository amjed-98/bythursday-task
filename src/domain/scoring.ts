export const CENTI_PER_POINT = 100;

export type ScorableQuestion = { id: number; points: number; correctOptionId: number };

export type AttemptScore = {
  scoreCenti: number;
  maxScoreCenti: number;
  correct: number;
  wrong: number;
  blank: number;
};

/**
 * Integer centi-points keep a 25% penalty on a 1-point question exact (25), avoiding float drift.
 * A wrong answer costs points * penaltyPercent centi-points, i.e. penalty% of the question's points.
 */
export function scoreAttempt(
  questions: readonly ScorableQuestion[],
  answers: ReadonlyMap<number, number | null>,
  penaltyPercent: number,
): AttemptScore {
  const tally = questions.reduce(
    (acc, question) => {
      const chosen = answers.get(question.id) ?? null;
      if (chosen === null) return { ...acc, blank: acc.blank + 1 };
      if (chosen === question.correctOptionId) {
        return { ...acc, raw: acc.raw + question.points * CENTI_PER_POINT, correct: acc.correct + 1 };
      }
      return { ...acc, raw: acc.raw - question.points * penaltyPercent, wrong: acc.wrong + 1 };
    },
    { raw: 0, correct: 0, wrong: 0, blank: 0 },
  );

  return {
    scoreCenti: Math.max(0, tally.raw),
    maxScoreCenti: questions.reduce((sum, q) => sum + q.points * CENTI_PER_POINT, 0),
    correct: tally.correct,
    wrong: tally.wrong,
    blank: tally.blank,
  };
}

export function formatCenti(centi: number): string {
  return String(centi / CENTI_PER_POINT);
}
