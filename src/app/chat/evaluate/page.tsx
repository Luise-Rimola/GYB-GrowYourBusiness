import { getOrCreateDemoCompany } from "@/lib/demo";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { getFeatureEvaluations } from "@/lib/featureEvaluations";
import { FeatureEvaluationEvaluateContent } from "@/components/FeatureEvaluationEvaluateContent";

export default async function ChatEvaluatePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const { saved } = await searchParams;
  const company = await getOrCreateDemoCompany();
  const evaluations = await getFeatureEvaluations(company.id, "chat");
  const fv = t.featureEvaluation;

  return (
    <FeatureEvaluationEvaluateContent
      kind="chat"
      title={t.chat.evaluatePageTitle}
      description={t.chat.evaluatePageDesc}
      backHref="/chat"
      backLabel={t.chat.evaluateBack}
      saved={saved}
      evaluations={evaluations}
      emptyHistory={t.chat.evaluateEmpty}
      fv={fv}
    />
  );
}
