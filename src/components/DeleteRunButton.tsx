"use client";

import { useTransition } from "react";
import { deleteRunAction } from "@/app/runs/actions";

export function DeleteRunButton({ runId }: { runId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    if (!confirm("Delete this run? Steps, artifacts, and decisions from this run will be removed.")) return;
    startTransition(() => deleteRunAction(runId));
  };

  return (
    <button
      type="button"
      title="Delete run"
      disabled={isPending}
      onClick={handleClick}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </button>
  );
}
