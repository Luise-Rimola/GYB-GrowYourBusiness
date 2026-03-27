import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { Plan306090View } from "@/components/Plan306090View";

export default async function DecisionsPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const [decisions, decisionPackArtifact] = await Promise.all([
    prisma.decision.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.artifact.findFirst({
      where: { companyId: company.id, type: "decision_pack" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const packContent = decisionPackArtifact?.contentJson as { execution_plan_30_60_90?: Record<string, unknown> } | null;
  const plan30_60_90 = packContent?.execution_plan_30_60_90 ?? {};

  const columns: { key: string; label: string }[] = [
    { key: "proposed", label: t.decisions.proposed },
    { key: "approved", label: t.decisions.approved },
    { key: "in_progress", label: t.decisions.inProgress },
    { key: "evaluating", label: t.decisions.evaluating },
    { key: "scaled", label: t.decisions.scaled },
    { key: "stopped", label: t.decisions.stopped },
  ];
  const byStatus = columns.reduce((acc, col) => {
    acc[col.key] = decisions.filter((d) => d.status === col.key);
    return acc;
  }, {} as Record<string, typeof decisions>);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t.decisions.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t.decisions.description}</p>
        </div>
        <Link
          href="/decisions/evaluate"
          className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-700"
        >
          {t.decisions.evaluateBtn}
        </Link>
      </div>

      {decisions.length === 0 ? (
        <p className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
          {t.decisions.empty}
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div
              key={col.key}
              className="flex min-w-[260px] flex-1 flex-col rounded-xl border border-[var(--card-border)] bg-slate-50/50 p-4 dark:bg-slate-900/20"
            >
              <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                {col.label} ({byStatus[col.key]?.length ?? 0})
              </p>
              <div className="flex flex-1 flex-col gap-2">
                {(byStatus[col.key] ?? []).map((decision) => (
                  <Link
                    key={decision.id}
                    href={`/decisions/${decision.id}`}
                    className="block rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3 text-sm transition hover:border-teal-300 hover:shadow dark:hover:border-teal-700"
                  >
                    <p className="font-medium leading-snug text-[var(--foreground)] break-words">
                      {decision.title}
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--muted)]">
                      {decision.decisionKey}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-[var(--foreground)]">
          {t.decisions.plan306090}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t.decisions.plan306090Desc}
        </p>
        {Object.keys(plan30_60_90).length === 0 ? (
          <p className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
            {t.decisions.plan306090Empty}
          </p>
        ) : (
          <div className="mt-4">
            <Plan306090View plan={plan30_60_90 as Record<string, unknown>} locale={locale} />
          </div>
        )}
      </div>
    </div>
  );
}
