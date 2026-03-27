import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { Badge } from "@/components/Badge";
import { DeleteRunButton } from "@/components/DeleteRunButton";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getWorkflowName, getWorkflowSubtitle } from "@/lib/workflows";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

export default async function RunsPage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const runs = await prisma.run.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { steps: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <Section title={t.runs.title} description={t.runs.description}>
        <Link
          href="/workflow-overview"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-teal-200 hover:shadow-md dark:hover:border-teal-800"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">{t.runs.processDiagram}</p>
            <p className="text-xs text-[var(--muted)]">{t.runs.processDiagramDesc}</p>
          </div>
          <svg className="ml-auto h-5 w-5 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <div className="space-y-3">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-teal-200 hover:shadow-md dark:hover:border-teal-800"
            >
              <Link href={`/runs/${run.id}`} className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--foreground)]">{getWorkflowName(run.workflowKey)}</p>
                <p className="text-xs text-[var(--muted)]">
                  {getWorkflowSubtitle(run.workflowKey, run.id, run.status)}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <Badge label={run.status} tone={run.status === "complete" ? "success" : "warning"} />
                <DeleteRunButton runId={run.id} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
