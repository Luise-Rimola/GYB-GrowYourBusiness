"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";
import { workflowSteps, MANUAL_STEP_KEYS } from "@/lib/workflowSteps";
import { LLM_BATCH_STEP_REQUEST_MS, llmBatchStepRequestMinutes } from "@/lib/llmClientTimeouts";

type PhaseRunButtonFormProps = {
  formId: string;
  phaseId: string;
  buttonLabel: string;
  workflows: { key: string; name: string }[];
};

export function PhaseRunButtonForm({ formId, phaseId, buttonLabel, workflows }: PhaseRunButtonFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const tDash = getTranslations(locale).dashboard;
  const isEmbed = searchParams.get("embed") === "1";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);
  const [openManualModal, setOpenManualModal] = useState(false);
  const [execProgress, setExecProgress] = useState<{ current: number; total: number } | null>(null);

  async function runAutomatically() {
    setLoading(true);
    setMessage(null);
    setExecProgress(null);

    const checkedInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[form="${formId}"][name="workflow_keys"]:checked`)
    );
    const checkedKeys = checkedInputs.map((input) => input.value).filter(Boolean);
    const workflowKeys = checkedKeys;

    if (workflowKeys.length === 0) {
      setMessage({ tone: "warn", text: tDash.phaseRunsNoneSelected });
      setLoading(false);
      return;
    }

    try {
      const runIdsByWf: Record<string, string> = {};
      for (const wf of workflowKeys) {
        const ensureRes = await fetch("/api/runs/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowKey: wf, onlyOpen: true }),
        });
        const ensureData = (await ensureRes.json()) as {
          runId?: string;
          error?: string;
          debugId?: string;
          skipped?: string;
        };
        if (ensureData.skipped === "completed_exists") {
          continue;
        }
        if (!ensureRes.ok || !ensureData.runId) {
          const debugSuffix = ensureData.debugId ? ` (debug: ${ensureData.debugId})` : "";
          setMessage({
            tone: "error",
            text: (ensureData.error ?? "Prozess-Lauf konnte nicht bereitgestellt werden.") + debugSuffix,
          });
          setLoading(false);
          return;
        }
        runIdsByWf[wf] = ensureData.runId;
      }

      type WorkflowRunItem = { runId: string; wf: string; stepKey: string; label: string };
      const workflowsToRun: WorkflowRunItem[] = [];
      for (const wf of workflowKeys) {
        const runId = runIdsByWf[wf];
        if (!runId) continue;
        const autoSteps = (workflowSteps[wf] ?? []).filter((s) => !MANUAL_STEP_KEYS.has(s.stepKey));
        // Single-call mode: execute exactly one primary step per workflow.
        // We choose the last non-manual step as the workflow's culmination step.
        const primary = autoSteps.at(-1);
        if (!primary) continue;
        workflowsToRun.push({ runId, wf, stepKey: primary.stepKey, label: primary.label });
      }

      if (workflowsToRun.length === 0) {
        setMessage({ tone: "warn", text: tDash.phaseRunsAllAlreadyActive });
        setLoading(false);
        return;
      }

      setMessage({
        tone: "ok",
        text:
          locale === "de"
            ? `Starte ${workflowsToRun.length} offenen Prozess${workflowsToRun.length === 1 ? "" : "e"} …`
            : `Starting ${workflowsToRun.length} open workflow${workflowsToRun.length === 1 ? "" : "s"} ...`,
      });

      setExecProgress({ current: 0, total: workflowsToRun.length });

      for (let i = 0; i < workflowsToRun.length; i++) {
        const it = workflowsToRun[i];
        setExecProgress({ current: i + 1, total: workflowsToRun.length });
        const execRes = await fetch("/api/run-step/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: it.runId, stepKey: it.stepKey }),
          signal: AbortSignal.timeout(LLM_BATCH_STEP_REQUEST_MS),
        });
        const execData = (await execRes.json()) as { error?: string; validationErrors?: string[]; debugId?: string };
        if (!execRes.ok) {
          const schemaHint =
            execRes.status === 422 && Array.isArray(execData.validationErrors) && execData.validationErrors.length > 0
              ? ` ${execData.validationErrors.slice(0, 3).join("; ")}`
              : "";
          const debugSuffix = execData.debugId ? ` (debug: ${execData.debugId})` : "";
          setMessage({
            tone: "error",
            text: `${it.wf} / ${it.label}: ${execData.error ?? "Ausführung fehlgeschlagen"}${schemaHint}${debugSuffix}`,
          });
          setLoading(false);
          setExecProgress(null);
          return;
        }
      }

      setExecProgress(null);
      const n = workflowsToRun.length;
      const doneText =
        locale === "de"
          ? "KI-Analyse abgeschlossen."
          : "AI analysis completed.";
      setMessage({ tone: "ok", text: doneText });
      router.refresh();
    } catch (e) {
      const timedOut =
        (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) ||
        (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError");
      setMessage({
        tone: "error",
        text: timedOut
          ? locale === "de"
            ? `Zeitüberschreitung bei einem KI-Schritt (über ${llmBatchStepRequestMinutes()} Min). Bitte erneut „Ausführen“ oder einzelne Schritte im Lauf.`
            : `Timeout on an AI step (>${llmBatchStepRequestMinutes()} min). Retry automatic run or execute steps in the run view.`
          : "Prozesse konnten nicht ausgeführt werden.",
      });
    } finally {
      setLoading(false);
      setExecProgress(null);
    }
  }

  return (
    <div className="relative flex flex-col items-end gap-1">
      <div>
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (loading) return;
            void runAutomatically();
          }}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {loading ? "Läuft…" : buttonLabel}
        </button>
      </div>
      {!isEmbed ? (
        <button
          type="button"
          onClick={() => setOpenManualModal(true)}
          className="text-[11px] font-medium text-[var(--muted)] underline-offset-2 hover:underline"
        >
          Manueller Assistent
        </button>
      ) : null}
      {execProgress ? (
        <p className="text-[11px] text-[var(--muted)]">
          {locale === "de" ? "Workflow" : "Workflow"} {execProgress.current}/{execProgress.total}…
        </p>
      ) : null}
      {message ? (
        <p
          className={`max-w-[min(28rem,85vw)] text-right text-[11px] ${
            message.tone === "ok"
              ? "text-emerald-700"
              : message.tone === "warn"
                ? "text-amber-800 dark:text-amber-200"
                : "text-rose-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}
      {openManualModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenManualModal(false);
          }}
        >
          <div className="w-full max-w-xl rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Manueller Assistent – diese Phase</h3>
              <button
                type="button"
                onClick={() => setOpenManualModal(false)}
                className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs"
              >
                Schließen
              </button>
            </div>
            <div className="space-y-3 px-4 py-3">
              <p className="text-xs text-[var(--muted)]">Diese Prozesse gehören zur ausgewählten Phase:</p>
              <div className="space-y-2">
                {workflows.map((wf, i) => (
                  <div key={wf.key} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">
                    {i + 1}. {wf.name}
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <Link
                  href={`/assistant/?phase=${phaseId}`}
                  className="inline-block rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Assistent für diese Phase öffnen
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
