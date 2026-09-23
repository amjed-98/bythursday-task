import { describe, expect, it } from "vitest";
import { textDirection } from "@/domain/text-direction";

describe("textDirection", () => {
  it("detects right-to-left for Arabic text", () => {
    expect(textDirection("ما عاصمة الأردن؟")).toBe("rtl");
  });

  it("detects left-to-right for English text", () => {
    expect(textDirection("What is the capital of Jordan?")).toBe("ltr");
  });

  it("uses the first strong character, ignoring leading digits and punctuation", () => {
    expect(textDirection("12) كم يساوي ٣ + ٤؟")).toBe("rtl");
  });

  it("falls back to left-to-right when there is no strong character", () => {
    expect(textDirection("3 + 4 = ?")).toBe("ltr");
  });
});
