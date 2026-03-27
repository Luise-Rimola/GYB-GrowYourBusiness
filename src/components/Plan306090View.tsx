"use client";

const PHASE_LABELS: Record<string, { en: string; de: string }> = {
  days_0_30: { en: "Days 0–30", de: "Tage 0–30" },
  days_31_60: { en: "Days 31–60", de: "Tage 31–60" },
  days_61_90: { en: "Days 61–90", de: "Tage 61–90" },
};

function getPhaseLabel(key: string, locale: string): string {
  const entry = PHASE_LABELS[key];
  if (entry) return locale === "de" ? entry.de : entry.en;
  return key.replace(/_/g, " ");
}

type TaskLike = Record<string, unknown> | string;

function parseTask(item: TaskLike): { task?: string; owner?: string; deliverable?: string; deadline?: string } {
  if (typeof item === "string") return { task: item };
  const o = item as Record<string, unknown>;
  return {
    task: String(o.task ?? o.name ?? o.title ?? ""),
    owner: o.owner != null ? String(o.owner) : undefined,
    deliverable: o.deliverable != null ? String(o.deliverable) : undefined,
    deadline: o.deadline != null ? String(o.deadline) : undefined,
  };
}

function renderTask(item: TaskLike, locale: string) {
  const { task, owner, deliverable, deadline } = parseTask(item);
  const t = locale === "de"
    ? { owner: "Verantwortlich", deliverable: "Ergebnis", deadline: "Frist" }
    : { owner: "Owner", deliverable: "Deliverable", deadline: "Deadline" };

  if (!task && !owner && !deliverable && !deadline) {
    return typeof item === "object" ? JSON.stringify(item) : String(item);
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm">
      {task && <p className="font-medium text-[var(--foreground)]">{task}</p>}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        {owner && <span><span className="font-medium">{t.owner}:</span> {owner}</span>}
        {deliverable && <span><span className="font-medium">{t.deliverable}:</span> {deliverable}</span>}
        {deadline && <span><span className="font-medium">{t.deadline}:</span> {deadline}</span>}
      </div>
    </div>
  );
}

export function Plan306090View({ plan, locale = "en" }: { plan: Record<string, unknown>; locale?: "en" | "de" }) {
  const entries = Object.entries(plan);

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {entries.map(([key, val]) => {
        const phaseLabel = getPhaseLabel(key, locale);
        const items = Array.isArray(val) ? val : (val && typeof val === "object" && "items" in val)
          ? (val as { items: unknown[] }).items
          : [val];

        return (
          <div key={key} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
            <h4 className="mb-4 text-base font-semibold text-[var(--foreground)]">
              {phaseLabel}
            </h4>
            <div className="flex flex-col gap-3">
              {items.map((item, i) => (
                <div key={i}>
                  {typeof item === "object" && item !== null && ("task" in item || "owner" in item || "deliverable" in item || "name" in item)
                    ? renderTask(item as TaskLike, locale)
                    : typeof item === "object"
                      ? <pre className="overflow-x-auto rounded-lg border border-[var(--card-border)] bg-slate-50 p-3 text-xs dark:bg-slate-900/30">{JSON.stringify(item, null, 2)}</pre>
                      : <p className="text-sm text-[var(--muted)]">{String(item)}</p>
                  }
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
