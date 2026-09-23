import { utcToAmmanInput } from "@/domain/time";
import type { QuizForEdit } from "@/server/quizzes";
import type { QuizMetaDefaults } from "./quiz-meta-fields";

const DEFAULT_TIME_LIMIT_MINUTES = 20;
const DEFAULT_OPEN_DAYS = 7;
const DAY_MS = 86_400_000;

export function newQuizDefaults(now: Date): QuizMetaDefaults {
  return {
    title: "",
    classIds: [],
    timeLimitMinutes: DEFAULT_TIME_LIMIT_MINUTES,
    penaltyPercent: 0,
    opensAt: utcToAmmanInput(now),
    closesAt: utcToAmmanInput(new Date(now.getTime() + DEFAULT_OPEN_DAYS * DAY_MS)),
  };
}

export function editQuizDefaults(quiz: QuizForEdit): QuizMetaDefaults {
  return {
    title: quiz.title,
    classIds: quiz.classIds,
    timeLimitMinutes: quiz.timeLimitMinutes,
    penaltyPercent: quiz.penaltyPercent,
    opensAt: utcToAmmanInput(quiz.opensAt),
    closesAt: utcToAmmanInput(quiz.closesAt),
  };
}
