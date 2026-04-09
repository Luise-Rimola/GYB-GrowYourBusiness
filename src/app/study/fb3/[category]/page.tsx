import { redirect, notFound } from "next/navigation";
import { createQuestionnaireItems } from "@/lib/questionnaire-items";
import {
  createQuestionnaireResponse,
  fb3ResponsesJsonToFormDefaults,
  getLatestQuestionnaireResponseJson,
} from "@/lib/questionnaireResponses";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { Fragebogen3Form } from "@/components/Fragebogen3Form";
import { workflowDisplayName } from "@/lib/planningFramework";
import { AssistantSubmitBridge } from "@/components/AssistantSubmitBridge";
import { artifactsUrlAfterFb3Assistant } from "@/lib/studyAssistantEmbed";
import { getStudyCategoryContext, getStudyCategoryLabels, VALID_STUDY_CATEGORIES, type StudyCategoryKey } from "@/lib/studyCategoryContext";

const VALID_CATEGORIES: StudyCategoryKey[] = VALID_STUDY_CATEGORIES;

function parseFb3FormData(formData: FormData) {
  const dq = { DQ1: Number(formData.get("DQ1")), DQ2: Number(formData.get("DQ2")), DQ3: Number(formData.get("DQ3")), DQ4: Number(formData.get("DQ4")) };
  const ev = { EV1: Number(formData.get("EV1")), EV2: Number(formData.get("EV2")), EV3: Number(formData.get("EV3")), EV4: Number(formData.get("EV4")) };
  const tr = { TR1: Number(formData.get("TR1")), TR2: Number(formData.get("TR2")), TR3: Number(formData.get("TR3")) };
  const cf = { CF1: Number(formData.get("CF1")), CF2: Number(formData.get("CF2")), CF3: Number(formData.get("CF3")) };
  const cl = { CL1: Number(formData.get("CL1")), CL2: Number(formData.get("CL2")), CL3: Number(formData.get("CL3")) };
  return { dq, ev, tr, cf, cl };
}

async function saveFb3Category(category: string, formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);

  const responses = parseFb3FormData(formData);

  const response = await createQuestionnaireResponse({
    participantId: participant.id,
    questionnaireType: "fb3",
    category,
    responsesJson: responses,
  });
  await createQuestionnaireItems(response.id, "fb3", responses as Record<string, unknown>);

  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed) {
    redirect(artifactsUrlAfterFb3Assistant(category));
  }
  redirect(`/home?saved=fb3&category=${encodeURIComponent(category)}`);
}

export default async function Fragebogen3CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { category } = await params;
  const sp = await searchParams;
  const isEmbed = sp.embed === "1";
  if (!VALID_CATEGORIES.includes(category as StudyCategoryKey)) notFound();

  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const savedJson = await getLatestQuestionnaireResponseJson({
    participantId: participant.id,
    questionnaireType: "fb3",
    category,
  });
  const initialValues = fb3ResponsesJsonToFormDefaults(savedJson);
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const categoryLabel = getStudyCategoryLabels(locale)[category as StudyCategoryKey];
  const context = getStudyCategoryContext(locale)[category as StudyCategoryKey];
  const workflowNames = context.workflowKeys.map((k) => workflowDisplayName(locale, k)).join(", ");

  return (
    <div className="space-y-8">
      {!isEmbed ? (
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {t.study.fb3Title}
          </h1>
          <p className="mt-2 text-[var(--muted)]">{categoryLabel}</p>
        </header>
      ) : null}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
        <p>
          <span className="font-semibold">{t.study.fb3CurrentPhaseLabel}</span> {context.phase}
        </p>
        <p className="mt-2">
          <span className="font-semibold">{t.study.fb3EvaluatedWorkflowsLabel}</span> {workflowNames}
        </p>
        <p className="mt-2 text-[var(--muted)]">{t.study.fb3SameAsFb2Intro}</p>
      </div>
      <Fragebogen3Form
        action={saveFb3Category.bind(null, category)}
        t={t.study}
        category={category}
        initialValues={initialValues}
        assistantEmbed={isEmbed}
        showIntroText={false}
        submitLabel={isEmbed ? t.study.embedSubmitDone : undefined}
        hideSubmitButton={isEmbed}
      />
      <AssistantSubmitBridge />
    </div>
  );
}
