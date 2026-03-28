import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createQuestionnaireItems } from "@/lib/questionnaire-items";
import {
  createQuestionnaireResponse,
  fb4ResponsesJsonToFormDefaults,
  getLatestQuestionnaireResponseJson,
} from "@/lib/questionnaireResponses";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenarios";
import { Fragebogen4Form } from "@/components/Fragebogen4Form";
import { WORKFLOW_NAMES } from "@/lib/planningFramework";
import { getStudyCategoryContext, VALID_STUDY_CATEGORIES } from "@/lib/studyCategoryContext";
import { AssistantSubmitBridge } from "@/components/AssistantSubmitBridge";
import { urlAfterFb4Assistant } from "@/lib/studyAssistantEmbed";

const VALID_CATEGORIES: ScenarioCategory[] = VALID_STUDY_CATEGORIES;

function parseFb4FormData(formData: FormData) {
  const us = { US1: Number(formData.get("US1")), US2: Number(formData.get("US2")), US3: Number(formData.get("US3")) };
  const tam = {
    PE1: Number(formData.get("PE1")),
    PE2: Number(formData.get("PE2")),
    EE1: Number(formData.get("EE1")),
    EE2: Number(formData.get("EE2")),
    SI1: Number(formData.get("SI1")),
    SI2: Number(formData.get("SI2")),
    FC1: Number(formData.get("FC1")),
    FC2: Number(formData.get("FC2")),
  };
  const open = {
    O1: String(formData.get("O1") || "").trim(),
    O2: String(formData.get("O2") || "").trim(),
    O3: String(formData.get("O3") || "").trim(),
  };
  const comp = {
    COMP1: Number(formData.get("COMP1")),
    COMP2: Number(formData.get("COMP2")),
    COMP3: Number(formData.get("COMP3")),
    COMP4: Number(formData.get("COMP4")),
    COMP5: Number(formData.get("COMP5")),
  };
  const fit = { FIT1: Number(formData.get("FIT1")), FIT2: Number(formData.get("FIT2")), FIT3: Number(formData.get("FIT3")) };
  const gov = { GOV1: Number(formData.get("GOV1")), GOV2: Number(formData.get("GOV2")), GOV3: Number(formData.get("GOV3")) };
  const interview = {
    I1: String(formData.get("I1") || "").trim(),
    I2: String(formData.get("I2") || "").trim(),
    I3: String(formData.get("I3") || "").trim(),
    I4: String(formData.get("I4") || "").trim(),
    I5: String(formData.get("I5") || "").trim(),
  };
  return { us, tam, open, comp, fit, gov, interview };
}

async function saveFb4Category(category: string, formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const responses = parseFb4FormData(formData);

  const response = await createQuestionnaireResponse({
    participantId: participant.id,
    questionnaireType: "fb4",
    category,
    responsesJson: responses,
  });
  await createQuestionnaireItems(response.id, "fb4", responses as Record<string, unknown>);

  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed) {
    redirect(urlAfterFb4Assistant(category));
  }
  redirect(`/study?saved=fb4&category=${encodeURIComponent(category)}`);
}

export default async function Fragebogen4CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { category } = await params;
  const sp = await searchParams;
  const isEmbed = sp.embed === "1";
  if (!VALID_CATEGORIES.includes(category as ScenarioCategory)) notFound();

  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const savedJson = await getLatestQuestionnaireResponseJson({
    participantId: participant.id,
    questionnaireType: "fb4",
    category,
  });
  const initialValues = fb4ResponsesJsonToFormDefaults(savedJson);
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const categoryLabel = SCENARIO_CATEGORIES[category as ScenarioCategory];
  const context = getStudyCategoryContext(locale)[category as ScenarioCategory];
  const workflowNames = context.workflowKeys.map((k) => WORKFLOW_NAMES[k] ?? k).join(", ");

  return (
    <div className="space-y-8">
      <header>
        <Link href="/study" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
          ← {t.study.studyStart}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--foreground)]">{t.study.fb4Title}</h1>
        <p className="mt-2 text-[var(--muted)]">{categoryLabel}</p>
      </header>
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
        <p>
          <span className="font-semibold">{t.study.fb4AreaLabel}</span> {context.phase}
        </p>
        <p className="mt-2">
          <span className="font-semibold">{t.study.fb4WorkflowsLabel}</span> {workflowNames}
        </p>
        <p className="mt-2 text-[var(--muted)]">{context.description}</p>
        <p className="mt-3 text-[var(--muted)]">{t.study.fb4ContextHint}</p>
      </div>
      <Fragebogen4Form
        action={saveFb4Category.bind(null, category)}
        t={t.study}
        initialValues={initialValues}
        hideSubmitButton={isEmbed}
        assistantEmbed={isEmbed}
      />
      <AssistantSubmitBridge />
    </div>
  );
}
