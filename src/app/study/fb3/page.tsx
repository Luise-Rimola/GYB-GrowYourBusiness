import { redirect } from "next/navigation";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant, updateStudyParticipantById } from "@/lib/study";
import { createQuestionnaireItems } from "@/lib/questionnaire-items";
import {
  createQuestionnaireResponse,
  fb3ResponsesJsonToFormDefaults,
  getLatestQuestionnaireResponseJson,
} from "@/lib/questionnaireResponses";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { Fragebogen3Form } from "@/components/Fragebogen3Form";
import { workflowDisplayName } from "@/lib/planningFramework";
import { AssistantSubmitBridge } from "@/components/AssistantSubmitBridge";
import { artifactsUrlAfterFb3Assistant } from "@/lib/studyAssistantEmbed";
import { getStudyCategoryContext, type StudyCategoryKey } from "@/lib/studyCategoryContext";

function parseFb3FormData(formData: FormData) {
  const dq = { DQ1: Number(formData.get("DQ1")), DQ2: Number(formData.get("DQ2")), DQ3: Number(formData.get("DQ3")), DQ4: Number(formData.get("DQ4")) };
  const ev = { EV1: Number(formData.get("EV1")), EV2: Number(formData.get("EV2")), EV3: Number(formData.get("EV3")), EV4: Number(formData.get("EV4")) };
  const tr = { TR1: Number(formData.get("TR1")), TR2: Number(formData.get("TR2")), TR3: Number(formData.get("TR3")) };
  const cf = { CF1: Number(formData.get("CF1")), CF2: Number(formData.get("CF2")), CF3: Number(formData.get("CF3")) };
  const cl = { CL1: Number(formData.get("CL1")), CL2: Number(formData.get("CL2")), CL3: Number(formData.get("CL3")) };
  return { dq, ev, tr, cf, cl };
}

async function saveFb3(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const category = formData.get("category") ? String(formData.get("category")).trim() || null : null;

  const responses = parseFb3FormData(formData);

  const response = await createQuestionnaireResponse({
    participantId: participant.id,
    questionnaireType: "fb3",
    category,
    responsesJson: responses,
  });
  await createQuestionnaireItems(response.id, "fb3", responses as Record<string, unknown>);

  if (!category) {
    await updateStudyParticipantById(participant.id, { completedFb3AfterRuns: true });
  }

  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed && category) {
    redirect(artifactsUrlAfterFb3Assistant(category));
  }

  redirect(
    category ? `/home?saved=fb3&category=${encodeURIComponent(category)}` : "/home?saved=fb3"
  );
}

export default async function Fragebogen3Page({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; embed?: string }>;
}) {
  const params = await searchParams;
  const isEmbed = params.embed === "1";
  if (!params.category) {
    redirect("/study");
  }

  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const category = params.category as StudyCategoryKey | undefined;
  const savedJson = category
    ? await getLatestQuestionnaireResponseJson({
        participantId: participant.id,
        questionnaireType: "fb3",
        category,
      })
    : null;
  const initialValues = fb3ResponsesJsonToFormDefaults(savedJson);
  const categoryContext = getStudyCategoryContext(locale);
  const context = category && categoryContext[category] ? categoryContext[category] : null;
  const workflowList = context
    ? context.workflowKeys.map((k) => workflowDisplayName(locale, k)).join(", ")
    : `${workflowDisplayName(locale, "WF_VALUE_PROPOSITION")}, ${workflowDisplayName(locale, "WF_CUSTOMER_VALIDATION")}, ${workflowDisplayName(locale, "WF_GO_TO_MARKET")}`;

  return (
    <div className="space-y-8">
      {!isEmbed ? (
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {t.study.fb3Title}
          </h1>
          <p className="mt-2 text-[var(--muted)]">{t.study.fb3Desc}</p>
        </header>
      ) : null}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
        <p>
          <span className="font-semibold">{t.study.fb3CurrentPhaseLabel}</span> {context?.phase ?? t.study.fb3PhaseNotSet}
        </p>
        <p className="mt-2">
          <span className="font-semibold">{t.study.fb3EvaluatedWorkflowsLabel}</span> {workflowList}
        </p>
        <p className="mt-2 text-[var(--muted)]">{t.study.fb3StandaloneInstruction}</p>
      </div>
      <Fragebogen3Form
        action={saveFb3}
        t={t.study}
        category={category ?? null}
        initialValues={initialValues}
        assistantEmbed={isEmbed}
        submitLabel={isEmbed ? t.study.embedSubmitDone : undefined}
        hideSubmitButton={isEmbed}
      />
      <AssistantSubmitBridge />
    </div>
  );
}
