import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { ChecklistClient } from "./ChecklistClient";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const DEFAULT_STAGES_EN = [
  { name: "Brand & Identity", steps: ["Logo", "Brand colors", "Brand guidelines"] },
  { name: "Digital Presence", steps: ["Website", "Social media accounts", "Google Business Profile"] },
  { name: "Product & Menu", steps: ["Menu / product catalogue", "Pricing", "Packaging"] },
  { name: "Operations", steps: ["Supplier recruiting", "Inventory system", "POS / ordering system"] },
  { name: "Legal & Admin", steps: ["Business registration", "Tax setup", "Insurance"] },
  { name: "Launch Prep", steps: ["Soft launch / trial", "Marketing materials", "Opening day plan"] },
];

const DEFAULT_STAGES_DE = [
  { name: "Marke & Identität", steps: ["Logo", "Markenfarben", "Markenrichtlinien"] },
  { name: "Digitale Präsenz", steps: ["Website", "Social-Media-Konten", "Google-Unternehmensprofil"] },
  { name: "Produkt & Angebot", steps: ["Menü / Produktkatalog", "Preise", "Verpackung"] },
  { name: "Betrieb", steps: ["Lieferanten gewinnen", "Lagerverwaltung", "Kasse / Bestellsystem"] },
  { name: "Recht & Verwaltung", steps: ["Gewerbeanmeldung / Registrierung", "Steuern einrichten", "Versicherung"] },
  { name: "Launch-Vorbereitung", steps: ["Softlaunch / Testlauf", "Marketingmaterial", "Plan für den Launch-Tag"] },
];

function defaultStagesForLocale(locale: Locale) {
  return locale === "de" ? DEFAULT_STAGES_DE : DEFAULT_STAGES_EN;
}

export default async function ChecklistPage() {
  const company = await getOrCreateDemoCompany();
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const c = t.checklist;

  if (!prisma.launchStage) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{c.title}</h1>
          <p className="mt-2 text-[var(--muted)]">{c.prismaSync}</p>
        </header>
      </div>
    );
  }

  let stages = await prisma.launchStage.findMany({
    where: { companyId: company.id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });

  if (stages.length === 0) {
    const defaults = defaultStagesForLocale(locale);
    for (let i = 0; i < defaults.length; i++) {
      const s = defaults[i];
      const stage = await prisma.launchStage.create({
        data: {
          companyId: company.id,
          name: s.name,
          sortOrder: i,
          steps: {
            create: s.steps.map((label, j) => ({
              label,
              sortOrder: j,
              done: false,
            })),
          },
        },
        include: { steps: true },
      });
      stages.push(stage);
    }
  }

  const labels = {
    addCategory: c.addCategory,
    newCategoryPlaceholder: c.newCategoryPlaceholder,
    addCategoryButton: c.addCategoryButton,
    allDoneMessage: c.allDoneMessage,
    setAllNo: c.setAllNo,
    fileAttached: c.fileAttached,
    noFile: c.noFile,
    newStepPlaceholder: c.newStepPlaceholder,
    addStepButton: c.addStepButton,
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{c.title}</h1>
        <p className="mt-2 text-[var(--muted)]">{c.exampleNote}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{c.subtitle}</p>
      </header>

      <Section title={c.preLaunchSteps} description={c.preLaunchStepsDesc}>
        <ChecklistClient companyId={company.id} stages={stages} labels={labels} />
      </Section>
    </div>
  );
}
