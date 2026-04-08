import { redirect } from "next/navigation";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { IntakeForm } from "@/components/IntakeForm";
import { getIntakeFormState, processIntakeForm } from "@/lib/intake";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

async function submitIntake(formData: FormData) {
  "use server";
  const company = await getOrCreateDemoCompany();
  await processIntakeForm(company.id, formData);
  redirect("/profile");
}

export default async function IntakePage() {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const company = await getOrCreateDemoCompany();
  const { existing, formKey: intakeFormKey } = await getIntakeFormState(company.id);

  return (
    <div className="space-y-8">
      <Section
        title={t.intake.title}
        description={t.intake.description}
      >
        <IntakeForm key={intakeFormKey} existing={existing} submitAction={submitIntake} />
      </Section>
    </div>
  );
}
