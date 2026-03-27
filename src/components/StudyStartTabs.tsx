"use client";

import { useState } from "react";

type TabId = "flow" | "data" | "analysis" | "compare" | "fb1fb5" | "openText";

export default function StudyStartTabs({
  flowContent,
  dataContent,
  analysisContent,
  compareContent,
  fb1Fb5Content,
  openTextCompareContent,
  flowLabel,
  dataLabel,
  analysisLabel,
  compareLabel,
  fb1Fb5Label,
  openTextCompareLabel,
}: {
  flowContent: React.ReactNode;
  dataContent: React.ReactNode;
  analysisContent: React.ReactNode;
  compareContent: React.ReactNode;
  fb1Fb5Content: React.ReactNode;
  openTextCompareContent: React.ReactNode;
  flowLabel: string;
  dataLabel: string;
  analysisLabel: string;
  compareLabel: string;
  fb1Fb5Label: string;
  openTextCompareLabel: string;
}) {
  const [active, setActive] = useState<TabId>("flow");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)]">
        <button
          type="button"
          onClick={() => setActive("flow")}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            active === "flow"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {flowLabel}
        </button>
        <button
          type="button"
          onClick={() => setActive("data")}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            active === "data"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {dataLabel}
        </button>
        <button
          type="button"
          onClick={() => setActive("analysis")}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            active === "analysis"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {analysisLabel}
        </button>
        <button
          type="button"
          onClick={() => setActive("compare")}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            active === "compare"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {compareLabel}
        </button>
        <button
          type="button"
          onClick={() => setActive("fb1fb5")}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            active === "fb1fb5"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {fb1Fb5Label}
        </button>
        <button
          type="button"
          onClick={() => setActive("openText")}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            active === "openText"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "border-b-2 border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {openTextCompareLabel}
        </button>
      </div>

      {active === "flow"
        ? flowContent
        : active === "data"
          ? dataContent
          : active === "analysis"
            ? analysisContent
            : active === "compare"
              ? compareContent
              : active === "fb1fb5"
                ? fb1Fb5Content
                : openTextCompareContent}
    </div>
  );
}

