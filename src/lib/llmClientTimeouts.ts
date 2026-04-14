/** Client-seitiges Limit pro KI-Request (run-step, /api/llm/complete). 3 Min waren in der Praxis zu knapp. */
export const LLM_SINGLE_REQUEST_MS = 600_000; // 10 Minuten

/** Längeres Client-Limit für Batch-Abläufe über mehrere Workflows. */
export const LLM_BATCH_STEP_REQUEST_MS = 900_000; // 15 Minuten pro Schritt

/** Server → Upstream-LLM: etwas kürzer als der Client, damit die Route rechtzeitig mit JSON-Fehler antwortet. */
export const LLM_UPSTREAM_FETCH_MS = 540_000; // 9 Minuten

export function llmSingleRequestMinutes(): number {
  return Math.round(LLM_SINGLE_REQUEST_MS / 60_000);
}

export function llmBatchStepRequestMinutes(): number {
  return Math.round(LLM_BATCH_STEP_REQUEST_MS / 60_000);
}
