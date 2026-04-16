"use client";

import { useRouter } from "next/navigation";

export function RunCompletionAdvanceButton({
  embed,
  runId,
}: {
  embed: boolean;
  runId: string;
}) {
  const router = useRouter();

  const isEmbeddedRuntime =
    typeof window !== "undefined" && window.self !== window.top;

  const handleDashboardClick = () => {
    if (typeof window === "undefined") return;

    // Im Frame: Parent neu laden
    if (isEmbeddedRuntime) {
      window.parent.postMessage({ type: "assistant-reload" }, "*");
      return;
    }

    // Standalone: normale Navigation
    router.push("/dashboard");
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
        Zum Dashboard →
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