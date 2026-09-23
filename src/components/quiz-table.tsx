import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { windowState } from "@/domain/deadline";
import { formatAmman } from "@/domain/time";
import type { QuizListItem } from "@/server/quizzes";

type QuizTableProps = { quizzes: QuizListItem[]; now: Date; showTeacher?: boolean };

export function QuizTable({ quizzes, now, showTeacher = false }: QuizTableProps) {
  if (quizzes.length === 0) {
    return <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">No quizzes yet.</p>;
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {quizzes.map((quiz) => (
        <li key={quiz.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 dir="auto" className="min-w-0 break-words font-semibold">
                {quiz.title}
              </h3>
              <StatusBadge status={windowState(quiz, now)} />
            </div>
            <p className="text-sm text-muted">
              {quiz.classNames.join(", ") || "No class"} · {quiz.questionCount} questions · {quiz.timeLimitMinutes} min
              {quiz.penaltyPercent > 0 && ` · −${quiz.penaltyPercent}%`}
              {showTeacher && (
                <>
                  {" · "}
                  <span dir="auto">{quiz.teacherName}</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted">
              {formatAmman(quiz.opensAt)} → {formatAmman(quiz.closesAt)} · {quiz.attemptCount} attempt
              {quiz.attemptCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/quizzes/${quiz.id}/results`} className="inline-flex min-h-10 items-center rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong">
              Results
            </Link>
            <Link href={`/quizzes/${quiz.id}/edit`} className="inline-flex min-h-10 items-center rounded-xl border border-line px-3 text-sm font-semibold hover:border-brand">
              Edit
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
