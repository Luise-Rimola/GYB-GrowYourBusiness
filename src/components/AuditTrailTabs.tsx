"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReadableDataView } from "@/components/ReadableDataView";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";

type StepData = {
  id: string;
  stepKey: string;
  stepLabel: string;
  stepNum: number;
  isSaved: boolean;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeIndex, setActiveIndex] = useState(0);
  const active = steps[activeIndex];

  useEffect(() => {
    const rawStep = searchParams.get("step");
    const currentStep = Number(rawStep);
    if (!Number.isFinite(currentStep) || currentStep < 0) return;

    // URL uses 0-based step index, displayed tab numbers are 1-based.
    const targetStepNum = currentStep + 1;
    const exactIdx = steps.findIndex((s) => s.stepNum === targetStepNum);
    if (exactIdx >= 0) {
      setActiveIndex(exactIdx);
      return;
    }

    // If the exact step is not present in audit tabs, pick nearest previous available.
    let fallbackIdx = -1;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].stepNum <= targetStepNum) fallbackIdx = i;
    }
    if (fallbackIdx >= 0) setActiveIndex(fallbackIdx);
  }, [searchParams, steps]);

  if (steps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
      <div className="flex border-b border-[var(--card-border)] bg-slate-50/50 dark:bg-slate-900/30">
        {steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              setActiveIndex(i);
              const params = new URLSearchParams(searchParams.toString());
              params.set("step", String(Math.max(0, step.stepNum - 1)));
              router.replace(`${pathname}?${params.toString()}`);
            }}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {active.isSaved && active.verifiedByUser && (
                <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                  ✓ Verifiziert
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {active.isSaved && !active.verifiedByUser && active.schemaValidationPassed && (
                <form action={verifyStep} className="inline">
                  <input type="hidden" name="step_id" value={active.id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <input type="hidden" name="step" value={String(Math.max(0, active.stepNum - 1))} />
                  <input type="hidden" name="notes" value="" />
                  <button
                    type="submit"
                    className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-teal-700"
                  >
                    Verifizieren
                  </button>
                </form>
              )}
              {active.isSaved && !active.schemaValidationPassed && (
                <ConfirmDeleteForm
                  action={deleteStep}
                  confirmMessage="Diesen Schritt löschen? Die Antwort wird entfernt und kann danach neu eingegeben werden."
                  className="inline"
                >
                  <input type="hidden" name="step_id" value={active.id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <button
                    type="submit"
                    className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/30"
                  >
                    Loeschen
                  </button>
                </ConfirmDeleteForm>
              )}
            </div>
          </div>
          {!active.isSaved ? (
            <div className="mb-4 rounded-xl border border-[var(--card-border)] bg-slate-50 p-3 text-xs text-[var(--muted)] dark:bg-slate-900/30">
              Für diesen Schritt ist noch kein Ergebnis gespeichert.
            </div>
          ) : null}
          {active.isSaved && !active.schemaValidationPassed && active.validationErrorsJson ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
              Validierungsfehler:{" "}
              {Array.isArray(active.validationErrorsJson)
                ? (active.validationErrorsJson as string[]).join("; ")
                : String(JSON.stringify(active.validationErrorsJson))}
            </div>
          ) : null}
          {active.isSaved && !active.schemaValidationPassed && active.userPastedResponse && (
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
                  placeholder="JSON korrigieren und erneut speichern..."
                />
              </form>
              <div className="flex gap-2">
                <button
                  type="submit"
                  form={`update-step-${active.id}`}
                  className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
                >
                  Korrigieren & erneut speichern
                </button>
                <ConfirmDeleteForm
                  action={deleteStep}
                  confirmMessage="Diesen Schritt löschen? Die Antwort wird entfernt und kann danach neu eingegeben werden."
                  className="inline"
                >
                  <input type="hidden" name="step_id" value={active.id} />
                  <input type="hidden" name="run_id" value={runId} />
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-950/30"
                  >
                    Loeschen
                  </button>
                </ConfirmDeleteForm>
              </div>
            </div>
          )}
          {active.isSaved && active.verificationNotes && (
            <p className="mb-4 text-xs text-[var(--muted)]">
              Notizen: {active.verificationNotes}
            </p>
          )}
          <ReadableDataView
            data={
              active.isSaved
                ? (active.parsedOutputJson ?? { errors: active.validationErrorsJson })
                : { info: "Noch kein Ergebnis gespeichert." }
            }
            collapsible={false}
          />
        </div>
      )}
    </div>
  );
}
