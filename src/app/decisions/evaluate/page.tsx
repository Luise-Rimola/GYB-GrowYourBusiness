import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { getFeatureEvaluations } from "@/lib/featureEvaluations";
import { FeatureEvaluationEvaluateContent } from "@/components/FeatureEvaluationEvaluateContent";

export default async function DecisionsEvaluatePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const { saved } = await searchParams;
  const company = await getOrCreateDemoCompany();
  const evaluations = await getFeatureEvaluations(company.id, "decisions");
  const fv = t.featureEvaluation;

  return (
    <FeatureEvaluationEvaluateContent
      kind="decisions"
      title={t.decisions.evaluatePageTitle}
      description={t.decisions.evaluatePageDesc}
      backHref="/decisions"
      backLabel={t.decisions.evaluateBack}
      saved={saved}
      evaluations={evaluations}
      emptyHistory={t.decisions.evaluateEmpty}
      fv={fv}
    />
  );
}
