import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { buttonClass, cardClass } from "@/components/ui";
import { getDb } from "@/db/client";
import { formatCenti } from "@/domain/scoring";
import { formatAmman } from "@/domain/time";
import { loadOr404, parseIdOr404 } from "@/lib/load-or-404";
import { requireActor } from "@/lib/session";
import { formatDuration, getQuizResults, type QuestionStat } from "@/server/results";

type PageProps = { params: Promise<{ quizId: string }> };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${cardClass} p-3`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function QuestionBar({ stat }: { stat: QuestionStat }) {
  const percent = stat.percentCorrect ?? 0;
  const tone = percent >= 70 ? "bg-brand" : percent >= 40 ? "bg-warn" : "bg-danger";
  return (
    <li className="grid grid-cols-[2.5rem_1fr_3rem] items-center gap-3 py-2">
      <span className="text-sm font-semibold text-muted">Q{stat.position}</span>
      <div className="min-w-0">
        <p dir="auto" className="truncate text-sm">
          {stat.text}
        </p>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
      <span className="text-end text-sm font-semibold tabular-nums">{stat.percentCorrect === null ? "–" : `${percent}%`}</span>
    </li>
  );
}

export default async function QuizResultsPage({ params }: PageProps) {
  const actor = await requireActor(["teacher", "admin"]);
  const quizId = parseIdOr404((await params).quizId);
  const results = await loadOr404(getQuizResults(getDb(), actor, quizId, new Date()));
  const { quiz, summary } = results;
  const max = formatCenti(quiz.maxScoreCenti);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">Results</p>
          <h1 dir="auto" className="break-words text-2xl font-bold tracking-tight">
            {quiz.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <StatusBadge status={quiz.state} /> Closes {formatAmman(quiz.closesAt)} · penalty {quiz.penaltyPercent}%
          </p>
        </div>
        <a href={`/quizzes/${quiz.id}/results/export`} className={buttonClass("secondary")} download>
          Export CSV
        </a>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Finished" value={String(summary.finished)} />
        <Stat label="Not started" value={String(summary.notStarted)} />
        <Stat label="In progress" value={String(summary.inProgress)} />
        <Stat label="Average score" value={summary.averageScoreCenti === null ? "–" : `${formatCenti(summary.averageScoreCenti)} / ${max}`} />
      </dl>

      <section aria-labelledby="students-title" className="space-y-3">
        <h2 id="students-title" className="text-lg font-bold">
          Students
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Class</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-end font-medium">Score</th>
                <th className="px-3 py-2 text-end font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {results.rows.map((row) => (
                <tr key={row.studentId}>
                  <td className="px-3 py-2">
                    <span dir="auto" className="block font-medium">
                      {row.fullName}
                    </span>
                    {row.fullNameLatin && <span className="block text-xs text-muted">{row.fullNameLatin}</span>}
                  </td>
                  <td className="px-3 py-2">{row.className}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {row.scoreCenti === null ? "–" : `${formatCenti(row.scoreCenti)} / ${max}`}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">{formatDuration(row.timeTakenSeconds) || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="questions-title" className={`${cardClass} p-4`}>
        <h2 id="questions-title" className="mb-2 text-lg font-bold">
          Correct answers per question
        </h2>
        <ol className="divide-y divide-line">
          {results.questionStats.map((stat) => (
            <QuestionBar key={stat.questionId} stat={stat} />
          ))}
        </ol>
      </section>

      <Link href="/" className="text-sm text-muted hover:text-brand-strong">
        ← Back
      </Link>
    </div>
  );
}
