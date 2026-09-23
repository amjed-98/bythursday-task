import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { buttonClass, cardClass } from "@/components/ui";
import { getDb } from "@/db/client";
import { formatCenti } from "@/domain/scoring";
import { formatAmman } from "@/domain/time";
import { requireActor } from "@/lib/session";
import { getStudentDashboard, type QuizCard } from "@/server/dashboard";

type Section = "available" | "upcoming" | "completed";

function QuizCardView({ card, section }: { card: QuizCard; section: Section }) {
  return (
    <li className={`${cardClass} flex flex-col gap-3 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <h3 dir="auto" className="min-w-0 break-words text-base font-semibold">
          {card.title}
        </h3>
        {card.attemptStatus && <StatusBadge status={card.attemptStatus} />}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted">
        <dt>Questions</dt>
        <dd className="text-ink">{card.questionCount}</dd>
        <dt>Time limit</dt>
        <dd className="text-ink">{card.timeLimitMinutes} min</dd>
        <dt>Wrong answers</dt>
        <dd className="text-ink">{card.penaltyPercent === 0 ? "No penalty" : `−${card.penaltyPercent}% of points`}</dd>
        <dt>{section === "upcoming" ? "Opens" : "Closes"}</dt>
        <dd className="text-ink">{formatAmman(section === "upcoming" ? card.opensAt : card.closesAt)}</dd>
      </dl>
      {section === "available" && (
        <Link href={`/student/quiz/${card.id}`} className={buttonClass("primary", "w-full")}>
          {card.attemptStatus === "in_progress" ? "Resume quiz" : "Open quiz"}
        </Link>
      )}
      {section === "completed" && card.scoreCenti !== null && (
        <Link href={`/student/quiz/${card.id}/result`} className={buttonClass("secondary", "w-full")}>
          Score {formatCenti(card.scoreCenti)} / {formatCenti(card.maxScoreCenti)} · View result
        </Link>
      )}
      {section === "completed" && card.attemptStatus === null && (
        <p className="text-sm text-muted">You did not take this quiz.</p>
      )}
    </li>
  );
}

const SECTIONS: { key: Section; title: string; empty: string }[] = [
  { key: "available", title: "Available now", empty: "No quiz is open for your class right now." },
  { key: "upcoming", title: "Upcoming", empty: "Nothing scheduled yet." },
  { key: "completed", title: "Completed", empty: "You have not finished any quiz yet." },
];

export default async function StudentDashboardPage() {
  const actor = await requireActor(["student"]);
  const dashboard = await getStudentDashboard(getDb(), actor, new Date());

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">My quizzes</h1>
      {SECTIONS.map(({ key, title, empty }) => (
        <section key={key} aria-labelledby={`section-${key}`}>
          <h2 id={`section-${key}`} className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {title}
          </h2>
          {dashboard[key].length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">{empty}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {dashboard[key].map((card) => (
                <QuizCardView key={card.id} card={card} section={key} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
