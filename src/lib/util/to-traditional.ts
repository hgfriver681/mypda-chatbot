import { Converter } from "opencc-js";

// Display-only Simplified -> Traditional conversion. We use the Taiwan locale
// ("tw") for CHARACTER variants only — NOT "twp", which also swaps vocabulary
// (软件->軟體, 内存->記憶體). The user wants pure character conversion, so
// 软件 stays 軟件 / 内存 stays 內存 — only the glyphs are converted.
//
// This is applied at render time (see markdown.tsx). Stored/transmitted text is
// never mutated — the model's raw output is the source of truth.
let _convert: ((text: string) => string) | null = null;

function converter(): (text: string) => string {
  if (!_convert) {
    _convert = Converter({ from: "cn", to: "tw" });
  }
  return _convert;
}

export function toTraditional(text: string): string {
  if (!text) return text;
  try {
    return converter()(text);
  } catch {
    return text;
  }
}
