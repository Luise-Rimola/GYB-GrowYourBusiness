import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { schemaRegistry, SchemaKey } from "@/types/schemas";

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
    return {
      ok: false,
      errors: ["Invalid JSON", error].filter(Boolean),
    };
  }

  const schema = schemaRegistry[schemaKey];
  const result = schema.safeParse(parsed);
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
