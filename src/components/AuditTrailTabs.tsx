"use client";

import { useState } from "react";
import { ReadableDataView } from "@/components/ReadableDataView";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";

type StepData = {
  id: string;
  stepKey: string;
  stepLabel: string;
  stepNum: number;
  parsedOutputJson: unknown;
  validationErrorsJson: unknown;
  schemaValidationPassed: boolean;
  verifiedByUser: boolean;
  userPastedResponse: string | null;
  verificationNotes: string | null;
};

type AuditTrailTabsProps = {
  steps: StepData[];
  runId: string;
  schemaKeyByStepKey: Record<string, string>;
  verifyStep: (formData: FormData) => Promise<void>;
  deleteStep: (formData: FormData) => Promise<void>;
  updateStep: (formData: FormData) => Promise<void>;
};

export function AuditTrailTabs({
  steps,
  runId,
  schemaKeyByStepKey,
  verifyStep,
  deleteStep,
  updateStep,
}: AuditTrailTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = steps[activeIndex];

  if (steps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
      <div className="flex border-b border-[var(--card-border)] bg-slate-50/50 dark:bg-slate-900/30">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
              i === activeIndex
                ? "border-b-2 border-teal-600 bg-[var(--card)] text-[var(--foreground)] dark:border-teal-500"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>
              {step.stepNum}. {step.stepLabel}
            </span>
            {step.verifiedByUser && (
              <span className="text-teal-600 dark:text-teal-400">✓</span>
            )}
          </button>
        ))}
      </div>
      {active && (
        <div className="p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  active.schemaValidationPassed
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {active.schemaValidationPassed ? "valid" : "invalid"}
              </span>
              {active.verifiedByUser && (
                <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                  ✓ Verified
                </span>
              )}
              {!active.verifiedByUser && active.schemaValidationPassed && (
                <form action={verifyStep} className="inline">
                  <input type="hidden" name="step_id" value={active.id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <input type="hidden" name="notes" value="" />
                  <button
                    type="submit"
                    className="rounded-lg border border-teal-600 px-2.5 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
                  >
                    Verify
                  </button>
                </form>
              )}
              {!active.schemaValidationPassed && (
                <ConfirmDeleteForm
                  action={deleteStep}
                  confirmMessage="Delete this step? The response will be removed and you can re-enter it."
                  className="inline"
                >
                  <input type="hidden" name="step_id" value={active.id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <button
                    type="submit"
                    className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/30"
                  >
                    Delete
                  </button>
                </ConfirmDeleteForm>
              )}
            </div>
          </div>
          {!active.schemaValidationPassed && active.validationErrorsJson ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
              Validation errors:{" "}
              {Array.isArray(active.validationErrorsJson)
                ? (active.validationErrorsJson as string[]).join("; ")
                : String(JSON.stringify(active.validationErrorsJson))}
            </div>
          ) : null}
          {!active.schemaValidationPassed && active.userPastedResponse && (
            <div className="mb-4 space-y-2">
              <form
                id={`update-step-${active.id}`}
                action={updateStep}
                className="space-y-2"
              >
                <input type="hidden" name="step_id" value={active.id} />
                <input type="hidden" name="run_id" value={runId} />
                <input
                  type="hidden"
                  name="schema_key"
                  value={
                    schemaKeyByStepKey[active.stepKey] ?? "kpi_questions"
                  }
                />
                <textarea
                  name="user_response"
                  rows={6}
                  defaultValue={active.userPastedResponse}
                  className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs placeholder:text-[var(--muted)]"
                  placeholder="Fix JSON and re-save..."
                />
              </form>
              <div className="flex gap-2">
                <button
                  type="submit"
                  form={`update-step-${active.id}`}
                  className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                >
                  Fix & Re-save
                </button>
                <ConfirmDeleteForm
                  action={deleteStep}
                  confirmMessage="Delete this step? The response will be removed and you can re-enter it."
                  className="inline"
                >
                  <input type="hidden" name="step_id" value={active.id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/30"
                  >
                    Delete
                  </button>
                </ConfirmDeleteForm>
              </div>
            </div>
          )}
          {active.verificationNotes && (
            <p className="mb-4 text-xs text-[var(--muted)]">
              Notes: {active.verificationNotes}
            </p>
          )}
          <ReadableDataView
            data={
              active.parsedOutputJson ?? { errors: active.validationErrorsJson }
            }
            collapsible={false}
          />
        </div>
      )}
    </div>
  );
}
