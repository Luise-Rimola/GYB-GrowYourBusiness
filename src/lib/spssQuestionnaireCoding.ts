import { ALL_LIKERT_SCALE_KEYS } from "@/lib/fragebogenScales";

/** SPSS‑Export: `value_spss` im Langformat (/api/study/export, Standard) nur für Likert‑Items; Freitext bleibt in `value_str_raw`. */
export function isStudyQuestionItemIncludedInSpss(questionnaireType: string, itemKey: string): boolean {
  const q = questionnaireType.trim().toLowerCase();
  const ku = itemKey.trim().toUpperCase();
  if (!ku) return false;
  if (q === "fb1") {
    if (ku === "A5" || ku === "B2" || ku === "B3") return true;
    return /^C[1-6]$/.test(ku);
  }
  if (q === "fb2" || q === "fb3" || q === "fb4") {
    return ALL_LIKERT_SCALE_KEYS.has(ku);
  }
  if (q === "fb5") {
    return /^X[1-5]$/.test(ku);
  }
  return false;
}

const INTEGER_STRING_RE = /^-?\d+$/;

/** Zellinhalt nur aus gespeicherter Zahl bzw. reiner Ganzzahl im String (Likert‑Reverse weiterhin aktiv). */
export function encodeNumericAnswerForStudySpss(
  itemKey: string,
  valueNum: number | null,
  valueStr: string | null,
  reverse: (key: string, n: number) => number,
): string {
  if (valueNum !== null && Number.isFinite(valueNum)) {
    return String(reverse(itemKey, valueNum));
  }
  const s = (valueStr ?? "").trim();
  if (!s) return "";
  if (INTEGER_STRING_RE.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) return String(reverse(itemKey, n));
  }
  return "";
}
