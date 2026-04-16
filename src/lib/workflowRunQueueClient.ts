import { fetchApi } from "@/lib/apiClient";
import { MANUAL_STEP_KEYS, workflowSteps } from "@/lib/workflowSteps";

export type WorkflowRunQueueItem = {
  wf: string;
  runId: string;
  stepKey: string;
  label: string;
};

export async function buildWorkflowRunQueue(params: {
  workflowKeys: string[];
  onlyOpen: boolean;
}): Promise<WorkflowRunQueueItem[]> {
  const runIdsByWf: Record<string, string> = {};
  for (const wf of params.workflowKeys) {
    const res = await fetchApi("/api/runs/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowKey: wf, onlyOpen: params.onlyOpen }),
    });
    const data = (await res.json()) as {
      runId?: string;
      error?: string;
      debugId?: string;
      skipped?: string;
    };
    if (data.skipped === "completed_exists") continue;
    if (!res.ok || !data.runId) {
      const debugSuffix = data.debugId ? ` (debug: ${data.debugId})` : "";
      throw new Error((data.error ?? "Prozess-Lauf konnte nicht bereitgestellt werden.") + debugSuffix);
    }
    runIdsByWf[wf] = data.runId;
  }

  const items: WorkflowRunQueueItem[] = [];
  for (const wf of params.workflowKeys) {
    const runId = runIdsByWf[wf];
    if (!runId) continue;
    const autoSteps = (workflowSteps[wf] ?? []).filter((s) => !MANUAL_STEP_KEYS.has(s.stepKey));
    for (const step of autoSteps) {
      items.push({ wf, runId, stepKey: step.stepKey, label: step.label });
    }
  }
  return items;
}

