import { redirect, notFound } from "next/navigation";
import { createQuestionnaireItems } from "@/lib/questionnaire-items";
import {
  createQuestionnaireResponse,
  fb2ResponsesJsonToFormDefaults,
  getLatestQuestionnaireResponseJson,
} from "@/lib/questionnaireResponses";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant, updateStudyParticipantById } from "@/lib/study";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenarios";
import { Fragebogen2Form } from "@/components/Fragebogen2Form";
import { WORKFLOW_NAMES } from "@/lib/planningFramework";
import { STUDY_CATEGORY_CONTEXT, VALID_STUDY_CATEGORIES } from "@/lib/studyCategoryContext";
import { AssistantSubmitBridge } from "@/components/AssistantSubmitBridge";
import { dashboardUrlAfterFb2Assistant } from "@/lib/studyAssistantEmbed";

const VALID_CATEGORIES: ScenarioCategory[] = VALID_STUDY_CATEGORIES;
const CATEGORY_CONTEXT = STUDY_CATEGORY_CONTEXT;

function parseFb2FormData(formData: FormData) {
  const dq = { DQ1: Number(formData.get("DQ1")), DQ2: Number(formData.get("DQ2")), DQ3: Number(formData.get("DQ3")), DQ4: Number(formData.get("DQ4")) };
  const ev = { EV1: Number(formData.get("EV1")), EV2: Number(formData.get("EV2")), EV3: Number(formData.get("EV3")), EV4: Number(formData.get("EV4")) };
  const tr = { TR1: Number(formData.get("TR1")), TR2: Number(formData.get("TR2")), TR3: Number(formData.get("TR3")) };
  const cf = { CF1: Number(formData.get("CF1")), CF2: Number(formData.get("CF2")), CF3: Number(formData.get("CF3")) };
  const cl = { CL1: Number(formData.get("CL1")), CL2: Number(formData.get("CL2")), CL3: Number(formData.get("CL3")) };
  const open = { O1: String(formData.get("O1") || "").trim(), O2: String(formData.get("O2") || "").trim(), O3: String(formData.get("O3") || "").trim() };
  return { dq, ev, tr, cf, cl, open };
}

async function saveFb2Category(category: string, formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);

  const responses = parseFb2FormData(formData);

  const response = await createQuestionnaireResponse({
    participantId: participant.id,
    questionnaireType: "fb2",
    category,
    responsesJson: responses,
  });
  await createQuestionnaireItems(response.id, "fb2", responses as Record<string, unknown>);
  await updateStudyParticipantById(participant.id, { completedFb2BeforeRuns: true });

  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed) {
    redirect(dashboardUrlAfterFb2Assistant(category));
  }
  redirect(`/home?saved=fb2&category=${encodeURIComponent(category)}`);
}

export default async function Fragebogen2CategoryPage({
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
    questionnaireType: "fb2",
    category,
  });
  const initialValues = fb2ResponsesJsonToFormDefaults(savedJson);
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const categoryLabel = SCENARIO_CATEGORIES[category as ScenarioCategory];
  const context = CATEGORY_CONTEXT[category as ScenarioCategory];
  const workflowNames = context.workflowKeys.map((k) => WORKFLOW_NAMES[k] ?? k).join(", ");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t.study.fb2Title}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{categoryLabel}</p>
      </header>
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
        <p><span className="font-semibold">Aktuelle Phase:</span> {context.phase}</p>
        <p className="mt-2"><span className="font-semibold">Workflows in dieser Kategorie:</span> {workflowNames}</p>
        <p className="mt-2 text-[var(--muted)]">
          {context.description}
        </p>
      </div>
      <Fragebogen2Form
        action={saveFb2Category.bind(null, category)}
        t={t.study}
        category={category}
        initialValues={initialValues}
        assistantEmbed={isEmbed}
        submitLabel={isEmbed ? "Erledigt & weiter" : undefined}
        hideSubmitButton={isEmbed}
      />
      <AssistantSubmitBridge />
    </div>
  );
}
