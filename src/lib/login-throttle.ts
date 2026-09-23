type ThrottleOptions = { maxFailures: number; windowMs: number };

export type LoginThrottle = {
  isBlocked: (key: string, nowMs: number) => boolean;
  recordFailure: (key: string, nowMs: number) => void;
  reset: (key: string) => void;
};

/** In-memory, per-process. Enough to slow down password guessing on a single-instance deployment. */
export function createLoginThrottle({ maxFailures, windowMs }: ThrottleOptions): LoginThrottle {
  const failures = new Map<string, number[]>();
  const recent = (key: string, nowMs: number) => (failures.get(key) ?? []).filter((t) => nowMs - t < windowMs);

  return {
    isBlocked: (key, nowMs) => recent(key, nowMs).length >= maxFailures,
    recordFailure: (key, nowMs) => {
      failures.set(key, [...recent(key, nowMs), nowMs]);
    },
    reset: (key) => {
      failures.delete(key);
    },
  };
}
