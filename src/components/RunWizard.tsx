"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CopyButton } from "@/components/CopyButton";
import { getWorkflowStepStatus } from "@/lib/workflowStepStatus";
import { LLM_SINGLE_REQUEST_MS, llmSingleRequestMinutes } from "@/lib/llmClientTimeouts";
import { formatRunStepExecuteError, postRunStepExecute } from "@/lib/runStepExecuteClient";

// Guard should never fire before the actual request timeout.
const UI_STUCK_GUARD_MS = LLM_SINGLE_REQUEST_MS + 10_000;

function createLlmAbortController(): {
  signal: AbortSignal;
  abort: () => void;
  cancelTimer: () => void;
} {
  const ac = new AbortController();
  const tid = window.setTimeout(() => ac.abort(), LLM_SINGLE_REQUEST_MS);
  return {
    signal: ac.signal,
    abort: () => ac.abort(),
    cancelTimer: () => window.clearTimeout(tid),
  };
}

function RunLlmButton({
  prompt,
  onResponse,
  loading,
  setLoading,
  runExecute,
  disabled,
}: {
  prompt: string;
  onResponse: (content: string) => void | Promise<void>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  runExecute: { runId: string; stepKey: string };
  disabled?: boolean;
}) {
  const [inlineError, setInlineError] = useState<string>("");
  const [inlineInfo, setInlineInfo] = useState<string>("");

  async function handleRun() {
    // Prompt is rendered server-side in /api/run-step/execute; do not block if the preview is empty.
    setLoading(true);
    setInlineError("");
    setInlineInfo("Bereite Anfrage vor");
    const { signal, abort, cancelTimer } = createLlmAbortController();
    let guardTid: number | undefined;
    guardTid = window.setTimeout(() => {
      abort();
      setInlineError(
        `Der Lauf wurde aus Sicherheitsgründen beendet, weil der Request zu lange im Ladezustand blieb. Bitte erneut ausführen.`
      );
      setLoading(false);
    }, UI_STUCK_GUARD_MS);
    try {
      setInlineInfo("Warte auf Server- und KI-Antwort");
      const execResult = await postRunStepExecute({
        runId: runExecute.runId,
        stepKey: runExecute.stepKey,
        signal,
      });
      if (!execResult.ok) {
        const errText = formatRunStepExecuteError(execResult.status, execResult.data);
        setInlineError(
          `${errText} Hinweis: Du kannst den Prompt manuell kopieren, in ChatGPT/Kimi einfügen und die JSON-Antwort hier einfügen.`
        );
        if (execResult.data.persisted) {
          // Server already saved a new raw response (often invalid JSON shape).
          // Force refresh so UI shows the latest saved state instead of stale "verified" data.
          window.setTimeout(() => {
            window.location.reload();
          }, 180);
        }
        return;
      }
      const content = execResult.data.largeResponseSaved
        ? ""
        : (typeof execResult.data.userPastedResponse === "string" ? execResult.data.userPastedResponse : "");
      setInlineInfo("Speichere Ergebnis");
      try {
        await Promise.resolve(onResponse(content));
        setInlineInfo("Fertig");
      } catch (applyErr) {
        console.error("[RunLlmButton] onResponse:", applyErr);
        setInlineError(
          applyErr instanceof Error
            ? applyErr.message
            : "Antwort konnte nicht gespeichert werden. Bitte „Schritt speichern“ nutzen oder Seite neu laden."
        );
      }
    } catch (err) {
      const aborted =
        (err instanceof Error && err.name === "AbortError") ||
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError");
      const errorText = aborted
        ? `Zeitüberschreitung nach ${llmSingleRequestMinutes()} Min — Anfrage abgebrochen.`
        : err instanceof Error
          ? err.message
          : "LLM-Anfrage fehlgeschlagen";
      setInlineError(
        `${errorText} Hinweis: Du kannst den Prompt manuell kopieren, in ChatGPT/Kimi einfügen und die JSON-Antwort hier einfügen.`
      );
    } finally {
      if (guardTid != null) window.clearTimeout(guardTid);
      cancelTimer();
      setLoading(false);
    }
  }
  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onPointerDown={(e) => {
          // Keep event inside the control container, but do not cancel native click synthesis.
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          void handleRun();
        }}
        disabled={loading || disabled}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 dark:hover:bg-blue-500"
      >
        {loading ? "…" : disabled ? "Bereits gespeichert" : "Ausführen des KI-Prozesses"}
      </button>
      {inlineError ? (
        <p className="absolute right-0 top-full z-20 mt-2 w-[34rem] max-w-[75vw] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 shadow-md dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-200">
          {inlineError}
        </p>
      ) : null}
      {!inlineError && inlineInfo ? (
        <p className="absolute right-0 top-full z-20 mt-2 w-[34rem] max-w-[75vw] rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-800 shadow-md dark:border-teal-700 dark:bg-teal-950/80 dark:text-teal-200">
          {inlineInfo}
        </p>
      ) : null}
    </div>
  );
}
import { IntakeForm } from "@/components/IntakeForm";
import { KpiQuestionsForm } from "@/components/KpiQuestionsForm";

export type StepConfig = {
  stepKey: string;
  schemaKey: string;
  label: string;
};

export type RunStep = {
  id: string;
  stepKey: string;
  userPastedResponse: string | null;
  verifiedByUser: boolean;
  schemaValidationPassed: boolean;
  validationErrorsJson?: unknown;
};

export type Run = {
  id: string;
  userNotes?: string;
  ideaMode?: string | null;
  ideaArtifactId?: string | null;
  steps: RunStep[];
};

type RunWizardProps = {
  run: Run;
  stepsConfig: StepConfig[];
  promptsByStepKey: Record<string, string>;
  saveStep: (formData: FormData) => Promise<void>;
  verifyStep: (formData: FormData) => Promise<void>;
  updateStep?: (formData: FormData) => Promise<void>;
  saveRunNotes?: (formData: FormData) => Promise<void>;
  runNotesLabel?: string;
  runNotesPlaceholder?: string;
  businessFormStep?: {
    existing: Record<string, unknown>;
    submitAction: (formData: FormData) => Promise<void>;
    isComplete: boolean;
  };
  kpiQuestionsStep?: {
    plan: { questions_simple: string[]; mapping_to_kpi_keys: string[]; default_estimates_if_unknown: string[] };
    existingAnswers: string[];
    submitAction: (formData: FormData) => Promise<void>;
    isComplete: boolean;
  };
  /** Für WF_APP_DEVELOPMENT: Idee auswählen oder eigene neue Idee; Notizen bei "neu" Pflicht */
  appDevelopmentConfig?: {
    existingIdeas: { id: string; title: string }[];
  };
  showStepList?: boolean;
  hideNextButton?: boolean;
};

export function RunWizard({
  run,
  stepsConfig,
  promptsByStepKey,
  saveStep,
  verifyStep,
  updateStep,
  businessFormStep,
  kpiQuestionsStep,
  saveRunNotes,
  runNotesLabel = "Run notes (injected into prompt)",
  runNotesPlaceholder = "e.g. Focus on profitability…",
  appDevelopmentConfig,
  showStepList = true,
  hideNextButton = false,
}: RunWizardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const responseRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [submitFromLlm, setSubmitFromLlm] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [processOpen, setProcessOpen] = useState(true);
  const [userNotes, setUserNotes] = useState(run.userNotes ?? "");
  const [ideaMode, setIdeaMode] = useState<"existing" | "new">(
    (run.ideaMode === "existing" ? "existing" : "new") as "existing" | "new"
  );
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>(run.ideaArtifactId ?? "");
  const [notesError, setNotesError] = useState<string>("");

  const stepIndex = Math.min(
    Math.max(0, Number(searchParams.get("step")) || 0),
    Math.max(0, stepsConfig.length - 1)
  );

  const navigateToStep = useCallback(
    (index: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(index));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const stepConfig = stepsConfig[stepIndex];
  const isEmbed = searchParams.get("embed") === "1";
  const savedStep = stepConfig
    ? run.steps.find((s) => s.stepKey === stepConfig.stepKey)
    : undefined;
  const existingResponse = savedStep?.userPastedResponse ?? "";
  const [responseDraft, setResponseDraft] = useState(existingResponse);
  useEffect(() => {
    setResponseDraft(existingResponse);
  }, [stepConfig?.stepKey, existingResponse]);

  useEffect(() => {
    setSubmitFromLlm(false);
  }, [stepConfig?.stepKey]);
  useEffect(() => {
    setProcessOpen(!savedStep);
  }, [stepConfig?.stepKey, savedStep?.id]);
  useEffect(() => {
    if (runLoading) setProcessOpen(true);
  }, [runLoading]);

  if (stepsConfig.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
        Für diesen Prozess sind keine Schritte konfiguriert.
      </div>
    );
  }

  const isBusinessFormStep = stepConfig.stepKey === "business_form" && businessFormStep;
  const isKpiQuestionsStep = stepConfig.stepKey === "kpi_questions_answer" && kpiQuestionsStep;
  const basePrompt = promptsByStepKey[stepConfig.stepKey] ?? "";
  const prompt = basePrompt.replace("{{USER_NOTES}}", (userNotes || "").trim() || "(keine)");
  const isVerified = isBusinessFormStep
    ? businessFormStep!.isComplete
    : isKpiQuestionsStep
      ? kpiQuestionsStep!.isComplete
      : (savedStep?.verifiedByUser ?? false);
  const hasValidationErrors =
    savedStep && !savedStep.schemaValidationPassed;
  const disableLlmRetrigger = isEmbed && Boolean(savedStep?.schemaValidationPassed);
  const useUpdateForm = hasValidationErrors && updateStep;

  const getStepStatus = (idx: number) =>
    getWorkflowStepStatus(idx, stepsConfig, run.steps, {
      businessFormComplete: businessFormStep?.isComplete,
      kpiQuestionsComplete: kpiQuestionsStep?.isComplete,
    });

  const completedCount = stepsConfig.filter((_, idx) => {
    const s = getStepStatus(idx);
    return s === "verified" || s === "saved";
  }).length;

  return (
    <div className="space-y-6">
      {showStepList && (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs font-semibold text-[var(--muted)] mb-3">Alle Schritte</p>
          <div className="flex flex-wrap gap-2">
            {stepsConfig.map((cfg, idx) => {
              const status = getStepStatus(idx);
              const isCurrent = idx === stepIndex;
              return (
                <button
                  key={cfg.stepKey}
                  type="button"
                  onClick={() => navigateToStep(idx)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isCurrent
                      ? "bg-teal-600 text-white ring-2 ring-teal-400"
                      : status === "verified"
                        ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
                        : status === "saved"
                          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          : status === "invalid"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                            : "bg-slate-100/70 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
                  }`}
                >
                  {idx + 1}. {cfg.label}
                  {status === "verified" && " ✓"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* KI-Prozess: ein Block in der äußeren Karte — kein zweiter Kasten um die Summary */}
      <details
        className={`group ${showStepList ? "border-t border-[var(--card-border)] pt-5" : ""}`}
        open={processOpen}
        onToggle={(e) => {
          const nextOpen = (e.currentTarget as HTMLDetailsElement).open;
          if (runLoading && !nextOpen) {
            // Keep the block visible while a request is running, so progress/errors stay visible.
            setProcessOpen(true);
            return;
          }
          setProcessOpen(nextOpen);
        }}
      >
        <summary className="cursor-pointer list-none rounded-lg px-0 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-slate-50/80 dark:hover:bg-slate-900/20 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block text-[var(--muted)] transition-transform duration-200 group-open:rotate-90">▸</span>
              KI-Prozess
            </span>
            {savedStep?.schemaValidationPassed ? (
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">✓ Gespeichert</span>
            ) : null}
          </span>
        </summary>
        <div className="px-0 pb-1 pt-1">
        <div className="mb-2 flex items-center justify-end">
          <div className="flex items-center gap-2">
            {savedStep && !savedStep.schemaValidationPassed && (
              <span
                className={`text-xs font-medium ${
                  "text-rose-600 dark:text-rose-400"
                }`}
              >
                Ungültig
              </span>
            )}
          </div>
        </div>

        {/* Run notes – injected into prompt in real-time (inside KI-Prozess) */}
        {saveRunNotes && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-[var(--foreground)]">{runNotesLabel}</p>
              {appDevelopmentConfig ? (
                <form
                  ref={formRef}
                  action={saveRunNotes}
                  className="space-y-4"
                  onSubmit={(e) => {
                    if (ideaMode === "new" && !userNotes.trim()) {
                      e.preventDefault();
                      setNotesError("Bei eigener neuer Idee müssen die Notizen ausgefüllt werden.");
                      return;
                    }
                    if (ideaMode === "existing" && !selectedArtifactId) {
                      e.preventDefault();
                      setNotesError("Bitte wählen Sie eine bestehende Idee aus.");
                      return;
                    }
                    setNotesError("");
                  }}
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">Idee auswählen</p>
                  <div className="space-y-3">
                    {appDevelopmentConfig.existingIdeas.length > 0 && (
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="idea_mode"
                          value="existing"
                          checked={ideaMode === "existing"}
                          onChange={() => {
                            setIdeaMode("existing");
                            setNotesError("");
                          }}
                          className="h-4 w-4 border-[var(--card-border)] text-teal-600"
                        />
                        <span className="text-sm text-[var(--foreground)]">Bestehende Idee auswählen</span>
                      </label>
                    )}
                    {ideaMode === "existing" && appDevelopmentConfig.existingIdeas.length > 0 && (
                      <div className="ml-6 space-y-2">
                        {appDevelopmentConfig.existingIdeas.map((idea) => (
                          <label key={idea.id} className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name="idea_artifact_id"
                              value={idea.id}
                              checked={selectedArtifactId === idea.id}
                              onChange={() => {
                                setSelectedArtifactId(idea.id);
                                setNotesError("");
                              }}
                              className="h-3.5 w-3.5 border-[var(--card-border)] text-teal-600"
                            />
                            <span className="text-sm text-[var(--foreground)]">{idea.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {ideaMode === "existing" && appDevelopmentConfig.existingIdeas.length === 0 && (
                      <p className="ml-6 text-xs text-[var(--muted)]">Noch keine bestehenden Ideen vorhanden.</p>
                    )}
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="idea_mode"
                        value="new"
                        checked={ideaMode === "new"}
                        onChange={() => {
                          setIdeaMode("new");
                          setNotesError("");
                        }}
                        className="h-4 w-4 border-[var(--card-border)] text-teal-600"
                      />
                      <span className="text-sm text-[var(--foreground)]">Eigene neue Idee</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">(Notizen Pflicht)</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)]">
                      {ideaMode === "new" ? "Ideen-Beschreibung (Pflicht)" : "Zusätzliche Notizen (optional)"}
                    </label>
                    <textarea
                      name="notes"
                      value={userNotes}
                      onChange={(e) => {
                        setUserNotes(e.target.value);
                        setNotesError("");
                      }}
                      onBlur={() => formRef.current?.requestSubmit()}
                      rows={ideaMode === "new" ? 4 : 2}
                      placeholder={ideaMode === "new" ? "Beschreiben Sie Ihre App-Idee vollständig…" : runNotesPlaceholder}
                      className={`mt-1 w-full rounded-xl border bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none ${
                        notesError ? "border-rose-500" : "border-[var(--card-border)]"
                      }`}
                    />
                    {notesError && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{notesError}</p>}
                  </div>
                  <input type="hidden" name="run_id" value={run.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
                  >
                    Speichern
                  </button>
                </form>
              ) : (
                <form ref={formRef} action={saveRunNotes} className="space-y-2">
                  <textarea
                    name="notes"
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    onBlur={() => formRef.current?.requestSubmit()}
                    rows={2}
                    placeholder={runNotesPlaceholder}
                    className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none"
                  />
                  <input type="hidden" name="run_id" value={run.id} />
                </form>
              )}
          </div>
        )}

        {isBusinessFormStep ? (
          <div className="mb-6">
            <IntakeForm
              existing={businessFormStep!.existing}
              submitAction={businessFormStep!.submitAction}
              hiddenFields={{
                run_id: run.id,
                step: String(stepIndex),
              }}
            />
          </div>
        ) : isKpiQuestionsStep ? (
          <div className="mb-6">
            <KpiQuestionsForm
              plan={kpiQuestionsStep!.plan}
              existingAnswers={kpiQuestionsStep!.existingAnswers}
              submitAction={kpiQuestionsStep!.submitAction}
              hiddenFields={{
                run_id: run.id,
                step: String(stepIndex),
              }}
            />
          </div>
        ) : stepConfig.stepKey === "kpi_questions_answer" ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Complete the <strong>KPI computation plan</strong> step first to see the questions.
          </div>
        ) : (
          <>
        {/* Wizard: Prompt + Response */}
        <div className="mb-4 space-y-3">
        {/* Prompt (read-only, standardmäßig eingeklappt) */}
        <details className="group rounded-xl border border-[var(--card-border)] bg-slate-50/50 dark:bg-slate-900/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="inline-block shrink-0 text-[var(--muted)] transition-transform duration-200 group-open:rotate-90">▸</span>
              Prompt
            </span>
            <div
              className="flex shrink-0 items-center gap-2"
              onPointerDown={(e) => {
                // Keep pointer events local to action controls.
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <CopyButton
                text={prompt}
                label="Kopieren"
                copiedLabel="Kopiert!"
                onCopied={() => {
                  setAnswerOpen(true);
                  setTimeout(() => responseRef.current?.focus(), 0);
                }}
              />
              <RunLlmButton
                prompt={prompt}
                runExecute={{ runId: run.id, stepKey: stepConfig.stepKey }}
                disabled={disableLlmRetrigger}
                onResponse={async (content) => {
                  flushSync(() => {
                    if (content.trim().length > 0) {
                      setResponseDraft(content);
                    }
                    setAnswerOpen(true);
                  });
                  router.refresh();
                  // Hard reload ensures the user immediately sees persisted DB state even if the route gets stuck.
                  window.setTimeout(() => {
                    window.location.reload();
                  }, 180);
                }}
                loading={runLoading}
                setLoading={setRunLoading}
              />
            </div>
          </summary>
          <div className="border-t border-[var(--card-border)] p-3">
            <textarea
              readOnly
              rows={8}
              className="max-h-[min(50vh,24rem)] w-full resize-none overflow-y-auto rounded-xl border border-[var(--card-border)] bg-slate-50 p-3 text-xs text-[var(--foreground)] dark:bg-slate-900/30"
              value={prompt}
            />
          </div>
        </details>

        {/* Answer textarea + Save form */}
        <details
          className="group rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          open={answerOpen}
          onToggle={(e) => setAnswerOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="inline-block shrink-0 text-[var(--muted)] transition-transform duration-200 group-open:rotate-90">▸</span>
              Antwort
            </span>
          </summary>
          <div className="border-t border-[var(--card-border)] p-3">
          {useUpdateForm ? (
            <form action={updateStep} className="space-y-3">
              <input type="hidden" name="from_llm_auto" value={submitFromLlm ? "1" : "0"} />
              <input type="hidden" name="step_id" value={savedStep!.id} />
              <input type="hidden" name="run_id" value={run.id} />
              <input type="hidden" name="schema_key" value={stepConfig.schemaKey} />
              <input type="hidden" name="step" value={String(stepIndex)} />
              {appDevelopmentConfig && (
                <>
                  <input type="hidden" name="notes" value={userNotes} />
                  <input type="hidden" name="idea_mode" value={ideaMode} />
                  <input
                    type="hidden"
                    name="idea_artifact_id"
                    value={ideaMode === "existing" ? selectedArtifactId : ""}
                  />
                </>
              )}
              <textarea
                ref={responseRef}
                name="user_response"
                rows={6}
                value={responseDraft}
                onChange={(e) => setResponseDraft(e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none"
                placeholder='Paste the LLM JSON output here (e.g. {"kpi_estimates": [...], "sources_used": []}). Do NOT paste the prompt.'
              />
              {savedStep?.validationErrorsJson != null && (
                <div className="space-y-2">
                  {stepConfig.stepKey === "kpi_estimation" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      Die Antwort muss der JSON-Output des LLMs sein, nicht der Prompt. Prompt kopieren → in ChatGPT/Claude einfügen → JSON-Antwort kopieren → hier einfügen.
                    </div>
                  )}
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                    Validation errors:{" "}
                    {Array.isArray(savedStep.validationErrorsJson)
                      ? savedStep.validationErrorsJson.join("; ")
                      : JSON.stringify(savedStep.validationErrorsJson)}
                  </div>
                </div>
              )}
              <button
                type="submit"
                onClick={() => setSubmitFromLlm(false)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                Fix & Re-save
              </button>
            </form>
          ) : (
            <form action={saveStep} className="space-y-3">
              <input type="hidden" name="from_llm_auto" value={submitFromLlm ? "1" : "0"} />
              <input type="hidden" name="run_id" value={run.id} />
              <input type="hidden" name="step_key" value={stepConfig.stepKey} />
              <input type="hidden" name="schema_key" value={stepConfig.schemaKey} />
              <input type="hidden" name="step" value={String(stepIndex)} />
              {appDevelopmentConfig && (
                <>
                  <input type="hidden" name="notes" value={userNotes} />
                  <input type="hidden" name="idea_mode" value={ideaMode} />
                  <input
                    type="hidden"
                    name="idea_artifact_id"
                    value={ideaMode === "existing" ? selectedArtifactId : ""}
                  />
                </>
              )}
              <textarea
                ref={responseRef}
                name="user_response"
                rows={6}
                value={responseDraft}
                onChange={(e) => setResponseDraft(e.target.value)}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none"
                placeholder='1) Prompt oben kopieren → 2) In ChatGPT/Claude einfügen → 3) JSON-Ausgabe kopieren → 4) Hier einfügen'
              />
              <button
                type="submit"
                onClick={() => setSubmitFromLlm(false)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                Schritt speichern
              </button>
            </form>
          )}
          </div>
        </details>
        </div>
          </>
        )}

        {/* Verify form */}
        {/* Navigation buttons */}
        <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-4">
          <div>
            {stepIndex > 0 && showStepList ? (
              <button
                type="button"
                onClick={() => navigateToStep(stepIndex - 1)}
                className="rounded-xl border border-[var(--card-border)] bg-slate-100 px-4 py-2 text-xs font-medium text-[var(--foreground)] transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                ← Zurück
              </button>
            ) : (
              <span />
            )}
          </div>
          <div>
            {stepIndex < stepsConfig.length - 1 && !hideNextButton ? (
              <button
                type="button"
                onClick={() => navigateToStep(stepIndex + 1)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                Weiter →
              </button>
            ) : isVerified && !hideNextButton ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                
                  if (typeof window === "undefined") return;
                
                  window.parent.postMessage(
                    { type: "assistant-reload" },
                    window.location.origin
                  );
                }}
                className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] dark:bg-[var(--card)]"
              >
                Zum Dashboard →
              </button>
            ) : null}
          </div>
        </div>
        </div>
      </details>
    </div>
  );
}
