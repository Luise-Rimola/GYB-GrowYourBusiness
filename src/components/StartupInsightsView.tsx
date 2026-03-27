"use client";

import { useState } from "react";
import { fundingModels, incorporationModels, termProjects } from "@/lib/startupInsights";

export function StartupInsightsView() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          {fundingModels.title}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {fundingModels.categories.map((cat) => (
            <div
              key={cat.name}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
            >
              <div className="mb-3 rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                {cat.name}
              </div>
              <ul className="space-y-1 text-sm text-[var(--foreground)]">
                {cat.methods.map((m) => (
                  <li key={m}>• {m}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--muted)]">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          {incorporationModels.title}
        </h3>
        <div className="space-y-4">
          {incorporationModels.categories.map((cat) => (
            <div
              key={cat.name}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
            >
              <div className="mb-3 rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
                {cat.name}
              </div>
              {"options" in cat && cat.options ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(cat.options).map(([label, items]) => (
                    <div key={label}>
                      <span className="font-medium text-[var(--foreground)]">{label}:</span>{" "}
                      {Array.isArray(items) ? items.join(", ") : String(items ?? "")}
                    </div>
                  ))}
                  {cat.additional && (
                    <div className="mt-2 rounded border border-teal-200 px-2 py-1 text-xs dark:border-teal-800">
                      {cat.additional.join(", ")}
                    </div>
                  )}
                </div>
              ) : (
                <ul className="space-y-1 text-sm text-[var(--foreground)]">
                  {cat.jurisdictions.map((j) => (
                    <li key={j}>• {j}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-[var(--muted)]">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
          {termProjects.title}
        </h3>
        <p className="mb-4 text-sm text-[var(--muted)]">{termProjects.description}</p>
        <div className="space-y-6">
          {termProjects.tracks.map((track) => (
            <TermProjectCard key={track.name} track={track} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TermProjectCard({
  track,
}: {
  track: { name: string; description: string; targets: string[]; courses_workshops: string[] };
}) {
  const [expanded, setExpanded] = useState(false);
  const INITIAL_SHOW = 5;
  const items = track.courses_workshops;
  const visible = expanded ? items : items.slice(0, INITIAL_SHOW);
  const hasMore = items.length > INITIAL_SHOW;

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="mb-3 rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-semibold text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
        {track.name}
      </div>
      <p className="mb-2 text-sm text-[var(--foreground)]">{track.description}</p>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Targets: {track.targets.join(", ")}
      </p>
      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Courses & Workshops</p>
      <ul className="space-y-1 text-sm text-[var(--foreground)]">
        {visible.map((topic) => (
          <li key={topic} className="flex gap-2">
            <span className="text-teal-600 dark:text-teal-400">•</span>
            {topic}
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950/50"
        >
          {expanded ? "— VIEW LESS" : "VIEW MORE"}
        </button>
      )}
    </div>
  );
}
