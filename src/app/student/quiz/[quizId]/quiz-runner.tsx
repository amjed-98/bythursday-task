"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass, cardClass } from "@/components/ui";
import { textDirection } from "@/domain/text-direction";
import type { AttemptView } from "@/server/attempts";
import { saveAnswerAction, submitAttemptAction } from "../../actions";
import { Countdown } from "./countdown";

type SaveState = "saving" | "saved" | "failed";
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

type QuizRunnerProps = { view: AttemptView };

export function QuizRunner({ view }: QuizRunnerProps) {
  const router = useRouter();
  const resultPath = `/student/quiz/${view.quiz.id}/result`;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>(view.answers);
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const hasSubmitted = useRef(false);

  const question = view.questions[index];
  const total = view.questions.length;
  const answeredCount = view.questions.filter((q) => (answers[q.id] ?? null) !== null).length;

  // Saves are queued so a fast A-then-B tap can never reach the server as B-then-A.
  const persistAnswer = useCallback(
    (questionId: number, optionId: number | null) => {
      setSaveStates((prev) => ({ ...prev, [questionId]: "saving" }));
      saveQueue.current = saveQueue.current.then(async () => {
        const result = await saveAnswerAction({ attemptId: view.attemptId, questionId, optionId }).catch(() => null);
        if (result?.ok) {
          setSaveStates((prev) => ({ ...prev, [questionId]: "saved" }));
          return;
        }
        if (result && result.code === "ATTEMPT_CLOSED") {
          router.replace(resultPath);
          return;
        }
        setSaveStates((prev) => ({ ...prev, [questionId]: "failed" }));
      });
    },
    [router, resultPath, view.attemptId],
  );

  const choose = (questionId: number, optionId: number | null) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    persistAnswer(questionId, optionId);
  };

  const submit = useCallback(async () => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    await saveQueue.current;
    const result = await submitAttemptAction(view.attemptId).catch(() => null);
    if (result?.ok) {
      router.replace(resultPath);
      return;
    }
    hasSubmitted.current = false;
    setIsSubmitting(false);
    setSubmitError(result?.message ?? "Could not reach the server. Check your connection and try again.");
  }, [router, resultPath, view.attemptId]);

  useEffect(() => {
    if (view.remainingMs <= 0) void submit();
  }, [view.remainingMs, submit]);

  if (!question) return null;
  const direction = textDirection(question.text);
  const chosen = answers[question.id] ?? null;
  const saveState = saveStates[question.id];

  return (
    <div className="mx-auto max-w-2xl pb-28">
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p dir="auto" className="min-w-0 truncate text-sm font-semibold">
            {view.quiz.title}
          </p>
          <Countdown remainingMs={view.remainingMs} onExpire={submit} />
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${(answeredCount / total) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          {answeredCount} of {total} answered
          {view.quiz.penaltyPercent > 0 && ` · wrong answers −${view.quiz.penaltyPercent}%`}
        </p>
      </div>

      <section className={`${cardClass} p-4 sm:p-6`} aria-labelledby="question-text">
        <div className="mb-3 flex items-center justify-between text-sm text-muted">
          <span>
            Question {index + 1} of {total}
          </span>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
            {question.points} {question.points === 1 ? "point" : "points"}
          </span>
        </div>
        <h1 id="question-text" dir="auto" className="mb-5 break-words text-lg font-semibold leading-relaxed sm:text-xl">
          {question.text}
        </h1>
        <div role="radiogroup" aria-labelledby="question-text" dir={direction} className="space-y-3">
          {question.options.map((option, optionIndex) => {
            const isChosen = chosen === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={isSubmitting}
                onClick={() => choose(question.id, option.id)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-3 py-3 text-start transition-colors ${
                  isChosen ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/50"
                }`}
              >
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                    isChosen ? "bg-brand text-white" : "bg-canvas text-muted"
                  }`}
                  aria-hidden
                >
                  {OPTION_LETTERS[optionIndex]}
                </span>
                <span dir="auto" className="min-w-0 flex-1 break-words text-base">
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex min-h-8 items-center justify-between gap-3 text-sm">
          <span aria-live="polite" className={saveState === "failed" ? "text-danger" : "text-muted"}>
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Saved"}
            {saveState === "failed" && "Not saved."}
          </span>
          <div className="flex gap-2">
            {saveState === "failed" && (
              <button type="button" className={buttonClass("secondary", "min-h-9")} onClick={() => persistAnswer(question.id, chosen)}>
                Retry
              </button>
            )}
            {chosen !== null && (
              <button type="button" className={buttonClass("ghost", "min-h-9")} onClick={() => choose(question.id, null)}>
                Clear answer
              </button>
            )}
          </div>
        </div>
      </section>

      <nav aria-label="Questions" className="mt-4">
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
          {view.questions.map((q, i) => {
            const isAnswered = (answers[q.id] ?? null) !== null;
            const isCurrent = i === index;
            return (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Question ${i + 1}${isAnswered ? ", answered" : ""}`}
                  className={`h-11 w-full rounded-lg border text-sm font-semibold ${
                    isCurrent ? "ring-2 ring-brand ring-offset-2 ring-offset-canvas" : ""
                  } ${isAnswered ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"}`}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            type="button"
            className={buttonClass("secondary", "flex-1")}
            disabled={index === 0}
            onClick={() => setIndex((i) => i - 1)}
          >
            Previous
          </button>
          {index < total - 1 ? (
            <button type="button" className={buttonClass("secondary", "flex-1")} onClick={() => setIndex((i) => i + 1)}>
              Next
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass("primary", "flex-1")}
            disabled={isSubmitting}
            onClick={() => setIsConfirming(true)}
          >
            Submit
          </button>
        </div>
      </div>

      {(isConfirming || submitError) && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className={`${cardClass} w-full max-w-sm space-y-4 p-5`}>
            <h2 id="confirm-title" className="text-lg font-bold">
              Submit your answers?
            </h2>
            <p className="text-sm text-muted">
              {answeredCount === total
                ? "You answered every question."
                : `${total - answeredCount} question${total - answeredCount === 1 ? " is" : "s are"} still blank.`}{" "}
              You cannot change answers after submitting.
            </p>
            {submitError && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                {submitError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass("secondary", "flex-1")}
                disabled={isSubmitting}
                onClick={() => {
                  setIsConfirming(false);
                  setSubmitError(null);
                }}
              >
                Keep working
              </button>
              <button type="button" className={buttonClass("primary", "flex-1")} disabled={isSubmitting} onClick={submit}>
                {isSubmitting ? "Submitting…" : "Submit now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
