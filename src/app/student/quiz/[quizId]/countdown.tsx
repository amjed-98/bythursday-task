"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 250;
const WARNING_MS = 2 * 60_000;
const DANGER_MS = 60_000;

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type CountdownProps = { remainingMs: number; onExpire: () => void };

/**
 * Anchored to performance.now(), a monotonic clock, so changing the phone's clock cannot add time.
 * The server holds the real deadline; this only mirrors it.
 */
export function Countdown({ remainingMs, onExpire }: CountdownProps) {
  const [left, setLeft] = useState(remainingMs);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const endsAt = performance.now() + remainingMs;
    let hasFired = false;
    const timer = window.setInterval(() => {
      const next = Math.max(0, endsAt - performance.now());
      setLeft(next);
      if (next === 0 && !hasFired) {
        hasFired = true;
        window.clearInterval(timer);
        onExpireRef.current();
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [remainingMs]);

  const tone =
    left <= DANGER_MS ? "bg-danger text-white" : left <= WARNING_MS ? "bg-warn-soft text-warn" : "bg-surface text-ink border border-line";

  return (
    <span
      role="timer"
      aria-label={`Time left ${formatClock(left)}`}
      className={`shrink-0 rounded-full px-3 py-1 font-mono text-base font-bold tabular-nums ${tone}`}
    >
      {formatClock(left)}
    </span>
  );
}
