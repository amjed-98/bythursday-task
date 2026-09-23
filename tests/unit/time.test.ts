import { describe, expect, it } from "vitest";
import { ammanInputToUtc, formatAmman, utcToAmmanInput } from "@/domain/time";

describe("Amman time helpers", () => {
  it("converts an Amman datetime-local value to UTC", () => {
    expect(ammanInputToUtc("2026-09-23T09:00").toISOString()).toBe("2026-09-23T06:00:00.000Z");
  });

  it("converts a UTC date back to an Amman datetime-local value", () => {
    expect(utcToAmmanInput(new Date("2026-09-23T06:00:00Z"))).toBe("2026-09-23T09:00");
  });

  it("formats dates for display in Amman time", () => {
    expect(formatAmman(new Date("2026-09-23T06:00:00Z"))).toBe("23 Sep 2026, 09:00");
  });

  it("rejects malformed input", () => {
    expect(() => ammanInputToUtc("not a date")).toThrow();
  });
});
