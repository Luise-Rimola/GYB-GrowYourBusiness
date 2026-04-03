"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { workflowSteps, MANUAL_STEP_KEYS } from "@/lib/workflowSteps";

const RETRY_DELAY_SEC = 180; // 3 Minuten
const MAX_429_RETRIES = 2;

type RunAllButtonProps = {
  selectedWorkflowKeys: string[];
  allWorkflowKeys: string[];
  labels?: {
    runProcess: string;
    running: string;
  };
};

type StepItem = {
  wf: string;
  step: string;
  runId: string;
  stepKey: string;
  status: "pending" | "running" | "done" | "error";
  errorMessage?: string;
};

type RetryState = {
  stepIndex: number;
  step: StepItem;
  items: StepItem[];
  mode: "selected" | "all";
  countdown: number;
  retryCount: number;
};

export function RunAllButton({ selectedWorkflowKeys, allWorkflowKeys, labels }: RunAllButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<StepItem[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [retryState, setRetryState] = useState<RetryState | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    }
    if (showPopup) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopup]);

  useEffect(() => {
    if (!retryState || retryState.countdown <= 0) return;
    countdownRef.current = setInterval(() => {
      setRetryState((prev) => {
        if (!prev || prev.countdown <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return prev;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [retryState?.stepIndex]);

  useEffect(() => {
    if (!retryState || retryState.countdown !== 0) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    handleRetryNow();
  }, [retryState?.countdown]);

  async function handleRetryNow() {
    if (!retryState) return;
    setRetryState(null);
    abortRef.current = false;
    setLoading(true);
    await executeStepAndContinue(retryState.stepIndex, retryState.items, retryState.mode, retryState.retryCount + 1);
  }

  function handleRetryAbort() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setRetryState(null);
    setLoading(false);
  }

  function handleAbortRun() {
    abortRef.current = true;
  }

  async function runSteps(mode: "selected" | "all") {
    const workflowKeys = mode === "all" ? allWorkflowKeys : selectedWorkflowKeys;
    if (workflowKeys.length === 0) return;
    setShowPopup(false);
    setRetryState(null);
    abortRef.current = false;
    setLoading(true);

    const items: StepItem[] = [];
    if (mode === "selected" || mode === "all") {
      for (const wf of workflowKeys) {
        const steps = workflowSteps[wf] ?? [];
        for (const s of steps) {
          if (!MANUAL_STEP_KEYS.has(s.stepKey)) {
            items.push({ wf, step: s.label, runId: "", stepKey: s.stepKey, status: "pending" });
          }
        }
      }
      const runIdsByWf: Record<string, string> = {};
      for (const wf of workflowKeys) {
        const res = await fetch("/api/runs/ensure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowKey: wf }),
        });
        const data = await res.json();
        if (!res.ok || !data.runId) {
          setLoading(false);
          alert(data.error ?? "KI-Prozess konnte nicht erstellt werden");
          return;
        }
        runIdsByWf[wf] = data.runId;
      }
      let i = 0;
      for (const wf of workflowKeys) {
        for (const s of (workflowSteps[wf] ?? []).filter((x) => !MANUAL_STEP_KEYS.has(x.stepKey))) {
          items[i] = { ...items[i], runId: runIdsByWf[wf] };
          i++;
        }
      }
    }

    setProgress(items);
    await executeStepAndContinue(0, items, mode);
  }

  async function executeStepAndContinue(
    startIdx: number,
    items: StepItem[],
    mode: "selected" | "all",
    retryCount = 0
  ): Promise<void> {
    for (let idx = startIdx; idx < items.length; idx++) {
      if (abortRef.current) {
        setLoading(false);
        return;
      }
      const it = items[idx];
      if (!it.runId) continue;
      setProgress((prev) => prev.map((p, j) => (j === idx ? { ...p, status: "running" as const } : p)));
      try {
        const execRes = await fetch("/api/run-step/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: it.runId, stepKey: it.stepKey }),
        });
        const execData = await execRes.json();
        if (!execRes.ok) {
          const errMsg = execData.error ?? "Fehler";
          const is429 = execRes.status === 429;
          if (is429 && retryCount < MAX_429_RETRIES) {
            setProgress((prev) =>
              prev.map((p, j) => (j === idx ? { ...p, status: "error" as const, errorMessage: errMsg } : p))
            );
            setRetryState({
              stepIndex: idx,
              step: it,
              items,
              mode,
              countdown: RETRY_DELAY_SEC,
              retryCount,
            });
            setLoading(false);
            return;
          }
          setProgress((prev) =>
            prev.map((p, j) => (j === idx ? { ...p, status: "error" as const, errorMessage: errMsg } : p))
          );
          alert(`${it.wf} / ${it.step}: ${errMsg}`);
          setLoading(false);
          return;
        }
        setProgress((prev) => prev.map((p, j) => (j === idx ? { ...p, status: "done" as const } : p)));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Fehler";
        setProgress((prev) =>
          prev.map((p, j) => (j === idx ? { ...p, status: "error" as const, errorMessage: errMsg } : p))
        );
        alert(`${it.wf} / ${it.step}: ${errMsg}`);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.refresh();
  }

  const doneCount = progress.filter((p) => p.status === "done").length;
  const totalCount = progress.length;
  const barPercent = totalCount ? (doneCount / totalCount) * 100 : 0;

  return (
    <div className="relative space-y-2" ref={popupRef}>
      <button
        type="button"
        onClick={() => setShowPopup((v) => !v)}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 dark:hover:bg-blue-500"
      >
        {loading ? (labels?.running ?? "Läuft…") : (labels?.runProcess ?? "Ausführen des KI-Prozesses")}
      </button>
      {showPopup && !loading && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-2 shadow-lg">
          <button
            type="button"
            onClick={() => runSteps("selected")}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-[var(--background)]"
          >
            Individuelle Prozesse
          </button>
          <button
            type="button"
            onClick={() => runSteps("all")}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-[var(--background)]"
          >
            Alle KI-Prozesse
          </button>
          <button
            type="button"
            onClick={() => {
              setShowPopup(false);
              router.push("/assistant/workflows");
            }}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-[var(--background)]"
          >
            Manueller Assistent
          </button>
        </div>
      )}
      {progress.length > 0 && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (!loading && e.target === e.currentTarget) setProgress([]);
          }}
        >
          <div
            className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-base font-semibold text-[var(--foreground)]">KI-Prozess-Fortschritt</h3>
              <div className="flex items-center gap-2">
                {loading ? (
                  <button
                    type="button"
                    onClick={handleAbortRun}
                    className="rounded-lg border border-rose-500 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Abbrechen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setProgress([])}
                    className="rounded-lg p-1.5 text-[var(--muted)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                    aria-label="Schließen"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-[var(--muted)]">
                  <span>Fortschritt</span>
                  <span>{doneCount}/{totalCount} Schritte</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all duration-300"
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-[var(--card-border)] bg-[var(--background)] p-2 text-xs">
                {progress.map((p, i) => (
                  <div key={i} className="py-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 ${
                          p.status === "done"
                            ? "text-teal-600"
                            : p.status === "error"
                              ? "text-rose-600"
                              : p.status === "running"
                                ? "text-amber-600 animate-pulse"
                                : "text-[var(--muted)]"
                        }`}
                      >
                        {p.status === "done" ? "✓" : p.status === "error" ? "✗" : p.status === "running" ? "…" : "○"}
                      </span>
                      <span className="truncate">
                        {p.wf} / {p.step}
                      </span>
                    </div>
                    {p.status === "error" && p.errorMessage && (
                      <p className="ml-5 mt-0.5 break-words text-rose-600 text-[11px]">{p.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
              {!loading && doneCount === totalCount && totalCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    router.refresh();
                    setProgress([]);
                  }}
                  className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  Fertig
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {retryState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              LLM-Server überlastet (429)
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Der Schritt <strong>{retryState.step.wf} / {retryState.step.step}</strong> ist fehlgeschlagen.
              Der Server ist vorübergehend überlastet.
            </p>
            <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
              Automatischer Retry in {Math.floor(retryState.countdown / 60)}:{String(retryState.countdown % 60).padStart(2, "0")} Minuten
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => handleRetryNow()}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Jetzt erneut versuchen
              </button>
              <button
                type="button"
                onClick={handleRetryAbort}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--background)]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
