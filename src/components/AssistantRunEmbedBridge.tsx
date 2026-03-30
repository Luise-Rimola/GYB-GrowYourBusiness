"use client";

import { useEffect } from "react";

/**
 * Im iframe (/runs/…?embed=1): informiert den Workflow-Assistenten,
 * wenn alle konfigurierten Schritte gültig gespeichert sind.
 */
export function AssistantRunEmbedBridge({
  embed,
  runId,
  allComplete,
}: {
  embed: boolean;
  runId: string;
  allComplete: boolean;
}) {
  useEffect(() => {
    if (!embed || !allComplete || typeof window === "undefined") return;
    if (window.parent === window) return;
    window.parent.postMessage(
      { type: "assistant-run-process-complete", runId },
      window.location.origin,
    );
  }, [embed, allComplete, runId]);

  return null;
}
