const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_CHAR = /[A-Za-zÀ-ɏ]/;

/** Mirrors the browser's dir="auto" rule (first strong character) so layout around the text can follow it. */
export function textDirection(text: string): "rtl" | "ltr" {
  for (const char of text) {
    if (RTL_CHAR.test(char)) return "rtl";
    if (LTR_CHAR.test(char)) return "ltr";
  }
  return "ltr";
}
