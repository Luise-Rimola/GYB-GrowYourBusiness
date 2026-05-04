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
  const lang = locale === "en" ? "en" : "de";
  const quant = {
    spss: `/api/export?scope=advisor&format=spss&lang=${lang}&anon=1`,
    pdf: `/api/export?scope=advisor&format=pdf&lang=${lang}&anon=1`,
    excel: `/api/export?scope=advisor&format=excel&lang=${lang}&anon=1`,
    isEn: locale === "en",
  };

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
      downloadsLocale={locale}
      quantExportLinks={quant}
      openTextExcelHref={`/api/export/open-answers?section=advisor&lang=${locale}`}
      openTextExcelLabel={
        locale === "en" ? "Excel: open text answers only" : "Excel: nur offene Textantworten"
      }
    />
  );
}
