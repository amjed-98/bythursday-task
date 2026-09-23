import { FilterLinks } from "@/components/filter-links";
import { QuizTable } from "@/components/quiz-table";
import { getDb } from "@/db/client";
import { requireActor } from "@/lib/session";
import { listClasses, listQuizzesForActor } from "@/server/quizzes";

type PageProps = { searchParams: Promise<{ class?: string }> };

const ALL = "all";

export default async function AdminHomePage({ searchParams }: PageProps) {
  const actor = await requireActor(["admin"]);
  const db = getDb();
  const classes = await listClasses(db);
  const requested = (await searchParams).class ?? ALL;
  const selected = classes.find((c) => c.name === requested);
  const quizzes = await listQuizzesForActor(db, actor, { classId: selected?.id });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">All quizzes</h1>
      <FilterLinks
        label="Filter by class"
        current={selected?.name ?? ALL}
        options={[{ value: ALL, label: "All classes" }, ...classes.map((c) => ({ value: c.name, label: c.name }))]}
        hrefFor={(value) => (value === ALL ? "/admin" : `/admin?class=${encodeURIComponent(value)}`)}
      />
      <QuizTable quizzes={quizzes} now={new Date()} showTeacher />
    </div>
  );
}
