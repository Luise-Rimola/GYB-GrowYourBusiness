function readFirstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

export function sanitizeHttpUrl(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return raw;
    return "";
  } catch {
    return "";
  }
}

export function getEnvDefaultApiUrl(): string {
  return sanitizeHttpUrl(
    readFirstNonEmpty(
      process.env.LLM_API_URL_DEFAULT,
      process.env.LLM_API_URL,
      process.env.KIMI_API_URL_DEFAULT,
      process.env.KIMI_API_URL,
      process.env.OPENAI_API_URL_DEFAULT,
      process.env.OPENAI_API_URL,
      process.env.OPENAI_BASE_URL,
    ),
  );
}

export function getEnvDefaultApiKey(): string {
  return readFirstNonEmpty(
    process.env.LLM_API_KEY_DEFAULT,
    process.env.LLM_API_KEY,
    process.env.KIMI_API_KEY_DEFAULT,
    process.env.KIMI_API_KEY,
    process.env.OPENAI_API_KEY_DEFAULT,
    process.env.OPENAI_API_KEY,
  );
}

export function getEnvDefaultModel(): string {
  return (
    readFirstNonEmpty(
      process.env.LLM_MODEL_DEFAULT,
      process.env.LLM_MODEL,
      process.env.KIMI_MODEL_DEFAULT,
      process.env.KIMI_MODEL,
      process.env.OPENAI_MODEL_DEFAULT,
      process.env.OPENAI_MODEL,
    ) || "gpt-4o-mini"
  );
}

