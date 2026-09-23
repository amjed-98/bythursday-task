import { describe, expect, it } from "vitest";
import { createLoginThrottle } from "@/lib/login-throttle";

const WINDOW_MS = 15 * 60_000;

describe("login throttle", () => {
  it("allows attempts below the failure limit", () => {
    const throttle = createLoginThrottle({ maxFailures: 3, windowMs: WINDOW_MS });
    throttle.recordFailure("sara", 0);
    throttle.recordFailure("sara", 0);

    expect(throttle.isBlocked("sara", 0)).toBe(false);
  });

  it("blocks a username after too many failures inside the window", () => {
    const throttle = createLoginThrottle({ maxFailures: 3, windowMs: WINDOW_MS });
    [0, 1, 2].forEach((t) => throttle.recordFailure("sara", t));

    expect(throttle.isBlocked("sara", 10)).toBe(true);
  });

  it("unblocks once the window has passed", () => {
    const throttle = createLoginThrottle({ maxFailures: 3, windowMs: WINDOW_MS });
    [0, 1, 2].forEach((t) => throttle.recordFailure("sara", t));

    expect(throttle.isBlocked("sara", WINDOW_MS + 3)).toBe(false);
  });

  it("clears failures after a successful login", () => {
    const throttle = createLoginThrottle({ maxFailures: 3, windowMs: WINDOW_MS });
    [0, 1, 2].forEach((t) => throttle.recordFailure("sara", t));
    throttle.reset("sara");

    expect(throttle.isBlocked("sara", 10)).toBe(false);
  });
});
