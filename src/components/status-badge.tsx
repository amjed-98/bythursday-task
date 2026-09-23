import type { AttemptStatus } from "@/db/schema";

type BadgeStatus = AttemptStatus | "not_started" | "open" | "upcoming" | "closed";

const STYLES: Record<BadgeStatus, { label: string; className: string }> = {
  in_progress: { label: "In progress", className: "bg-warn-soft text-warn" },
  submitted: { label: "Submitted", className: "bg-brand-soft text-brand-strong" },
  expired: { label: "Time ran out", className: "bg-warn-soft text-warn" },
  not_started: { label: "Not started", className: "bg-canvas text-muted border border-line" },
  open: { label: "Open", className: "bg-brand-soft text-brand-strong" },
  upcoming: { label: "Upcoming", className: "bg-canvas text-muted border border-line" },
  closed: { label: "Closed", className: "bg-canvas text-muted border border-line" },
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
