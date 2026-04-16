/** Client-seitiges Limit pro KI-Request (z. B. RunWizard → /api/run-step/execute). */
export const LLM_SINGLE_REQUEST_MS = 900_000; // 15 Minuten

/** Längeres Client-Limit für Batch-Abläufe über mehrere Workflows. */
export const LLM_BATCH_STEP_REQUEST_MS = 900_000; // 15 Minuten pro Schritt

/**
 * Server → Upstream-LLM (AbortSignal + undici Agent headers/body timeouts).
 * Must stay in line with route `maxDuration` and client `LLM_SINGLE_REQUEST_MS` so Kimi
 * can finish before we abort or hit undici's default header window.
 */
export const LLM_UPSTREAM_FETCH_MS = 900_000; // 15 minutes

export function llmSingleRequestMinutes(): number {
  return Math.round(LLM_SINGLE_REQUEST_MS / 60_000);
}

export function llmBatchStepRequestMinutes(): number {
  return Math.round(LLM_BATCH_STEP_REQUEST_MS / 60_000);
}
