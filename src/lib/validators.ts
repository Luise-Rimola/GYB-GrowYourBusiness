import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { schemaRegistry, SchemaKey } from "@/types/schemas";

/**
 * Alias-Tabelle für häufige KI-Tippfehler bzw. Feldnamen-Varianten.
 * Keys sind die (fehlerhaften) Feldnamen, die wir vor der Validierung auf den
 * kanonischen Namen (value) umbenennen.
 *
 * Grund: Die Modelle produzieren immer wieder dieselben Klassen von Abweichungen
 * (Pluralform, vertippte Wiederholung, camelCase statt snake_case). Ein einzelnes
 * Mapping hier verhindert, dass ein sonst vollständiger, inhaltlich korrekter
 * Output an einem Tippfehler scheitert — workflow-unabhängig.
 */
const FIELD_ALIASES: Record<string, string> = {
  // priority_kpis / KPI-Einträge
  why_it_matter: "why_it_matters",
  why_it_it_matters: "why_it_matters",
  why_matters: "why_it_matters",
  whyItMatters: "why_it_matters",
  whatItIs: "what_it_is",
  kpiKey: "kpi_key",
  targetHint: "target_hint",
  checkFrequency: "check_frequency",
  // marketing_initiatives
  budgetEur: "budget_eur",
  effortHWeek: "effort_h_week",
  expectedConversion: "expected_conversion",
  // allgemeine camelCase → snake_case Klassiker
  sourcesUsed: "sources_used",
  recommendedActions: "recommended_actions",
};

/**
 * Benennt bekannte Tippfehler/camelCase-Varianten rekursiv in die kanonischen
 * snake_case-Felder um. Arrays und verschachtelte Objekte werden mitgelaufen.
 */
function normalizeFieldAliases(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeFieldAliases);
  }
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [rawKey, rawVal] of Object.entries(value as Record<string, unknown>)) {
    const canonical = FIELD_ALIASES[rawKey] ?? rawKey;
    const normalizedVal = normalizeFieldAliases(rawVal);
    // Kanonischen Wert nicht überschreiben, wenn er bereits explizit gesetzt wurde.
    if (canonical in out && canonical !== rawKey) continue;
    out[canonical] = normalizedVal;
  }
  return out;
}

/**
 * Entfernt Pfade aus einem Objekt, an denen Zod „unrecognized_keys" gemeldet hat.
 * So können wir strict-Schemas tolerant machen, ohne die Strictness-Signalisierung
 * grundsätzlich aufzugeben: Wir probieren es strict, und fallen bei nur-unbekannten
 * Keys auf einen bereinigten Input zurück.
 */
function stripUnrecognizedKeys(
  input: unknown,
  issues: z.ZodIssue[],
): unknown {
  if (!input || typeof input !== "object") return input;
  // Tiefe Kopie, um das Original nicht zu mutieren.
  const root: unknown = JSON.parse(JSON.stringify(input));
  for (const issue of issues) {
    if (issue.code !== "unrecognized_keys") continue;
    const keys = (issue as z.ZodIssue & { keys?: string[] }).keys ?? [];
    // An das Elternobjekt (issue.path) navigieren und dort die fremden Keys löschen.
    let cursor: unknown = root;
    for (const segment of issue.path) {
      if (cursor == null) break;
      cursor = (cursor as Record<string | number, unknown>)[segment];
    }
    if (cursor && typeof cursor === "object" && !Array.isArray(cursor)) {
      for (const k of keys) {
        delete (cursor as Record<string, unknown>)[k];
      }
    }
  }
  return root;
}

export type ValidationResult =
  | {
      ok: true;
      data: unknown;
    }
  | {
      ok: false;
      errors: string[];
    };

/** Extract JSON object/array from string – handles leading text like "Here is the JSON: {...}" */
function extractJson(raw: string): string {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  // 1) Full code block
  const fullBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  if (fullBlock) return fullBlock[1].trim();
  // 2) Code block anywhere in text
  const innerBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (innerBlock) return innerBlock[1].trim();
  // 3) Find first { or [ and extract balanced bracket content
  const start = trimmed.search(/\{|\[/);
  if (start === -1) return trimmed;
  const open = trimmed[start] as "{" | "[";
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inStr) {
      escape = true;
      continue;
    }
    if (c === '"' && !inStr) {
      inStr = true;
      continue;
    }
    if (c === '"' && inStr) {
      inStr = false;
      continue;
    }
    if (inStr) continue;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return trimmed.slice(start, i + 1);
    }
  }
  return trimmed.slice(start);
}

/** Escape unescaped " inside JSON string values. In value strings, escape " when followed by letter/digit/: */
function escapeQuotesInStrings(s: string): string {
  const out: string[] = [];
  let inStr = false;
  let inValue = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      out.push(c);
      escape = false;
      continue;
    }
    if (c === "\\" && inStr) {
      out.push(c);
      escape = true;
      continue;
    }
    if (c === '"') {
      if (!inStr) {
        inStr = true;
        const before = out.join("").replace(/\s+$/, "");
        inValue = /[:\[]\s*$/.test(before);
        out.push(c);
      } else {
        const rest = s.slice(i + 1);
        // Don't escape when: end of input, or followed by , } ], or " "key" (next key)
        const looksLikeValueEnd =
          rest === "" ||
          /^\s*[,}\]]/.test(rest) ||
          /^\s*"[a-zA-Z_][a-zA-Z0-9_]*"\s*:/.test(rest);
        if (!inValue || looksLikeValueEnd) {
          inStr = false;
          out.push(c);
        } else {
          out.push('\\"');
        }
      }
      continue;
    }
    out.push(c);
  }
  return out.join("");
}

/** Try to close unclosed brackets at end (for truncated LLM output) */
function tryCloseTruncatedBrackets(s: string): string {
  let inStr = false;
  let escape = false;
  let strChar = "";
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inStr) {
      escape = true;
      continue;
    }
    if ((c === '"' || c === "'") && !inStr) {
      inStr = true;
      strChar = c;
      continue;
    }
    if (c === strChar && inStr) {
      inStr = false;
      continue;
    }
    if (inStr) continue;
    if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  return s + stack.reverse().join("");
}

/** Sanitize LLM output: strip code blocks, fix common LLM mistakes, try jsonrepair */
function parseJsonWithRepair(raw: string): { parsed: unknown; error?: string } {
  let s = extractJson(raw);

  const tryParse = (str: string): unknown => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // 1) Try parse as-is first (LLM sometimes outputs valid JSON)
  let parsed = tryParse(s);
  if (parsed) return { parsed };

  // 2) Try jsonrepair early (handles truncation, unclosed brackets)
  try {
    parsed = JSON.parse(jsonrepair(s));
    if (parsed) return { parsed };
  } catch {
    /* continue to other repairs */
  }

  // 3) Fix truncated "key": (no value) or "key" (no colon) – append value and close
  let fixed = s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*$/g, '"$1": null');
  if (fixed === s && /"\s*$/.test(s)) {
    fixed = s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"\s*$/, '"$1": ""');
  }
  if (fixed !== s) {
    parsed = tryParse(tryCloseTruncatedBrackets(fixed));
    if (parsed) return { parsed };
  }

  // 4) Try closing truncated brackets
  const closed = tryCloseTruncatedBrackets(s);
  parsed = tryParse(closed);
  if (parsed) return { parsed };

  // 5) Fix unescaped quotes inside strings – state machine escapes any " found while inside a string
  s = escapeQuotesInStrings(s);

  // 6) Fix control chars in strings
  s = s.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
    match.replace(/[\u0000-\u001F]/g, (c) => {
      const esc: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
      return esc[c] ?? " ";
    })
  );

  // 7) Fix period instead of comma/colon
  s = s.replace(/]\s*\.\s*"/g, '],"');
  s = s.replace(/}\s*\.\s*"/g, '},"');
  s = s.replace(/"\s*\.\s*"/g, '": "');
  s = s.replace(/,(\s*[}\]])/g, "$1");

  // 8) Fix "Object key expected" causes: double commas, leading comma, missing value
  s = s.replace(/,(\s*,)+/g, ",");
  s = s.replace(/\{\s*,\s*/g, "{ ");
  // Only fix "key": , or "key": } (key without value), not : , inside string values
  s = s.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*([,}])/g, '"$1": null$2');

  parsed = tryParse(s);
  if (parsed) return { parsed };

  // 9) Try jsonrepair on preprocessed string (handles remaining edge cases)
  try {
    parsed = JSON.parse(jsonrepair(s));
    return { parsed };
  } catch (err) {
    return { parsed: null, error: err instanceof Error ? err.message : "JSON repair failed" };
  }
}

export function validateStrictJson(
  raw: string,
  schemaKey: SchemaKey
): ValidationResult {
  const { parsed, error } = parseJsonWithRepair(raw);
  if (error) {
    const localizedError = error
      .replace("Unexpected character", "Unerwartetes Zeichen")
      .replace("Unexpected token", "Unerwartetes Zeichen");
    return {
      ok: false,
      errors: ["Ungültiges JSON", localizedError].filter(Boolean),
    };
  }

  const schema = schemaRegistry[schemaKey];

  // 1) Erster Versuch mit Alias-Normalisierung (bekannte Tippfehler → kanonisch).
  const normalized = normalizeFieldAliases(parsed);
  let result = schema.safeParse(normalized);

  // 2) Wenn ausschließlich „unrecognized_keys"-Fehler auftreten (z. B. neue
  //    Hallucinations-Felder, die wir noch nicht in der Alias-Tabelle haben),
  //    strippen wir diese Keys und validieren erneut. Required-Felder-Fehler
  //    bleiben davon unberührt.
  if (!result.success) {
    const unrecognizedIssues = result.error.errors.filter((i) => i.code === "unrecognized_keys");
    if (unrecognizedIssues.length > 0) {
      const cleaned = stripUnrecognizedKeys(normalized, unrecognizedIssues);
      const retry = schema.safeParse(cleaned);
      if (retry.success) {
        return { ok: true, data: retry.data };
      }
      // Wenn nach dem Strippen nur noch „unrecognized_keys" übrig sind (nested),
      // nochmal probieren. Schutz gegen Endlosschleife durch max. 3 Runden.
      let working = cleaned;
      let currentError = retry.error;
      for (let round = 0; round < 3; round++) {
        const nested = currentError.errors.filter((i) => i.code === "unrecognized_keys");
        if (nested.length === 0) break;
        working = stripUnrecognizedKeys(working, nested);
        const next = schema.safeParse(working);
        if (next.success) {
          return { ok: true, data: next.data };
        }
        currentError = next.error;
      }
      result = schema.safeParse(working);
    }
  }

  if (!result.success) {
    const errors = result.error.errors.map((issue) =>
      `${issue.path.join(".") || "root"}: ${issue.message}`
    );
    return { ok: false, errors };
  }

  return { ok: true, data: result.data };
}

export function parseJsonField<T extends z.ZodTypeAny>(
  raw: unknown,
  schema: T
): z.infer<T> | null {
  const result = schema.safeParse(raw);
  return result.success ? result.data : null;
}
