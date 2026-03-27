"use client";

import Link from "next/link";

type Citations = {
  artifact_ids?: string[];
  kpi_keys?: string[];
  source_ids?: string[];
  knowledge_object_ids?: string[];
};

export function CitationChips({ citations }: { citations: Citations }) {
  const chips: { label: string; href?: string }[] = [];
  (citations.kpi_keys ?? []).forEach((k) => chips.push({ label: `KPI: ${k}` }));
  (citations.artifact_ids ?? []).forEach((id) => chips.push({ label: `Artifact`, href: `/artifacts/${id}` }));
  (citations.source_ids ?? []).forEach((id) => chips.push({ label: `Source`, href: "#" }));
  (citations.knowledge_object_ids ?? []).forEach((id) => chips.push({ label: `KB`, href: `/knowledge/${id}` }));

  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((c, i) =>
        c.href ? (
          <Link
            key={i}
            href={c.href}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {c.label}
          </Link>
        ) : (
          <span
            key={i}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            {c.label}
          </span>
        )
      )}
    </div>
  );
}
