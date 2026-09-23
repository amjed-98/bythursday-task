import { editQuizDefaults } from "@/components/quiz-form/defaults";
import { QuizForm } from "@/components/quiz-form/quiz-form";
import { getDb } from "@/db/client";
import { homePathFor } from "@/lib/route-access";
import { loadOr404, parseIdOr404 } from "@/lib/load-or-404";
import { requireActor } from "@/lib/session";
import { getQuizForEdit, listClasses } from "@/server/quizzes";

type PageProps = { params: Promise<{ quizId: string }> };

export default async function EditQuizPage({ params }: PageProps) {
  const actor = await requireActor(["teacher", "admin"]);
  const quizId = parseIdOr404((await params).quizId);
  const db = getDb();
  const [quiz, classes] = await Promise.all([loadOr404(getQuizForEdit(db, actor, quizId)), listClasses(db)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Edit quiz</h1>
      <QuizForm quizId={quiz.id} classes={classes} defaults={editQuizDefaults(quiz)} questions={quiz.questions} isLocked={quiz.isLocked}
        returnPath={homePathFor(actor.role)}
      />
    </div>
  );
}
