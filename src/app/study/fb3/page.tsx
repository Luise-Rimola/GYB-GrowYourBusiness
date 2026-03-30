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
import { WORKFLOW_NAMES } from "@/lib/planningFramework";
import { type ScenarioCategory } from "@/lib/scenarios";
import { AssistantSubmitBridge } from "@/components/AssistantSubmitBridge";
import { artifactsUrlAfterFb3Assistant } from "@/lib/studyAssistantEmbed";

const CATEGORY_CONTEXT: Record<ScenarioCategory, { phase: string; workflowKeys: string[] }> = {
  markt_geschaeftsmodell: { phase: "Ideations- / Konzeptphase", workflowKeys: ["WF_VALUE_PROPOSITION", "WF_COMPETITOR_ANALYSIS", "WF_SWOT", "WF_TREND_ANALYSIS"] },
  produktstrategie: { phase: "Validierungsphase", workflowKeys: ["WF_IDEA_USP_VALIDATION", "WF_FEASIBILITY_VALIDATION", "WF_PATENT_CHECK", "WF_LEGAL_FOUNDATION", "WF_CUSTOMER_VALIDATION"] },
  marketing: { phase: "Gründungs- / Launchphase", workflowKeys: ["WF_GO_TO_MARKET", "WF_MARKETING_STRATEGY"] },
  wachstum_expansion: { phase: "Wachstumsphase", workflowKeys: ["WF_SCALING_STRATEGY", "WF_NEXT_BEST_ACTIONS"] },
  investition_strategie: { phase: "Launch / Finanzierung", workflowKeys: ["WF_STARTUP_CONSULTING", "WF_FINANCIAL_PLANNING"] },
};

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
  const category = params.category as ScenarioCategory | undefined;
  const savedJson = category
    ? await getLatestQuestionnaireResponseJson({
        participantId: participant.id,
        questionnaireType: "fb3",
        category,
      })
    : null;
  const initialValues = fb3ResponsesJsonToFormDefaults(savedJson);
  const context = category && CATEGORY_CONTEXT[category] ? CATEGORY_CONTEXT[category] : null;
  const workflowList = context
    ? context.workflowKeys.map((k) => WORKFLOW_NAMES[k] ?? k).join(", ")
    : `${WORKFLOW_NAMES.WF_VALUE_PROPOSITION}, ${WORKFLOW_NAMES.WF_CUSTOMER_VALIDATION}, ${WORKFLOW_NAMES.WF_GO_TO_MARKET}`;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t.study.fb3Title}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{t.study.fb3Desc}</p>
      </header>
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
        <p><span className="font-semibold">Aktuelle Phase:</span> {context?.phase ?? "Ausgewählte Kategorie/Phase"}</p>
        <p className="mt-2">
          <span className="font-semibold">Bewertungsgrundlage:</span>{" "}
          Dokumente, Entscheidungen, Run-Outputs der Phase ({workflowList}).
        </p>
        <p className="mt-2 text-[var(--muted)]">
          Bitte beantworte auf Basis der tatsächlich erzeugten Ergebnisse. FB3 dient als Nachher-Bewertung im Vergleich zu FB2.
        </p>
      </div>
      <Fragebogen3Form
        action={saveFb3}
        t={t.study}
        category={category ?? null}
        initialValues={initialValues}
        assistantEmbed={isEmbed}
        submitLabel={isEmbed ? "Erledigt & weiter" : undefined}
        hideSubmitButton={isEmbed}
      />
      <AssistantSubmitBridge />
    </div>
  );
}
