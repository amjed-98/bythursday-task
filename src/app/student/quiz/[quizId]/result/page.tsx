import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { buttonClass, cardClass } from "@/components/ui";
import { getDb } from "@/db/client";
import { isDomainError } from "@/domain/errors";
import { formatCenti } from "@/domain/scoring";
import { textDirection } from "@/domain/text-direction";
import { formatAmman } from "@/domain/time";
import { requireActor } from "@/lib/session";
import { getAttemptResult, type ReviewItem } from "@/server/attempts";

type PageProps = { params: Promise<{ quizId: string }> };

function ReviewQuestion({ item }: { item: ReviewItem }) {
  const outcome =
    item.chosenOptionId === null
      ? { label: "Blank", className: "text-muted" }
      : item.options.find((o) => o.id === item.chosenOptionId)?.isCorrect
        ? { label: "Correct", className: "text-brand-strong" }
        : { label: "Wrong", className: "text-danger" };

  return (
    <li className={`${cardClass} p-4`}>
      <div className="mb-2 flex justify-between text-xs font-semibold">
        <span className="text-muted">
          Q{item.position} · {item.points} pt{item.points === 1 ? "" : "s"}
        </span>
        <span className={outcome.className}>{outcome.label}</span>
      </div>
      <p dir="auto" className="mb-3 break-words font-medium">
        {item.text}
      </p>
      <ul dir={textDirection(item.text)} className="space-y-1.5 text-sm">
        {item.options.map((option) => {
          const isChosen = option.id === item.chosenOptionId;
          const tone = option.isCorrect
            ? "border-brand bg-brand-soft"
            : isChosen
              ? "border-danger bg-danger-soft"
              : "border-line";
          return (
            <li key={option.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${tone}`}>
              <span dir="auto" className="min-w-0 flex-1 break-words">
                {option.text}
              </span>
              {option.isCorrect && <span className="text-xs font-semibold text-brand-strong">Correct</span>}
              {isChosen && !option.isCorrect && <span className="text-xs font-semibold text-danger">Your answer</span>}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export default async function ResultPage({ params }: PageProps) {
  const actor = await requireActor(["student"]);
  const quizId = Number((await params).quizId);
  if (!Number.isInteger(quizId)) notFound();

  const result = await getAttemptResult(getDb(), actor, quizId, new Date()).catch((e: unknown) => {
    if (isDomainError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  if (result.status === "in_progress" || !result.score) redirect(`/student/quiz/${quizId}`);
  const { score } = result;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/student" className="text-sm text-muted hover:text-brand-strong">
        ← My quizzes
      </Link>
      <section className={`${cardClass} p-5 text-center sm:p-8`}>
        <div className="mb-2 flex justify-center">
          <StatusBadge status={result.status} />
        </div>
        <h1 dir="auto" className="break-words text-lg font-semibold">
          {result.quizTitle}
        </h1>
        <p className="mt-4 text-sm text-muted">Your score</p>
        <p className="text-5xl font-bold tracking-tight tabular-nums" data-testid="score">
          {formatCenti(score.scoreCenti)}
          <span className="text-2xl text-muted"> / {formatCenti(score.maxScoreCenti)}</span>
        </p>
        <dl className="mx-auto mt-6 grid max-w-xs grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-brand-soft p-2">
            <dt className="text-brand-strong">Correct</dt>
            <dd className="text-xl font-bold">{score.correct}</dd>
          </div>
          <div className="rounded-xl bg-danger-soft p-2">
            <dt className="text-danger">Wrong</dt>
            <dd className="text-xl font-bold">{score.wrong}</dd>
          </div>
          <div className="rounded-xl bg-canvas p-2">
            <dt className="text-muted">Blank</dt>
            <dd className="text-xl font-bold">{score.blank}</dd>
          </div>
        </dl>
      </section>

      {result.review ? (
        <section aria-labelledby="review-title" className="space-y-3">
          <h2 id="review-title" className="text-lg font-bold">
            Review
          </h2>
          <ol className="space-y-3">
            {result.review.map((item) => (
              <ReviewQuestion key={item.questionId} item={item} />
            ))}
          </ol>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted">
          The answer review opens when the quiz closes on {formatAmman(new Date(result.closesAt))}.
        </p>
      )}
      <Link href="/student" className={buttonClass("secondary", "w-full")}>
        Back to my quizzes
      </Link>
    </div>
  );
}
