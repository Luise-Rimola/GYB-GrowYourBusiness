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

  const handleDashboardClick = () => {
    if (typeof window === "undefined") return;

    // ✅ CASE: iframe
    if (embed) {
      window.parent.postMessage(
        { type: "assistant-reload" },
        "*"
      );
      return;
    }

    // ✅ CASE: normale Seite
    window.location.href = "/dashboard";
  };

  const handleNextClick = () => {
    if (typeof window === "undefined") return;

    if (embed) {
      window.parent.postMessage(
        { type: "assistant-run-process-complete", runId },
        "*"
      );
    } else {
      router.push("/assistant"); // oder wohin du willst
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDashboardClick}
        className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-xs font-semibold"
      >
        Zum Dashboard →
      </button>

      {/*<button
        type="button"
        onClick={handleNextClick}
        className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white"
      >
        Weiter →
      </button>*/}
    </div>
  );
}