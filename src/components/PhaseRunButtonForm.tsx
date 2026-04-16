"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";
import { LLM_BATCH_STEP_REQUEST_MS, llmBatchStepRequestMinutes } from "@/lib/llmClientTimeouts";
import { formatRunStepExecuteError, postRunStepExecute } from "@/lib/runStepExecuteClient";
import { buildWorkflowRunQueue } from "@/lib/workflowRunQueueClient";

type PhaseRunButtonFormProps = {
  formId: string;
  phaseId: string;
  buttonLabel: string;
  workflows: { key: string; name: string }[];
};

export function PhaseRunButtonForm({ formId, phaseId, buttonLabel, workflows }: PhaseRunButtonFormProps) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const tDash = getTranslations(locale).dashboard;
  const isEmbed = searchParams.get("embed") === "1";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);
  const [openManualModal, setOpenManualModal] = useState(false);
  const [execProgress, setExecProgress] = useState<{ current: number; total: number } | null>(null);

  function collectSelectedWorkflowKeys(): string[] {
    // 1) Inputs outside <form> but associated via HTML5 `form="formId"` (Dashboard execution view).
    const byFormAttr = Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[form="${formId}"][name="workflow_keys"]:checked`)
    )
      .map((input) => input.value)
      .filter(Boolean);

    // 2) Inputs inside <form id="formId">` (e.g. /workflow-overview) — they do not repeat `form="..."`.
    let byOwningForm: string[] = [];
    try {
      const owning = document.getElementById(formId);
      if (owning instanceof HTMLFormElement) {
        byOwningForm = Array.from(
          owning.querySelectorAll<HTMLInputElement>('input[name="workflow_keys"]:checked')
        )
          .map((input) => input.value)
          .filter(Boolean);
      }
    } catch {
      /* ignore */
    }

    const merged = [...new Set([...byFormAttr, ...byOwningForm])];
    return merged;
  }

  async function runAutomatically() {
    setLoading(true);
    setMessage(null);
    setExecProgress(null);

    const hasFormAttrControls = document.querySelectorAll(`input[form="${formId}"][name="workflow_keys"]`).length > 0;
    let owningForm: HTMLFormElement | null = null;
    try {
      const el = document.getElementById(formId);
      owningForm = el instanceof HTMLFormElement ? el : null;
    } catch {
      owningForm = null;
    }
    const hasOwningFormControls =
      !!owningForm && owningForm.querySelectorAll('input[name="workflow_keys"]').length > 0;

    let workflowKeys = collectSelectedWorkflowKeys();

    // Dashboard "overview" PhaseRunButtonForm: no inputs use this formId — still run all workflows for this button.
    if (workflowKeys.length === 0 && !hasFormAttrControls && !hasOwningFormControls && workflows.length > 0) {
      workflowKeys = workflows.map((w) => w.key);
    }

    if (workflowKeys.length === 0) {
      setMessage({ tone: "warn", text: tDash.phaseRunsNoneSelected });
      setLoading(false);
      return;
    }

    try {
      const workflowsToRun = await buildWorkflowRunQueue({
        workflowKeys,
        onlyOpen: true,
      });

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
        const execResult = await postRunStepExecute({
          runId: it.runId,
          stepKey: it.stepKey,
          signal: AbortSignal.timeout(LLM_BATCH_STEP_REQUEST_MS),
        });
        if (!execResult.ok) {
          const errText = formatRunStepExecuteError(execResult.status, execResult.data);
          setMessage({
            tone: "error",
            text: `${it.wf} / ${it.label}: ${errText}`,
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
      startRefreshTransition(() => {
        void router.refresh();
      });
      window.setTimeout(() => {
        window.location.reload();
      }, 180);
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
                  href={`/assistant/workflows?phase=${phaseId}&start=1`}
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
