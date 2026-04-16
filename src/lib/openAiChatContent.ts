/**
 * Normalizes OpenAI-compatible chat/completions JSON into a single assistant string.
 * Handles multipart content, array segments (GPT-5 / Responses-style), reasoning models, legacy `choices[0].text`.
 *
 * Kimi / Moonshot thinking models often put the long JSON result in `reasoning_content` while `content`
 * stays short or empty — we must merge/pick the field that actually holds the deliverable.
 */
function textFromContentPart(x: unknown): string {
  if (typeof x === "string") return x;
  if (x != null && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.content === "string") return o.content;
    if (o.type === "text" && typeof o.text === "string") return o.text;
  }
  return "";
}

function textFromMessageContent(raw: unknown): string {
  let content = "";
  if (typeof raw === "string") {
    content = raw;
  } else if (raw != null && typeof raw === "object" && Array.isArray((raw as { parts?: unknown }).parts)) {
    const parts = (raw as { parts: Array<{ text?: string }> }).parts;
    content = parts.map((p) => p.text ?? "").join("");
  } else if (Array.isArray(raw)) {
    content = raw.map((x) => textFromContentPart(x) || JSON.stringify(x)).join("");
  }
  return content;
}

function looksLikeJsonPayload(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") || t.startsWith("[");
}

function looksLikeTinyArrayReference(s: string): boolean {
  const t = s.trim();
  // Typical citation-like payloads we must NOT prefer over full answer bodies.
  return /^\[\s*\d{1,4}(?:\s*,\s*\d{1,4})*\s*\]$/.test(t);
}

/** When both `content` and `reasoning_content` are set, pick the string we should validate/store. */
function mergeContentAndReasoning(fromContent: string, fromReasoning: string): string {
  const c1 = fromContent.trim();
  const c2 = fromReasoning.trim();
  if (!c1) return c2;
  if (!c2) return c1;
  if (looksLikeTinyArrayReference(c2) && c1.length > c2.length) return c1;
  if (looksLikeTinyArrayReference(c1) && c2.length > c1.length) return c2;
  const j1 = looksLikeJsonPayload(c1);
  const j2 = looksLikeJsonPayload(c2);
  // Tiny JSON snippets (e.g. "[1]") should never outrank a substantial body.
  if (j2 && !j1 && c2.length < 80 && c1.length > 200) return c1;
  if (j1 && !j2 && c1.length < 80 && c2.length > 200) return c2;
  if (j2 && !j1) return c2;
  if (j1 && !j2) return c1;
  return c1.length >= c2.length ? c1 : c2;
}

function extractFromSingleChoice(choice: {
  message?: Record<string, unknown>;
  text?: string;
}): string {
  const msg = choice?.message;
  const fromContent = msg ? textFromMessageContent(msg.content) : "";

  let fromReasoning = "";
  if (msg && typeof msg === "object") {
    for (const k of ["reasoning_content", "reasoning", "refusal"] as const) {
      const v = msg[k];
      if (typeof v === "string" && v.trim()) {
        fromReasoning = v;
        break;
      }
    }
  }

  let content = mergeContentAndReasoning(fromContent, fromReasoning);
  if (!content.trim() && typeof choice?.text === "string") {
    content = choice.text;
  }
  return content;
}

/** Pick best non-empty string across choices (some providers use choice 1+ for the final body). */
function pickBestChoiceText(candidates: string[]): string {
  const nonEmpty = candidates.map((s) => s.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return "";
  let best = nonEmpty[0];
  for (const s of nonEmpty.slice(1)) {
    const jBest = looksLikeJsonPayload(best);
    const jS = looksLikeJsonPayload(s);
    if (jS && !jBest) best = s;
    else if (jS === jBest && s.length > best.length) best = s;
  }
  return best;
}

export function extractAssistantTextFromChatCompletion(data: unknown): string {
  const d = data as {
    choices?: Array<{ message?: Record<string, unknown>; text?: string }>;
  };

  const choices = d.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }

  const perChoice = choices.map((ch) => extractFromSingleChoice(ch ?? {}));
  const merged = pickBestChoiceText(perChoice);
  if (merged.trim()) return merged;

  return typeof choices[0]?.text === "string" ? choices[0].text : "";
}
