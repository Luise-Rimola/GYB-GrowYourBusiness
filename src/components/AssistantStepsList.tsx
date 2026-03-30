"use client";

import Link from "next/link";
import { useMemo } from "react";

const ASSISTANT_DONE_HREFS_KEY = "gyb-assistant-done-hrefs-v1";

type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
};

function readPersistedDoneHrefs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(ASSISTANT_DONE_HREFS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function AssistantStepsList({ steps }: { steps: AssistantStep[] }) {
  const persistedDone = useMemo(() => readPersistedDoneHrefs(), []);
  const mergedSteps = steps.map((s) => ({
    ...s,
    completed: s.completed || persistedDone.has(s.href),
  }));
  const lastPhaseEndIndex = mergedSteps.reduce((lastIdx, s, idx) => {
    return s.label.toLowerCase().includes("vergleich ohne und mit") ? idx : lastIdx;
  }, -1);

  return (
    <ul className="space-y-3">
      {mergedSteps.map((item, i) => {
        const label = item.label.toLowerCase();
        const startsPhase = label.startsWith("info:") || label.startsWith("info ");
        const displayLabel = startsPhase ? item.label.replace(/^info:\s*/i, "").trim() : item.label;
        const stepNumber = mergedSteps.slice(0, i + 1).filter((s) => {
          const sLabel = s.label.toLowerCase();
          return !(sLabel.startsWith("info:") || sLabel.startsWith("info "));
        }).length;
        return (
          <li key={item.href + i}>
            {startsPhase ? <div className="my-2 h-px w-full bg-zinc-300 dark:bg-zinc-700" /> : null}
            <Link
              href={item.href}
              className={
                startsPhase
                  ? "flex items-start rounded-xl px-1 py-1 text-sm font-semibold text-[var(--foreground)]"
                  : item.completed
                    ? "flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/40"
                    : "flex items-start gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-teal-200 hover:bg-teal-50/50 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
              }
            >
              {!startsPhase ? (
                <span
                  className={
                    item.completed
                      ? "flex h-7 min-h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : "flex h-7 min-h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                  }
                >
                  {item.completed ? "✓" : stepNumber}
                </span>
              ) : null}
              {startsPhase ? (
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3 leading-snug">
                  <span className="min-w-0 break-words">{displayLabel}</span>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[11px] font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    i
                  </span>
                </span>
              ) : (
                <span className="min-w-0 flex-1 break-words leading-snug">{displayLabel}</span>
              )}
            </Link>
            {i === lastPhaseEndIndex ? <div className="my-2 h-px w-full bg-zinc-300 dark:bg-zinc-700" /> : null}
          </li>
        );
      })}
    </ul>
  );
}
