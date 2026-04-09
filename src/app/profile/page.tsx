import { redirect } from "next/navigation";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { IntakeForm } from "@/components/IntakeForm";
import { getIntakeFormState, processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { ProfileSavedNotifier } from "@/components/ProfileSavedNotifier";

async function saveProfile(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await processIntakeForm(company.id, formData);
  const assistantEmbed = formData.get("assistant_embed") === "1";
  if (assistantEmbed) {
    redirect("/profile?embed=1&profileSaved=1");
  }
  redirect("/home#home-next-steps");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string; profileSaved?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const { existing, formKey: intakeFormKey } = await getIntakeFormState(company.id);
  const isEmbed = sp.embed === "1";
  const showSavedBanner = isEmbed && sp.profileSaved === "1";

  if (isEmbed) {
    return (
      <div className="h-full">
        <div className="h-full space-y-4">
          {showSavedBanner ? <ProfileSavedNotifier /> : null}
          <IntakeForm
            key={intakeFormKey}
            existing={existing}
            submitAction={saveProfile}
            assistantEmbed={isEmbed}
            embedFlush
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Section title={t.profile.title} description={t.profile.description}>
        <div className="space-y-6">
          {showSavedBanner ? <ProfileSavedNotifier /> : null}
          <IntakeForm
            key={intakeFormKey}
            existing={existing}
            submitAction={saveProfile}
            assistantEmbed={isEmbed}
          />
        </div>
      </Section>
    </div>
  );
}
