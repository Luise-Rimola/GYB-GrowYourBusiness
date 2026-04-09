"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";



export function RunCompletionAdvanceButton({
  embed,
  runId,
}: {
  embed: boolean;
  runId: string;
}) {
  if (!embed) {
    const router = useRouter();
    return (
      <div className="flex items-center gap-2">
        <button
                type="button"
                onClick={() => {
                  if (typeof window === "undefined") return;
                
                  window.parent.postMessage(
                    { type: "assistant-reload" },
                    window.location.origin
                  );
                }}
                className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] dark:bg-[var(--card)]"
              >
                Zum Dashboard →
              </button>
        {/* <Link
          href="/assistant"
          prefetch={false}
          className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          Weiter →
        </Link> */}
      </div>
    );
  }
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <button
                type="button"
                onClick={() => {
                  if (typeof window === "undefined") return;
                
                  window.parent.postMessage(
                    { type: "assistant-reload" },
                    window.location.origin
                  );
                }}
                className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--background)] dark:bg-[var(--card)]"
              >
                Zum Dashboard →
              </button>
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
