import Link from "next/link";
import { QuizTable } from "@/components/quiz-table";
import { buttonClass } from "@/components/ui";
import { getDb } from "@/db/client";
import { requireActor } from "@/lib/session";
import { listQuizzesForActor } from "@/server/quizzes";

export default async function TeacherHomePage() {
  const actor = await requireActor(["teacher"]);
  const quizzes = await listQuizzesForActor(getDb(), actor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My quizzes</h1>
        <div className="flex gap-2">
          <Link href="/teacher/quizzes/import" className={buttonClass("secondary")}>
            Import from file
          </Link>
          <Link href="/teacher/quizzes/new" className={buttonClass("primary")}>
            New quiz
          </Link>
        </div>
      </div>
      <QuizTable quizzes={quizzes} now={new Date()} />
    </div>
  );
}
