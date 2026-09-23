"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, type FormEvent } from "react";
import { FormErrors } from "@/components/form-errors";
import { ImportFeedback } from "@/components/import-feedback";
import { QuizMetaFields, type QuizMetaDefaults } from "@/components/quiz-form/quiz-meta-fields";
import { buttonClass, cardClass, inputClass, labelClass } from "@/components/ui";
import type { ClassOption } from "@/server/quizzes";
import { importQuizAction, type QuizImportState } from "./actions";

const INITIAL: QuizImportState = { rowErrors: [], errors: [], savedQuizId: null };

type ImportQuizFormProps = { classes: ClassOption[]; defaults: QuizMetaDefaults };

export function ImportQuizForm({ classes, defaults }: ImportQuizFormProps) {
  const router = useRouter();
  const [state, dispatch, isPending] = useActionState(importQuizAction, INITIAL);

  useEffect(() => {
    if (state.savedQuizId) router.push(`/quizzes/${state.savedQuizId}/edit`);
  }, [state.savedQuizId, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className={`${cardClass} p-4 sm:p-6`}>
        <QuizMetaFields classes={classes} defaults={defaults} />
      </section>
      <section className={`${cardClass} space-y-2 p-4 sm:p-6`}>
        <label htmlFor="file" className={labelClass}>
          Questions file (.xlsx or .csv)
        </label>
        <input id="file" name="file" type="file" required accept=".xlsx,.csv" className={`${inputClass} py-2`} />
      </section>
      <FormErrors errors={state.errors} />
      <ImportFeedback errors={state.rowErrors} message={null} success={null} />
      <button type="submit" disabled={isPending} className={buttonClass("primary", "w-full sm:w-auto")}>
        {isPending ? "Importing…" : "Import quiz"}
      </button>
    </form>
  );
}
