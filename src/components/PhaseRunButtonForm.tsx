"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";
import { fetchApi } from "@/lib/apiClient";

type PhaseRunButtonFormProps = {
  formId: string;
  phaseId: string;
  buttonLabel: string;
  workflows: { key: string; name: string }[];
};

/**
 * Modus für das Phasen-"Ausführen":
 * - continue: überspringt bereits komplett fertige Workflows und innerhalb offener Workflows nur noch die
 *   nicht schema-validierten Schritte.
 * - run_all: führt jeden Auto-Schritt aller ausgewählten Workflows neu aus und überschreibt auch bereits
 *   verifizierte Ergebnisse.
 */
type PhaseRunMode = "continue" | "run_all";

type PhaseRunJobDto = {
  id: string;
  phaseId: string;
  mode: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  totalSteps: number;
  completedSteps: number;
  currentWorkflowKey: string | null;
  currentStepKey: string | null;
  currentLabel: string | null;
  lastMessage: string | null;
  errorMessage: string | null;
  cancelRequested: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

const POLL_INTERVAL_MS = 2500;

export function PhaseRunButtonForm({ formId, phaseId, buttonLabel, workflows }: PhaseRunButtonFormProps) {
  const router = useRouter();
  const [, startRefreshTransition] = useTransition();
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  const tDash = getTranslations(locale).dashboard;
  const isEmbed = searchParams.get("embed") === "1";
  const isDe = locale === "de";
  const [message, setMessage] = useState<{ tone: "ok" | "warn" | "error"; text: string } | null>(null);

  // Stabiler localStorage-Key pro Phase/Company für bereits quittierte Fehler.
  // Dadurch taucht ein stehengebliebener `PhaseRunJob.errorMessage` nach einem
  // Reload nicht immer wieder auf, sobald der Nutzer ihn einmal geschlossen hat.
  const ackStorageKey = `phaseRunAckedJobId:${phaseId}`;
  const hasAckedJob = useCallback(
    (jobId: string | null | undefined): boolean => {
      if (!jobId || typeof window === "undefined") return false;
      try {
        return window.localStorage.getItem(ackStorageKey) === jobId;
      } catch {
        return false;
      }
    },
    [ackStorageKey],
  );
  const rememberAckedJob = useCallback(
    (jobId: string | null | undefined) => {
      if (!jobId || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(ackStorageKey, jobId);
      } catch {
        /* localStorage kann in Private Browsing blockiert sein — irrelevant */
      }
    },
    [ackStorageKey],
  );
  const [openManualModal, setOpenManualModal] = useState(false);
  const [job, setJob] = useState<PhaseRunJobDto | null>(null);
  const [starting, setStarting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const lastCompletedJobId = useRef<string | null>(null);
  // Jobs, die der Nutzer in DIESEM Tab bewusst gestartet hat. Nur für diese
  // zeigen wir automatisch die Completion/Error-Meldung an — verhindert, dass
  // alte `PhaseRunJob.errorMessage`-Einträge aus der Vergangenheit bei jedem
  // Reload als rote Toast-Meldung „kleben bleiben".
  const startedInThisTab = useRef<Set<string>>(new Set());

  const runModeContinueLabel = isDe ? "Mit offenen Schritten fortfahren" : "Continue with open steps";
  const runAllLabelShort = isDe ? "Alles ausführen" : "Run everything";

  const isActiveJob = job?.status === "queued" || job?.status === "running";
  const loading = starting || isActiveJob;

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const refreshRouterSoft = useCallback(() => {
    startRefreshTransition(() => {
      void router.refresh();
    });
  }, [router, startRefreshTransition]);

  // Initialer Status-Fetch (überlebt Reload/Navigation).
  const fetchStatus = useCallback(async (): Promise<PhaseRunJobDto | null> => {
    try {
      const res = await fetchApi(`/api/phase-runs/status?phaseId=${encodeURIComponent(phaseId)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { job: PhaseRunJobDto | null };
      return data.job;
    } catch {
      return null;
    }
  }, [phaseId]);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      const j = await fetchStatus();
      if (!disposed) setJob(j);
    })();
    return () => {
      disposed = true;
    };
  }, [fetchStatus]);

  // Polling, solange ein Job aktiv ist.
  useEffect(() => {
    if (!isActiveJob) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      const next = await fetchStatus();
      if (disposed) return;
      setJob(next);
      if (next && (next.status === "queued" || next.status === "running")) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    }
    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [isActiveJob, fetchStatus]);

  // Nach Abschluss einmalig das Dashboard refreshen, damit neue RunSteps sichtbar werden.
  useEffect(() => {
    if (!job) return;
    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      if (lastCompletedJobId.current === job.id) return;
      lastCompletedJobId.current = job.id;

      // „Akut" bedeutet: der Job wurde entweder in diesem Tab gestartet
      // ODER er ist gerade eben (< 60 s) zu Ende gegangen. Nur dann sehen
      // wir die Completion/Error-Meldung automatisch. Ältere, bereits in
      // der DB liegende `PhaseRunJob.errorMessage`-Einträge werden still
      // ignoriert, damit sie nicht bei jedem Reload erneut rot aufploppen.
      const startedHere = startedInThisTab.current.has(job.id);
      const finishedAtMs = job.finishedAt ? Date.parse(job.finishedAt) : NaN;
      const freshlyFinished =
        Number.isFinite(finishedAtMs) && Date.now() - finishedAtMs < 60_000;
      const alreadyAcked = hasAckedJob(job.id);
      const shouldAnnounce = (startedHere || freshlyFinished) && !alreadyAcked;
      if (!shouldAnnounce) {
        // Für nicht-akute Jobs trotzdem als gesehen markieren, damit sie
        // nie mehr auftauchen — auch wenn der Nutzer sie nie aktiv quittiert.
        rememberAckedJob(job.id);
        refreshRouterSoft();
        return;
      }
      if (job.status === "completed") {
        setMessage({
          tone: "ok",
          text: isDe ? "KI-Analyse abgeschlossen." : "AI analysis completed.",
        });
      } else if (job.status === "cancelled") {
        setMessage({
          tone: "warn",
          text: isDe ? "Lauf abgebrochen." : "Run cancelled.",
        });
      } else if (job.errorMessage) {
        setMessage({ tone: "error", text: job.errorMessage });
      }
      refreshRouterSoft();
    }
  }, [job, isDe, refreshRouterSoft, hasAckedJob, rememberAckedJob]);

  function collectSelectedWorkflowKeys(): string[] {
    const byFormAttr = Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[form="${formId}"][name="workflow_keys"]:checked`)
    )
      .map((input) => input.value)
      .filter(Boolean);

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

    return [...new Set([...byFormAttr, ...byOwningForm])];
  }

  async function runAutomatically(mode: PhaseRunMode) {
    if (loading) return;
    setStarting(true);
    setMessage(null);
    setMenuOpen(false);
    lastCompletedJobId.current = null;

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
    if (workflowKeys.length === 0 && !hasFormAttrControls && !hasOwningFormControls && workflows.length > 0) {
      workflowKeys = workflows.map((w) => w.key);
    }

    if (workflowKeys.length === 0) {
      setMessage({ tone: "warn", text: tDash.phaseRunsNoneSelected });
      setStarting(false);
      return;
    }

    try {
      const res = await fetchApi("/api/phase-runs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId, workflowKeys, mode }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        jobId?: string | null;
        totalSteps?: number;
        alreadyRunning?: boolean;
        empty?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? `HTTP ${res.status}` });
        setStarting(false);
        return;
      }

      if (data.empty) {
        setMessage({
          tone: "warn",
          text:
            mode === "continue"
              ? isDe
                ? "Keine offenen Schritte in dieser Phase."
                : "No open steps in this phase."
              : tDash.phaseRunsAllAlreadyActive,
        });
        // Wichtig: Wenn der Server "empty" meldet, ist der UI-Status häufig
        // veraltet (z. B. noch "Offen"/"Starten" aus vorherigem Render).
        // Soft-Refresh synchronisiert die Workflow-Karten sofort mit dem
        // tatsächlichen Stand.
        refreshRouterSoft();
        setStarting(false);
        return;
      }

      setMessage({
        tone: "ok",
        text:
          mode === "continue"
            ? isDe
              ? `KI-Analyse gestartet: ${data.totalSteps ?? "?"} Schritt${data.totalSteps === 1 ? "" : "e"}.`
              : `AI analysis started: ${data.totalSteps ?? "?"} step${data.totalSteps === 1 ? "" : "s"}.`
            : isDe
              ? `KI-Analyse (alles neu): ${data.totalSteps ?? "?"} Schritt${data.totalSteps === 1 ? "" : "e"}.`
              : `AI analysis (rerun all): ${data.totalSteps ?? "?"} step${data.totalSteps === 1 ? "" : "s"}.`,
      });

      if (data.jobId) startedInThisTab.current.add(data.jobId);
      const fresh = await fetchStatus();
      if (fresh?.id) startedInThisTab.current.add(fresh.id);
      setJob(fresh);
    } catch (e) {
      setMessage({
        tone: "error",
        text:
          e instanceof Error
            ? e.message
            : isDe
              ? "KI-Analyse konnte nicht gestartet werden."
              : "Failed to start AI analysis.",
      });
    } finally {
      setStarting(false);
    }
  }

  async function cancelJob() {
    if (!job) return;
    try {
      await fetchApi("/api/phase-runs/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const fresh = await fetchStatus();
      setJob(fresh);
    } catch {
      /* ignore — Nutzer kann nochmal klicken */
    }
  }

  const progressLabel = (() => {
    if (!job) return null;
    if (job.status === "queued") {
      return isDe ? "Wird eingeplant …" : "Queued …";
    }
    if (job.status === "running") {
      // Nur den menschenlesbaren Label-Teil zeigen, nicht den technischen WF_*-Key.
      const stepInfo = job.currentLabel ? ` — ${job.currentLabel}` : "";
      return `${isDe ? "Schritt" : "Step"} ${Math.max(job.completedSteps, 1)}/${job.totalSteps}${stepInfo}`;
    }
    return null;
  })();

  const progressPercent = (() => {
    if (!job) return 0;
    if (job.status === "completed") return 100;
    if (!job.totalSteps || job.totalSteps <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((job.completedSteps / job.totalSteps) * 100)));
  })();

  const buttonText = (() => {
    if (starting) return isDe ? "Starte …" : "Starting …";
    if (isActiveJob) {
      if (job?.cancelRequested) return isDe ? "Breche ab …" : "Cancelling …";
      return isDe ? `Läuft ${job?.completedSteps ?? 0}/${job?.totalSteps ?? 0}` : `Running ${job?.completedSteps ?? 0}/${job?.totalSteps ?? 0}`;
    }
    return buttonLabel;
  })();

  return (
    <div className="relative flex flex-col items-end gap-1">
      <div ref={menuRef} className="relative inline-flex items-stretch">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            if (loading) return;
            void runAutomatically("continue");
          }}
          className="rounded-l-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          title={isDe
            ? "Nur fehlende / noch nicht validierte Schritte ausführen"
            : "Run only missing / not-yet-validated steps"}
        >
          {buttonText}
        </button>
        <button
          type="button"
          disabled={loading}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={isDe ? "Ausführ-Optionen" : "Run options"}
          onClick={() => {
            if (loading) return;
            setMenuOpen((v) => !v);
          }}
          className="rounded-r-lg border-l border-teal-700/40 bg-teal-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          <span aria-hidden className="inline-block translate-y-[-1px]">▾</span>
        </button>
        {menuOpen && !loading ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => void runAutomatically("continue")}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              <span className="block">{runModeContinueLabel}</span>
              <span className="block text-[10px] text-[var(--muted)]">
                {isDe
                  ? "Bereits validierte Schritte werden übersprungen."
                  : "Already validated steps are skipped."}
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void runAutomatically("run_all")}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              <span className="block">{runAllLabelShort}</span>
              <span className="block text-[10px] text-[var(--muted)]">
                {isDe
                  ? "Überschreibt auch bereits verifizierte Ergebnisse."
                  : "Overwrites already verified results."}
              </span>
            </button>
            {!isEmbed ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setOpenManualModal(true);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                <span className="block">{isDe ? "Manueller Assistent" : "Manual assistant"}</span>
                <span className="block text-[10px] text-[var(--muted)]">
                  {isDe
                    ? "Phase manuell im Assistenten durchführen."
                    : "Run this phase manually in the assistant."}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {progressLabel ? (
        <div className="w-full max-w-[min(28rem,85vw)]">
          <div className="flex items-center justify-end gap-2">
            <p className="text-[11px] text-[var(--muted)]">
              {progressLabel} ({progressPercent}%)
            </p>
            {isActiveJob && !job?.cancelRequested ? (
              <button
                type="button"
                onClick={() => void cancelJob()}
                className="text-[11px] font-medium text-rose-600 underline-offset-2 hover:underline"
              >
                {isDe ? "Abbrechen" : "Cancel"}
              </button>
            ) : null}
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/70">
            <div
              className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}
      {message ? (
        <div
          className={`flex max-w-[min(28rem,85vw)] items-start justify-end gap-2 text-right text-[11px] ${
            message.tone === "ok"
              ? "text-emerald-700"
              : message.tone === "warn"
                ? "text-amber-800 dark:text-amber-200"
                : "text-rose-700"
          }`}
        >
          <p className="min-w-0 flex-1">{message.text}</p>
          <button
            type="button"
            aria-label={isDe ? "Meldung schließen" : "Dismiss"}
            title={isDe ? "Meldung schließen" : "Dismiss"}
            onClick={() => {
              setMessage(null);
              rememberAckedJob(job?.id);
            }}
            className="shrink-0 rounded px-1 text-[13px] leading-none opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
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
