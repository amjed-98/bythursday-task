import { newQuizDefaults } from "@/components/quiz-form/defaults";
import { QuizForm } from "@/components/quiz-form/quiz-form";
import { getDb } from "@/db/client";
import { requireActor } from "@/lib/session";
import { listClasses } from "@/server/quizzes";

export default async function NewQuizPage() {
  await requireActor(["teacher"]);
  const classes = await listClasses(getDb());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">New quiz</h1>
      <QuizForm quizId={null} classes={classes} defaults={newQuizDefaults(new Date())} questions={[]} isLocked={false} returnPath="/teacher" />
    </div>
  );
}
