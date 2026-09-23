import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonClass, cardClass } from "@/components/ui";
import { getDb } from "@/db/client";
import { isDomainError } from "@/domain/errors";
import { formatAmman } from "@/domain/time";
import { requireActor } from "@/lib/session";
import { getAttemptView } from "@/server/attempts";
import { getQuizIntro } from "@/server/dashboard";
import { startAttemptAction } from "../../actions";
import { QuizRunner } from "./quiz-runner";

type PageProps = { params: Promise<{ quizId: string }>; searchParams: Promise<{ error?: string }> };

const START_ERRORS: Record<string, string> = {
  NOT_OPEN: "This quiz is not open right now.",
  NOT_FOUND: "This quiz is not assigned to your class.",
};

export default async function QuizPage({ params, searchParams }: PageProps) {
  const actor = await requireActor(["student"]);
  const quizId = Number((await params).quizId);
  if (!Number.isInteger(quizId)) notFound();
  const { error } = await searchParams;
  const now = new Date();
  const db = getDb();

  const view = await getAttemptView(db, actor, quizId, now).catch((e: unknown) => {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  if (view && view.status !== "in_progress") redirect(`/student/quiz/${quizId}/result`);
  if (view) return <QuizRunner view={view} />;

  const intro = await getQuizIntro(db, actor, quizId, now);
  if (!intro) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/student" className="text-sm text-muted hover:text-brand-strong">
        ← My quizzes
      </Link>
      <div className={`${cardClass} space-y-5 p-5`}>
        <h1 dir="auto" className="break-words text-2xl font-bold tracking-tight">
          {intro.title}
        </h1>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>{intro.questionCount}</strong> questions, <strong>{intro.timeLimitMinutes} minutes</strong>.
          </li>
          <li>
            {intro.penaltyPercent === 0
              ? "Wrong answers do not lose points."
              : `Each wrong answer loses ${intro.penaltyPercent}% of that question's points. Leaving a question blank scores 0.`}
          </li>
          <li>The timer keeps running if you close the page. Your answers save as you go.</li>
          <li>You can take this quiz once. Closes {formatAmman(intro.closesAt)}.</li>
        </ul>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {START_ERRORS[error] ?? "Could not start the quiz."}
          </p>
        )}
        {intro.state === "open" ? (
          <form action={startAttemptAction}>
            <input type="hidden" name="quizId" value={quizId} />
            <button type="submit" className={buttonClass("primary", "w-full text-base")}>
              Start quiz
            </button>
          </form>
        ) : (
          <p className="rounded-xl bg-canvas p-3 text-sm text-muted">
            {intro.state === "upcoming" ? `Opens ${formatAmman(intro.opensAt)}.` : "This quiz has closed."}
          </p>
        )}
      </div>
    </div>
  );
}
