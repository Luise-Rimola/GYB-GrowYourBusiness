"use client";

import Link from "next/link";

export function RunCompletionAdvanceButton({
  embed,
  runId,
}: {
  embed: boolean;
  runId: string;
}) {
  if (!embed) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          prefetch={false}
          className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] dark:bg-[var(--card)]"
        >
          Zum Dashboard
        </Link>
        <Link
          href="/assistant/workflows"
          prefetch={false}
          className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          Weiter →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dashboard"
        prefetch={false}
        className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] dark:bg-[var(--card)]"
      >
        Zum Dashboard
      </Link>
      <button
        type="button"
        onClick={() => {
          if (typeof window === "undefined") return;
          try {
            window.parent.postMessage(
              { type: "assistant-run-process-complete", runId },
              window.location.origin,
            );
          } catch {
            // ignore
          }
        }}
        className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
      >
        Weiter →
      </button>
    </div>
  );
}
