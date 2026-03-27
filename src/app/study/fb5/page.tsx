import Link from "next/link";
import { redirect } from "next/navigation";
import { createQuestionnaireItems } from "@/lib/questionnaire-items";
import {
  createQuestionnaireResponse,
  fb5ResponsesJsonToFormDefaults,
  getLatestQuestionnaireResponseJson,
} from "@/lib/questionnaireResponses";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant, updateStudyParticipantById } from "@/lib/study";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { Fragebogen5Form } from "@/components/Fragebogen5Form";
import { AssistantSubmitBridge } from "@/components/AssistantSubmitBridge";

function parseFb5FormData(formData: FormData) {
  const acc = {
    X1: Number(formData.get("X1")),
    X2: Number(formData.get("X2")),
    X3: Number(formData.get("X3")),
    X4: Number(formData.get("X4")),
    X5: Number(formData.get("X5")),
  };
  const open = {
    T1: String(formData.get("T1") || "").trim(),
    T2: String(formData.get("T2") || "").trim(),
    T3: String(formData.get("T3") || "").trim(),
    T4: String(formData.get("T4") || "").trim(),
  };
  return { acc, open };
}

async function saveFb5(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const responses = parseFb5FormData(formData);

  const response = await createQuestionnaireResponse({
    participantId: participant.id,
    questionnaireType: "fb5",
    category: null,
    responsesJson: responses,
  });
  await createQuestionnaireItems(response.id, "fb5", responses as Record<string, unknown>);

  await updateStudyParticipantById(participant.id, { completedFb5: true });

  redirect("/study?saved=fb5");
}

export default async function Fragebogen5Page({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const sp = await searchParams;
  const isEmbed = sp.embed === "1";

  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);

  const savedJson = await getLatestQuestionnaireResponseJson({
    participantId: participant.id,
    questionnaireType: "fb5",
    category: null,
  });
  const initialValues = fb5ResponsesJsonToFormDefaults(savedJson);
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/study" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
          ← {t.study.studyStart}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--foreground)]">{t.study.fb5Title}</h1>
        <p className="mt-2 text-[var(--muted)]">{t.study.fb5Desc}</p>
      </header>
      <Fragebogen5Form action={saveFb5} t={t.study} initialValues={initialValues} submitLabel={t.study.fb5Submit} hideSubmitButton={isEmbed} />
      <AssistantSubmitBridge />
    </div>
  );
}
