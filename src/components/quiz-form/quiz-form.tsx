"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, type FormEvent } from "react";
import { saveQuizAction, type QuizFormState } from "@/app/quizzes/actions";
import { FormErrors } from "@/components/form-errors";
import { buttonClass, cardClass } from "@/components/ui";
import type { QuestionInput } from "@/domain/quiz-input";
import type { ClassOption } from "@/server/quizzes";
import { QuestionsEditor } from "./questions-editor";
import { QuizMetaFields, type QuizMetaDefaults } from "./quiz-meta-fields";

type QuizFormProps = {
  quizId: number | null;
  classes: ClassOption[];
  defaults: QuizMetaDefaults;
  questions: QuestionInput[];
  isLocked: boolean;
  returnPath: string;
};

export function QuizForm({ quizId, classes, defaults, questions, isLocked, returnPath }: QuizFormProps) {
  const router = useRouter();
  const [state, dispatch, isPending] = useActionState<QuizFormState, FormData>(saveQuizAction, {
    status: "idle",
    errors: [],
    quizId,
  });

  useEffect(() => {
    if (state.status === "saved") router.push(returnPath);
  }, [state.status, router, returnPath]);

  // Dispatching manually (not via the form action prop) keeps typed values when the server rejects them.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {quizId && <input type="hidden" name="quizId" value={quizId} />}
      <section className={`${cardClass} p-4 sm:p-6`}>
        <QuizMetaFields classes={classes} defaults={defaults} isPenaltyLocked={isLocked} />
      </section>
      <QuestionsEditor initial={questions} isLocked={isLocked} />
      <FormErrors errors={state.errors} />
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <button type="submit" disabled={isPending} className={buttonClass("primary", "w-full sm:w-auto")}>
          {isPending ? "Saving…" : quizId ? "Save changes" : "Create quiz"}
        </button>
      </div>
    </form>
  );
}
