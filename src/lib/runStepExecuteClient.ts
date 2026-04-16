/**
 * Einheitlicher Browser-Client für POST /api/run-step/execute.
 * Alle KI-Schritt-Buttons sollen diesen Pfad nutzen (kein paralleles /api/llm/complete für Runs).
 */

import { fetchApi } from "@/lib/apiClient";

export type RunStepExecuteSuccess = {
  success: true;
  schemaValidationPassed?: boolean;
  stepKey?: string;
  /** Full text; omitted when `largeResponseSaved` (avoids huge JSON over the wire — data is in DB). */
  userPastedResponse?: string;
  largeResponseSaved?: boolean;
  contentLength?: number;
  debugId?: string;
};

export type RunStepExecuteFailureBody = {
  success?: boolean;
  error?: string;
  validationErrors?: string[];
  schemaValidationPassed?: boolean;
  stepKey?: string;
  /** True when the server stored the raw LLM text but schema validation failed (e.g. 422). */
  persisted?: boolean;
  debugId?: string;
};

export async function postRunStepExecute(params: {
  runId: string;
  stepKey: string;
  signal?: AbortSignal;
}): Promise<
  | { ok: true; status: number; data: RunStepExecuteSuccess }
  | { ok: false; status: number; data: RunStepExecuteFailureBody }
> {
  const res = await fetchApi("/api/run-step/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId: params.runId, stepKey: params.stepKey }),
    signal: params.signal,
  });
  const ct = res.headers.get("content-type") ?? "";
  const data = (ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : { error: (await res.text().catch(() => "")).slice(0, 200) || `Nicht-JSON-Antwort (${res.status})` }) as
    | RunStepExecuteSuccess
    | RunStepExecuteFailureBody;
  if (
    res.ok &&
    data &&
    typeof data === "object" &&
    "success" in data &&
    (data as RunStepExecuteSuccess).success === true
  ) {
    return { ok: true, status: res.status, data: data as RunStepExecuteSuccess };
  }
  return { ok: false, status: res.status, data: data as RunStepExecuteFailureBody };
}

export function formatRunStepExecuteError(status: number, data: RunStepExecuteFailureBody): string {
  const schemaHint =
    status === 422 && Array.isArray(data.validationErrors) && data.validationErrors.length > 0
      ? `\n${data.validationErrors.slice(0, 5).join("\n")}`
      : "";
  const debugSuffix = data.debugId ? `\n(debug: ${data.debugId})` : "";
  return (data.error ?? `HTTP ${status}`) + schemaHint + debugSuffix;
}

/** Erfolg: Text der Modellantwort; Fehler: wirft Error mit formatierter Meldung. */
export async function executeRunStepOrThrow(params: {
  runId: string;
  stepKey: string;
  signal?: AbortSignal;
}): Promise<string> {
  const result = await postRunStepExecute(params);
  if (result.ok) {
    if (result.data.largeResponseSaved) {
      return "";
    }
    return typeof result.data.userPastedResponse === "string" ? result.data.userPastedResponse : "";
  }
  throw new Error(formatRunStepExecuteError(result.status, result.data));
}
