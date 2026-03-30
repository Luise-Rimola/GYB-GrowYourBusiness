import { redirect } from "next/navigation";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant, updateStudyParticipantById } from "@/lib/study";
import { createQuestionnaireItems } from "@/lib/questionnaire-items";
import {
  createQuestionnaireResponse,
  getLatestQuestionnaireResponseJson,
} from "@/lib/questionnaireResponses";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { Fragebogen1Form } from "@/components/Fragebogen1Form";
import { AssistantSubmitBridge } from "@/components/AssistantSubmitBridge";

async function saveFb1(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);

  const a = {
    A1: String(formData.get("A1") || "").trim(),
    A2: String(formData.get("A2") || "").trim(),
    A3: String(formData.get("A3") || "").trim(),
    A4: String(formData.get("A4") || "").trim(),
    A5: Number(formData.get("A5")) || 0,
    A6: String(formData.get("A6") || "").trim(),
  };
  const b = {
    B1: String(formData.get("B1") || "").trim(),
    B2: Number(formData.get("B2")) || 4,
    B3: Number(formData.get("B3")) || 4,
  };
  const c = {
    C1: Number(formData.get("C1")) || 4,
    C2: Number(formData.get("C2")) || 4,
    C3: Number(formData.get("C3")) || 4,
    C4: Number(formData.get("C4")) || 4,
    C5: Number(formData.get("C5")) || 4,
    C6: Number(formData.get("C6")) || 4,
  };
  const d = {
    D1: String(formData.get("D1") || "").trim(),
    D2: String(formData.get("D2") || "").trim(),
    D3: String(formData.get("D3") || "").trim(),
    D4: String(formData.get("D4") || "").trim(),
  };

  const response = await createQuestionnaireResponse({
    participantId: participant.id,
    questionnaireType: "fb1",
    category: null,
    responsesJson: { a, b, c, d },
  });
  await createQuestionnaireItems(response.id, "fb1", { a, b, c, d });

  await updateStudyParticipantById(participant.id, { completedFb1: true });

  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed) {
    redirect("/profile?embed=1&afterFb1=1");
  }
  redirect("/home?saved=fb1");
}

export default async function Fragebogen1Page({
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
    questionnaireType: "fb1",
    category: null,
  });

  function safeParseJson(raw: unknown) {
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }

  const parsed = safeParseJson(savedJson);
  const initialData =
    parsed && typeof parsed === "object" && "a" in (parsed as any) ? (parsed as any) : undefined;

  const locale = await getServerLocale();
  const t = getTranslations(locale);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
          {t.study.fb1Title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          {t.study.fb1Desc}
        </p>
      </header>

      <Fragebogen1Form
        action={saveFb1}
        t={t.study}
        assistantEmbed={isEmbed}
        submitLabel={isEmbed ? "Erledigt & weiter" : undefined}
        hideSubmitButton={isEmbed}
        initialData={initialData}
      />
      <AssistantSubmitBridge />
    </div>
  );
}
