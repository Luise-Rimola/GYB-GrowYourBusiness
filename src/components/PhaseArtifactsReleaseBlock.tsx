"use client";

import { useEffect, useRef, useState } from "react";
import { setPlanningPhaseArtifactsReleasedAction } from "@/app/actions";

export type PhaseReleaseLabels = {
  sectionTitle: string;
  releaseBtn: string;
  revokeBtn: string;
  confirmReleaseTitle: string;
  confirmReleaseBody: string;
  confirmRevokeTitle: string;
  confirmRevokeBody: string;
  confirmRelease: string;
  confirmRevoke: string;
  cancel: string;
};

type PhaseArtifactsReleaseBlockProps = {
  phaseId: string;
  phaseName: string;
  released: boolean;
  labels: PhaseReleaseLabels;
  children: React.ReactNode;
};

export function PhaseArtifactsReleaseBlock({
  phaseId,
  phaseName,
  released: releasedInitial,
  labels,
  children,
}: PhaseArtifactsReleaseBlockProps) {
  const [modal, setModal] = useState<"release" | "revoke" | null>(null);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const released = releasedInitial;
  const shellClass = released
    ? "border-emerald-400/90 bg-emerald-50/40 dark:border-emerald-600 dark:bg-emerald-950/25"
    : "border-[var(--card-border)] bg-[var(--background)]/40";

  return (
    <>
      <details className={`group mt-4 rounded-xl border p-3 ${shellClass}`}>
        <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden>📄</span>
            {labels.sectionTitle}
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">{children}</div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--card-border)] pt-3">
          {!released ? (
            <button
              type="button"
              onClick={() => setModal("release")}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
            >
              {labels.releaseBtn}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModal("revoke")}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--background)]"
            >
              {labels.revokeBtn}
            </button>
          )}
          {released && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              ✓ {phaseName}
            </span>
          )}
        </div>
      </details>

      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={() => setModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="phase-release-dialog-title"
            className="max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="phase-release-dialog-title" className="text-lg font-semibold text-[var(--foreground)]">
              {modal === "release" ? labels.confirmReleaseTitle : labels.confirmRevokeTitle}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {modal === "release" ? labels.confirmReleaseBody : labels.confirmRevokeBody}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--background)]"
              >
                {labels.cancel}
              </button>
              <form action={setPlanningPhaseArtifactsReleasedAction}>
                <input type="hidden" name="phase_id" value={phaseId} />
                <input type="hidden" name="release" value={modal === "release" ? "1" : "0"} />
                <button
                  type="submit"
                  className={
                    modal === "release"
                      ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      : "rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                  }
                >
                  {modal === "release" ? labels.confirmRelease : labels.confirmRevoke}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

