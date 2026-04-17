import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getScenarioById, SCENARIO_CATEGORIES } from "@/lib/scenarios";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

export default async function ScenarioEvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getOrCreateDemoCompany();
  const ev = await prisma.scenarioEvaluation.findFirst({
    where: { id, companyId: company.id },
  });
  if (!ev) notFound();

  const scenario = getScenarioById(ev.scenarioId);
  const categoryLabel = scenario ? SCENARIO_CATEGORIES[scenario.category] : `#${ev.scenarioId}`;
  const userEval = ev.userEvaluationJson as {
    verstaendlichkeit?: number;
    relevanz?: number;
    nuetzlichkeit?: number;
    vollstaendigkeit?: number;
    nachvollziehbarkeit?: number;
    praktikabilitaet?: number;
    vertrauen?: number;
    quellenqualitaet?: number;
  } | null;

  const locale = await getServerLocale();
  const t = getTranslations(locale);

  const evalItems = [
    { key: "verstaendlichkeit" as const, label: t.evaluation.evalVerstaendlichkeit ?? "Verständlichkeit", q: t.evaluation.evalVerstaendlichkeitQ },
    { key: "relevanz" as const, label: t.evaluation.evalRelevanz ?? "Relevanz", q: t.evaluation.evalRelevanzQ },
    { key: "nuetzlichkeit" as const, label: t.evaluation.evalNuetzlichkeit ?? "Nützlichkeit", q: t.evaluation.evalNuetzlichkeitQ },
    { key: "vollstaendigkeit" as const, label: t.evaluation.evalVollstaendigkeit ?? "Vollständigkeit", q: t.evaluation.evalVollstaendigkeitQ },
    { key: "nachvollziehbarkeit" as const, label: t.evaluation.evalNachvollziehbarkeit ?? "Nachvollziehbarkeit", q: t.evaluation.evalNachvollziehbarkeitQ },
    { key: "praktikabilitaet" as const, label: t.evaluation.evalPraktikabilitaet ?? "Praktikabilität", q: t.evaluation.evalPraktikabilitaetQ },
    { key: "vertrauen" as const, label: t.evaluation.evalVertrauen ?? "Vertrauen", q: t.evaluation.evalVertrauenQ },
    { key: "quellenqualitaet" as const, label: t.evaluation.evalQuellenqualitaet ?? "Quellenqualität", q: t.evaluation.evalQuellenqualitaetQ },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/evaluation?tab=overview"
          className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400"
        >
          ← {t.evaluation.overviewTab}
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {categoryLabel} – {scenario?.question ?? `Szenario #${ev.scenarioId}`}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {new Date(ev.createdAt).toLocaleDateString("de-DE", {
            dateStyle: "long",
          })}
        </p>
      </header>

      <div className="space-y-6 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">
            {t.evaluation.yourAnswer}
          </h2>
          <p className="whitespace-pre-wrap text-[var(--foreground)]">{ev.userAnswer}</p>
        </section>

        {ev.aiAnswer && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">
              {t.evaluation.aiAnswer} ({t.evaluation.aiConfidence}: {ev.aiConfidence ?? "–"}%)
            </h2>
            <p className="whitespace-pre-wrap text-[var(--foreground)]">{ev.aiAnswer}</p>
          </section>
        )}

        {ev.userPrefers && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">
              {t.evaluation.preferLabel}
            </h2>
            <p className="text-[var(--foreground)]">
              {ev.userPrefers === "user"
                ? t.evaluation.preferUser
                : ev.userPrefers === "ai"
                  ? t.evaluation.preferAi
                  : "–"}
            </p>
            {ev.userConfidenceInAi != null && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {t.evaluation.yourConfidenceInAi}: {ev.userConfidenceInAi}%
              </p>
            )}
          </section>
        )}

        {(userEval || ev.userConfidence != null) && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--muted)]">
              {t.evaluation.evalIndicators ?? "Evaluierung"}
            </h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-[var(--card-border)]/50 p-3">
                <p className="text-xs text-[var(--muted)]">{t.evaluation.evalUserConfidence ?? "User-Konfidenz (1–10)"}</p>
                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                  {Math.max(0, Math.min(10, Math.round(ev.userConfidence / 10)))}
                </p>
              </div>
              {evalItems.map(({ key, label, q }) =>
                userEval?.[key] != null ? (
                  <div key={key} className="rounded-lg border border-[var(--card-border)]/50 p-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{label}: {userEval[key]}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{q}</p>
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
