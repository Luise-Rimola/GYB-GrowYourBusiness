"use client";

import { useRouter } from "next/navigation";

export function RunCompletionAdvanceButton({
  embed,
  runId,
  phaseId,
}: {
  embed: boolean;
  runId: string;
  /** Phase-Id des Runs – ermöglicht im Assistenten eine saubere Rückkehr zur Phasenübersicht statt eines Assistenten-Reloads. */
  phaseId?: string | null;
}) {
  const router = useRouter();

  const isEmbeddedRuntime =
    typeof window !== "undefined" && window.self !== window.top;

  const phaseOverviewHref = phaseId
    ? `/dashboard?view=overview&phase=${encodeURIComponent(phaseId)}#phase-${encodeURIComponent(phaseId)}`
    : "/dashboard";
  const assistantWorkflowHref = phaseId
    ? `/assistant/workflows?phase=${encodeURIComponent(phaseId)}`
    : "/assistant/workflows";
  const assistantHomeHref = "/assistant";

  const buttonLabel = "Zurück zur Übersicht →";

  const handleDashboardClick = () => {
    if (typeof window === "undefined") return;
    let targetHref = phaseOverviewHref;
    // If the run is opened inside the workflow assistant, return there.
    if (isEmbeddedRuntime) {
      try {
        const topPath = window.top?.location?.pathname ?? "";
        if (topPath.startsWith("/assistant/workflows")) {
          targetHref = assistantWorkflowHref;
        } else if (topPath.startsWith("/assistant")) {
          targetHref = assistantHomeHref;
        }
      } catch {
        /* ignore and keep default phase target */
      }
    }

    // Im Assistenten-Iframe: Top-Window direkt zur Phasen-/Dashboard-Seite navigieren.
    // Vermeidet assistant-reload, das sonst den Iframe-src auf /runs/{id} (ohne step)
    // umstellt und sich anfühlt, als würde man aus dem Wizard herausgeworfen.
    if (isEmbeddedRuntime) {
      try {
        if (window.top) {
          window.top.location.href = targetHref;
          return;
        }
      } catch {
        /* cross-origin guard – fall through to postMessage */
      }
      window.parent.postMessage(
        { type: "assistant-exit-to-phase", phaseId: phaseId ?? null, target: targetHref },
        "*"
      );
      return;
    }

    router.push(targetHref);
  };

  const handleNextClick = () => {
    if (typeof window === "undefined") return;

    if (isEmbeddedRuntime) {
      window.parent.postMessage(
        { type: "assistant-run-process-complete", runId },
        "*"
      );
      return;
    }

    router.push("/assistant");
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDashboardClick}
        className="rounded-xl border border-[var(--card-border)] bg-slate-100 px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        {buttonLabel}
      </button>

{/*{isEmbeddedRuntime && (
        <button
          type="button"
          onClick={handleNextClick}
          className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          Weiter →
        </button>
      )}*/}
    </div>
  );
}
