import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

export default async function UseCaseEvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getOrCreateDemoCompany();
  const ev = await prisma.useCaseEvaluation.findFirst({
    where: { id, companyId: company.id },
  });
  if (!ev) notFound();

  const questionnaire = ev.questionnaireJson as {
    helpful?: number;
    fit?: number;
    userOneWord?: string;
    userOneWordConfidence?: number;
    aiOneWord?: string;
    aiOneWordConfidence?: number;
    userConfidenceInAi?: number;
    notes?: string;
  } | null;

  const locale = await getServerLocale();
  const t = getTranslations(locale);

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
          {t.evaluation.overviewUseCase}
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
            {t.evaluation.useCaseLabel}
          </h2>
          <p className="whitespace-pre-wrap text-[var(--foreground)]">
            {ev.useCaseDescription}
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">
            {t.evaluation.decisionApproachLabel}
          </h2>
          <p className="whitespace-pre-wrap text-[var(--foreground)]">
            {ev.userDecisionApproach}
          </p>
        </section>

        {questionnaire && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--muted)]">
              Feedback
            </h2>
            <ul className="space-y-1 text-sm text-[var(--foreground)]">
              {(questionnaire.userOneWord || questionnaire.aiOneWord) && (
                <li>
                  User: {questionnaire.userOneWord ?? "–"}
                  {questionnaire.userOneWordConfidence != null ? ` (${questionnaire.userOneWordConfidence}%)` : ""}
                  {" · "}
                  KI: {questionnaire.aiOneWord ?? "–"}
                  {questionnaire.aiOneWordConfidence != null ? ` (${questionnaire.aiOneWordConfidence}%)` : ""}
                </li>
              )}
              {questionnaire.userConfidenceInAi != null && (
                <li>
                  {t.evaluation.yourConfidenceInAi}: {questionnaire.userConfidenceInAi}%
                </li>
              )}
              {questionnaire.helpful != null && (
                <li>
                  {t.evaluation.questionnaireHelpful}: {questionnaire.helpful}
                </li>
              )}
              {questionnaire.fit != null && (
                <li>
                  {t.evaluation.questionnaireFit}: {questionnaire.fit}
                </li>
              )}
              {questionnaire.notes && (
                <li className="mt-2">
                  <span className="font-medium text-[var(--muted)]">
                    {t.evaluation.questionnaireNotes}:
                  </span>{" "}
                  {questionnaire.notes}
                </li>
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
