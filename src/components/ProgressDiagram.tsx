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

  const linkClass = (step: ProgressStep) =>
    `block w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium transition md:inline-block md:w-auto md:text-left ${
      step.completed
        ? "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200"
        : step.isNext
          ? "border-2 border-teal-500 bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
          : "border border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400"
    }`;

  return (
    <div className="space-y-6">
      {/* Mobile: eine Spalte, sauber untereinander */}
      <ol className="m-0 flex list-none flex-col gap-1 p-0 md:hidden">
        {steps.map((step, i) => (
          <li key={step.id} className="flex flex-col items-stretch gap-1">
            <Link href={step.url} className={linkClass(step)}>
              {step.completed && (
                <span className="mr-1.5 inline-block text-emerald-600 dark:text-emerald-400">✓</span>
              )}
              {step.label}
            </Link>
            {i < steps.length - 1 && (
              <span className="select-none py-0.5 text-center text-xs text-zinc-400 dark:text-zinc-500" aria-hidden>
                ↓
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* md+: horizontal mit Pfeilen */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <Link href={step.url} className={linkClass(step)}>
              {step.completed && (
                <span className="mr-1.5 inline-block text-emerald-600 dark:text-emerald-400">✓</span>
              )}
              {step.label}
            </Link>
            {i < steps.length - 1 && (
              <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                →
              </span>
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
