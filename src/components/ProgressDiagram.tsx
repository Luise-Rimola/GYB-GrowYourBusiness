"use client";

import Link from "next/link";
import { startWizardAction } from "@/app/actions";
import type { ProgressStep } from "@/lib/progress";

export function ProgressDiagram({
  steps,
  nextUrl,
}: {
  steps: ProgressStep[];
  nextUrl: string;
}) {
  const allComplete = steps.every((s) => s.completed);
  const useWizard = nextUrl === "/dashboard";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <Link
              href={step.url}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                step.completed
                  ? "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200"
                  : step.isNext
                    ? "border-2 border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400"
              }`}
            >
              {step.completed && (
                <span className="mr-1.5 inline-block text-emerald-600 dark:text-emerald-400">✓</span>
              )}
              {step.label}
            </Link>
            {i < steps.length - 1 && (
              <span className="text-zinc-300 dark:text-zinc-600">→</span>
            )}
          </div>
        ))}
      </div>

      {!allComplete &&
        (useWizard ? (
          <form action={startWizardAction}>
            <button
              type="submit"
              className="inline-flex rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              Continue →
            </button>
          </form>
        ) : (
          <Link
            href={nextUrl}
            className="inline-flex rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Continue →
          </Link>
        ))}
    </div>
  );
}
