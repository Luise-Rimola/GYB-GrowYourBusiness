"use client";

import Link from "next/link";
import { useState } from "react";
import { RunAllButton } from "@/components/RunAllButton";
import { WORKFLOW_NAMES } from "@/lib/planningFramework";

const WF_APP_DEVELOPMENT = "WF_APP_DEVELOPMENT";

type RunAllQuickActionsProps = {
  workflowKeys: string[];
  optionalWorkflowKeys?: string[];
  defaultSelectedOptionalWorkflowKeys?: string[];
  artifactsHref: string;
  artifactsLabel: string;
};

export function RunAllQuickActions({
  workflowKeys,
  optionalWorkflowKeys = [],
  defaultSelectedOptionalWorkflowKeys = [],
  artifactsHref,
  artifactsLabel,
}: RunAllQuickActionsProps) {
  const normalizedOptionalWorkflowKeys = optionalWorkflowKeys.filter((k) => k !== WF_APP_DEVELOPMENT);

  const [selectedOptionalWorkflowKeys, setSelectedOptionalWorkflowKeys] = useState<string[]>(
    () => defaultSelectedOptionalWorkflowKeys.filter((k) => normalizedOptionalWorkflowKeys.includes(k))
  );

  const selectedOptionalSet = new Set(selectedOptionalWorkflowKeys);

  function toggleOptionalKey(key: string) {
    setSelectedOptionalWorkflowKeys((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return Array.from(s);
    });
  }

  const effectiveKeys = dedupe([...workflowKeys, ...selectedOptionalWorkflowKeys]);

  return (
    <div className="flex flex-nowrap items-center gap-4">
      <RunAllButton workflowKeys={effectiveKeys} />

      <Link
        href={artifactsHref}
        className="rounded-xl border border-teal-600 px-5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
      >
        {artifactsLabel}
      </Link>

      {normalizedOptionalWorkflowKeys.length > 0 && (
        <details className="group relative" open={false}>
          <summary className="cursor-pointer list-none rounded-lg border border-[var(--card-border)] px-5 py-2.5 text-sm font-semibold transition hover:bg-[var(--background)]">
            Optionale Workflows
          </summary>
          <div className="absolute right-0 top-full z-50 mt-1 w-[320px] rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 shadow-lg">
            <div className="max-h-[55vh] space-y-2 overflow-auto">
              {normalizedOptionalWorkflowKeys.map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition hover:bg-[var(--background)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedOptionalSet.has(key)}
                    onChange={() => toggleOptionalKey(key)}
                    className="h-4 w-4 rounded border-[var(--card-border)] text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">{WORKFLOW_NAMES[key] ?? key}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

