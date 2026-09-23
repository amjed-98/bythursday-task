import { ColumnGuide } from "@/components/column-guide";
import { newQuizDefaults } from "@/components/quiz-form/defaults";
import { getDb } from "@/db/client";
import { requireActor } from "@/lib/session";
import { listClasses } from "@/server/quizzes";
import { ImportQuizForm } from "./import-quiz-form";

const QUESTION_COLUMNS = [
  { name: "question", note: "Question text (Arabic is fine)" },
  { name: "points", note: "Whole number, 1–100" },
  { name: "option_a … option_d", note: "The four options" },
  { name: "correct", note: "A, B, C or D" },
];

export default async function ImportQuizPage() {
  await requireActor(["teacher"]);
  const classes = await listClasses(getDb());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import a quiz</h1>
        <p className="mt-1 text-sm text-muted">
          Fill in the quiz details, then upload the questions. One row per question, headers in the first row. If any row has a problem, nothing is saved.
        </p>
      </div>
      <ImportQuizForm classes={classes} defaults={newQuizDefaults(new Date())} />
      <ColumnGuide title="Question columns" columns={QUESTION_COLUMNS} />
    </div>
  );
}
