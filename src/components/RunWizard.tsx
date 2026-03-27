"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { CopyButton } from "@/components/CopyButton";

function RunLlmButton({
  prompt,
  onResponse,
  loading,
  setLoading,
}: {
  prompt: string;
  onResponse: (content: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  async function handleRun() {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/llm/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      onResponse(data.content ?? "");
    } catch (err) {
      alert(err instanceof Error ? err.message : "LLM-Anfrage fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button
      type="button"
      onClick={handleRun}
      disabled={loading}
      className="rounded-lg border border-teal-600 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50 disabled:opacity-50"
    >
      {loading ? "…" : "Run"}
    </button>
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
}: RunWizardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const responseRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [runLoading, setRunLoading] = useState(false);
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

  if (stepsConfig.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted)]">
        No steps configured for this workflow.
      </div>
    );
  }

  const stepConfig = stepsConfig[stepIndex];
  const isBusinessFormStep = stepConfig.stepKey === "business_form" && businessFormStep;
  const isKpiQuestionsStep = stepConfig.stepKey === "kpi_questions_answer" && kpiQuestionsStep;
  const basePrompt = promptsByStepKey[stepConfig.stepKey] ?? "";
  const prompt = basePrompt.replace("{{USER_NOTES}}", (userNotes || "").trim() || "(keine)");
  const savedStep = run.steps.find((s) => s.stepKey === stepConfig.stepKey);
  const existingResponse = savedStep?.userPastedResponse ?? "";
  const isVerified = isBusinessFormStep
    ? businessFormStep!.isComplete
    : isKpiQuestionsStep
      ? kpiQuestionsStep!.isComplete
      : (savedStep?.verifiedByUser ?? false);
  const canVerify =
    !isBusinessFormStep &&
    savedStep &&
    savedStep.schemaValidationPassed &&
    !savedStep.verifiedByUser;
  const hasValidationErrors =
    savedStep && !savedStep.schemaValidationPassed;
  const useUpdateForm = hasValidationErrors && updateStep;

  const getStepStatus = (idx: number) => {
    const cfg = stepsConfig[idx];
    const saved = run.steps.find((s) => s.stepKey === cfg.stepKey);
    const isFormStep = cfg.stepKey === "business_form" || cfg.stepKey === "kpi_questions_answer";
    const formComplete =
      cfg.stepKey === "business_form" && businessFormStep?.isComplete ||
      cfg.stepKey === "kpi_questions_answer" && kpiQuestionsStep?.isComplete;
    if (isFormStep && formComplete) return "verified";
    if (saved?.verifiedByUser) return "verified";
    if (saved?.schemaValidationPassed) return "saved";
    if (saved && !saved.schemaValidationPassed) return "invalid";
    return "pending";
  };

  const completedCount = stepsConfig.filter((_, idx) => {
    const s = getStepStatus(idx);
    return s === "verified" || s === "saved";
  }).length;

  return (
    <div className="space-y-6">
      {/* Step list – all steps visible */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <p className="text-xs font-semibold text-[var(--muted)] mb-3">All steps</p>
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

      {/* Run notes – injected into prompt in real-time */}
      {saveRunNotes && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
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
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {runNotesLabel}
              </label>
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

      {/* Completion bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-teal-600 transition-all duration-300"
            style={{
              width: `${stepsConfig.length ? (completedCount / stepsConfig.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="text-sm font-medium text-[var(--muted)] shrink-0 min-w-[4rem]">
          {completedCount}/{stepsConfig.length} abgeschlossen
        </span>
      </div>

      {/* Step card */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {stepConfig.label}
          </h3>
          <div className="flex items-center gap-2">
            {savedStep && (
              <span
                className={`text-xs font-medium ${
                  savedStep.schemaValidationPassed
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {savedStep.schemaValidationPassed ? "✓ Saved" : "Invalid"}
              </span>
            )}
            {isVerified && (
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                ✓ Verified
              </span>
            )}
          </div>
        </div>

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
        {/* Wizard: Prompt + Response – collapsible, collapsed when verified */}
        <details className="group mb-6 rounded-xl border border-[var(--card-border)]" open={!isVerified}>
          <summary className="cursor-pointer list-none rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-slate-50 dark:hover:bg-slate-900/30 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="text-[var(--muted)] transition group-open:rotate-90">▸</span>
              Prompt & Response
            </span>
          </summary>
          <div className="border-t border-[var(--card-border)] p-4 pt-3 space-y-4">
        {/* Prompt (read-only) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--muted)]">
              Prompt
            </p>
            <div className="flex items-center gap-2">
              <CopyButton text={prompt} label="Copy" />
              <RunLlmButton
                prompt={prompt}
                onResponse={(content) => {
                  if (responseRef.current) responseRef.current.value = content;
                }}
                loading={runLoading}
                setLoading={setRunLoading}
              />
            </div>
          </div>
          <textarea
            readOnly
            rows={6}
            className="w-full rounded-xl border border-[var(--card-border)] bg-slate-50 p-3 text-xs text-[var(--foreground)] dark:bg-slate-900/30 resize-none"
            value={prompt}
          />
        </div>

        {/* Answer textarea + Save form */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--muted)]">
              Response
            </p>
            {isVerified && (
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                ✓ Verified
              </span>
            )}
          </div>
          {useUpdateForm ? (
            <form action={updateStep} className="space-y-3">
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
                key={stepConfig.stepKey}
                name="user_response"
                rows={6}
                defaultValue={existingResponse}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none"
                placeholder='Paste the LLM JSON output here (e.g. {"kpi_estimates": [...], "sources_used": []}). Do NOT paste the prompt.'
              />
              {savedStep?.validationErrorsJson != null && (
                <div className="space-y-2">
                  {stepConfig.stepKey === "kpi_estimation" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                      Response must be the LLM&apos;s JSON output (with kpi_estimates), not the prompt. Copy prompt → paste into ChatGPT/Claude → copy JSON response → paste here.
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
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                Fix & Re-save
              </button>
            </form>
          ) : (
            <form action={saveStep} className="space-y-3">
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
                key={stepConfig.stepKey}
                name="user_response"
                rows={6}
                defaultValue={existingResponse}
                className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none"
                placeholder='1) Copy prompt above → 2) Paste into ChatGPT/Claude → 3) Copy the JSON output (with kpi_estimates) → 4) Paste here'
              />
              <button
                type="submit"
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                Save Step
              </button>
            </form>
          )}
        </div>
          </div>
        </details>
          </>
        )}

        {/* Verify form */}
        {canVerify && (
          <form action={verifyStep} className="mb-6">
            <input type="hidden" name="step_id" value={savedStep.id} />
            <input type="hidden" name="run_id" value={run.id} />
            <input type="hidden" name="notes" value="" />
            <input type="hidden" name="step" value={String(stepIndex)} />
            <button
              type="submit"
              className="rounded-xl border border-teal-600 px-4 py-2 text-xs font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
            >
              Verify
            </button>
          </form>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
          <div>
            {stepIndex > 0 ? (
              <button
                type="button"
                onClick={() => navigateToStep(stepIndex - 1)}
                className="rounded-xl border border-[var(--card-border)] px-4 py-2 text-xs font-medium text-[var(--foreground)] transition hover:bg-teal-50 hover:border-teal-200 dark:hover:bg-teal-950/30 dark:hover:border-teal-800"
              >
                ← Prev
              </button>
            ) : (
              <span />
            )}
          </div>
          <div>
            {stepIndex < stepsConfig.length - 1 ? (
              <button
                type="button"
                onClick={() => navigateToStep(stepIndex + 1)}
                className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                Next →
              </button>
            ) : isVerified ? (
              <a
                href="/dashboard"
                className="inline-block rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                View Dashboard →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
