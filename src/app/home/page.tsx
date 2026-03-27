import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenarios";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { getActiveIndicatorRuleAlerts } from "@/lib/indicatorMappingRulesEngine";
import { loadAssistantSteps } from "@/lib/assistantSteps";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; category?: string }>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const [
    latestProfile,
    kpiValues,
    kpiSet,
    runs,
    decisions,
    participant,
    activeRuleAlerts,
  ] = await Promise.all([
    prisma.companyProfile.findFirst({
      where: { companyId: company.id },
      orderBy: { version: "desc" },
    }),
    prisma.kpiValue.findMany({ where: { companyId: company.id } }),
    prisma.companyKpiSet.findFirst({
      where: { companyId: company.id },
      orderBy: { version: "desc" },
    }),
    prisma.run.findMany({ where: { companyId: company.id } }),
    prisma.decision.findMany({ where: { companyId: company.id } }),
    getOrCreateStudyParticipant(company.id),
    getActiveIndicatorRuleAlerts(company.id).catch(() => []),
  ]);

  const profileComplete = latestProfile
    ? Math.round(latestProfile.completenessScore * 100)
    : 0;
  const selectedCount = (kpiSet?.selectedKpisJson as string[] | null)?.length ?? 0;
  const kpiCoverage =
    selectedCount > 0 && kpiValues.length > 0
      ? Math.round((kpiValues.length / selectedCount) * 100)
      : kpiValues.length > 0
        ? 50
        : 0;
  const activeRuns = runs.filter((r) =>
    ["draft", "running", "incomplete"].includes(r.status)
  ).length;
  const completedRuns = runs.filter((r) =>
    ["complete", "approved"].includes(r.status)
  ).length;
  const implementedDecisions = decisions.filter((d) => d.status === "scaled").length;

  const selectedKpis = (kpiSet?.selectedKpisJson as string[] | null) ?? [];
  const missingKpis = selectedKpis.length > 0
    ? selectedKpis.filter((k) => !kpiValues.some((v) => v.kpiKey === k))
    : (kpiValues.length === 0 ? ["revenue", "customers", "marketing_spend"] : []);
  const lowConfidenceCount = kpiValues.filter((v) => v.confidence < 0.5).length;
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 30);
  const staleCount = kpiValues.filter((v) => v.createdAt < staleThreshold).length;

  const alerts: { msg: string; tone: "warning" | "danger" }[] = [];
  if (missingKpis.length > 0) alerts.push({ msg: `${t.home.missingKpis}: ${missingKpis.slice(0, 3).join(", ")}${missingKpis.length > 3 ? "..." : ""}`, tone: "warning" });
  if (lowConfidenceCount > 0) alerts.push({ msg: `${lowConfidenceCount} ${t.home.lowConfidence}`, tone: "warning" });
  if (staleCount > 0) alerts.push({ msg: `${staleCount} ${t.home.staleValues}`, tone: "warning" });
  if (profileComplete < 50 && !latestProfile) alerts.push({ msg: t.home.completeProfile, tone: "danger" });
  if (activeRuleAlerts.length > 0) {
    const first = activeRuleAlerts[0];
    alerts.push({
      msg: `Rule-Hinweis aktiv: ${first.ruleKey}${first.message ? ` - ${first.message}` : ""}${activeRuleAlerts.length > 1 ? ` (+${activeRuleAlerts.length - 1})` : ""}`,
      tone: "warning",
    });
  }

  const nextSteps = await loadAssistantSteps({
    companyId: company.id,
    participantId: participant.id,
    participantCompletedFb1: participant.completedFb1,
    participantCompletedFb5: Boolean((participant as { completedFb5?: boolean }).completedFb5),
    profileCompletePercent: profileComplete,
    t: {
      common: { viewArtifacts: t.common.viewArtifacts },
      home: { companyProfile: t.home.companyProfile, stepLlm: t.home.stepLlm, step2: t.home.step2, step5: t.home.step5, step6: t.home.step6 },
      study: {
        studyFb1Btn: t.study.studyFb1Btn,
        studyInfoStep: t.study.studyInfoStep,
        studyFb2BeforeCategory: t.study.studyFb2BeforeCategory,
        studyWorkflowStep: t.study.studyWorkflowStep,
        studyFb3AfterCategory: t.study.studyFb3AfterCategory,
        studyFb4Btn: t.study.studyFb4Btn,
        studyFb5Btn: t.study.studyFb5Btn,
      },
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-5">
        <Badge label={t.home.badge} tone="success" />
        <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">
          {t.home.title}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[var(--muted)]">
          {t.home.subtitle}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/assistant"
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-700 hover:shadow-teal-500/30"
          >
            {t.home.startAssistant}
          </Link>
          <Link
            href="/artifacts"
            className="rounded-xl border border-teal-600 px-5 py-2.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/30"
          >
            {t.common.viewArtifacts}
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-teal-50 hover:border-teal-200 dark:hover:bg-teal-950/30 dark:hover:border-teal-800"
          >
            {t.common.runWorkflows}
          </Link>
        </div>
      </header>

      {params.saved === "fb1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb1Saved}
        </div>
      )}
      {params.saved === "fb2" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb2Saved}
          {params.category && (
            <span className="ml-1 text-[var(--muted)]">
              ({SCENARIO_CATEGORIES[params.category as ScenarioCategory] ?? params.category})
            </span>
          )}
        </div>
      )}
      {params.saved === "fb3" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb3Saved}
          {params.category && (
            <span className="ml-1 text-[var(--muted)]">
              ({SCENARIO_CATEGORIES[params.category as ScenarioCategory] ?? params.category})
            </span>
          )}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 dark:border-amber-800/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t.common.alerts}</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {alerts.map((a, i) => (
              <li key={i}>{a.msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[980px] grid-cols-4 gap-5">
          <StatCard
            href="/profile"
            title={t.home.companyProfile}
            value={latestProfile ? `v${latestProfile.version}` : "—"}
            hint={`${profileComplete}% ${t.home.complete}`}
          />
          <StatCard
            href="/data"
            title={t.home.kpiCoverage}
            value={kpiCoverage ? `${kpiCoverage}%` : "—"}
            hint={kpiValues.length > 0 ? `${kpiValues.length} ${t.home.values}` : t.home.addKpisInData}
          />
          <StatCard
            href="/runs"
            title={t.home.activeRuns}
            value={String(activeRuns)}
            hint={runs.length > 0 ? `${completedRuns}/${runs.length} ${t.home.runsCompleted}` : t.home.startWorkflow}
          />
          <StatCard
            href="/decisions"
            title={t.home.decisions}
            value={String(implementedDecisions)}
            hint={decisions.length > 0 ? `${implementedDecisions}/${decisions.length} ${t.home.total}` : t.home.runNextBestActions}
          />
        </div>
      </div>

      <Section
        title={t.common.nextSteps}
        description={t.home.guidedPath}
      >
        <ul className="space-y-3">
          {nextSteps.map((item, i) => (
            <li key={i}>
              <Link
                href={item.href}
                className={
                  item.completed
                    ? "flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50/70 px-4 py-3 text-sm font-medium text-emerald-900 transition hover:border-emerald-400 hover:bg-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/40"
                    : "flex items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-teal-200 hover:bg-teal-50/50 dark:hover:border-teal-800 dark:hover:bg-teal-950/20"
                }
              >
                <span
                  className={
                    item.completed
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : "flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                  }
                >
                  {item.completed ? "✓" : i + 1}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
