"use client";

import Link from "next/link";
import { RunAllButton } from "@/components/RunAllButton";

const WF_APP_DEVELOPMENT = "WF_APP_DEVELOPMENT";

type RunAllQuickActionsProps = {
  workflowKeys: string[];
  optionalWorkflowKeys?: string[];
  defaultSelectedOptionalWorkflowKeys?: string[];
  artifactsHref: string;
  artifactsLabel: string;
  showArtifactsButton?: boolean;
  labels?: {
    runProcess: string;
    running: string;
  };
};

export function RunAllQuickActions({
  workflowKeys,
  optionalWorkflowKeys = [],
  defaultSelectedOptionalWorkflowKeys = [],
  artifactsHref,
  artifactsLabel,
  showArtifactsButton = true,
  labels,
}: RunAllQuickActionsProps) {
  const normalizedOptionalWorkflowKeys = optionalWorkflowKeys.filter((k) => k !== WF_APP_DEVELOPMENT);

  const selectedOptional = defaultSelectedOptionalWorkflowKeys.filter((k) =>
    normalizedOptionalWorkflowKeys.includes(k),
  );
  const effectiveKeys = dedupe([...workflowKeys, ...selectedOptional]);
  const allKeys = dedupe([...workflowKeys, ...normalizedOptionalWorkflowKeys]);

  return (
    <div className="flex flex-nowrap items-center gap-4">
      <RunAllButton selectedWorkflowKeys={effectiveKeys} allWorkflowKeys={allKeys} labels={labels} />

      {showArtifactsButton && (
        <Link
          href={artifactsHref}
          className="rounded-xl border border-teal-600 px-5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/50"
        >
          {artifactsLabel}
        </Link>
      )}
    </div>
  );
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
