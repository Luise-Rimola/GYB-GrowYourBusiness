import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { ChecklistClient } from "./ChecklistClient";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

const DEFAULT_STAGES = [
  { name: "Brand & Identity", steps: ["Logo", "Brand colors", "Brand guidelines"] },
  { name: "Digital Presence", steps: ["Website", "Social media accounts", "Google Business Profile"] },
  { name: "Product & Menu", steps: ["Menu / product catalogue", "Pricing", "Packaging"] },
  { name: "Operations", steps: ["Supplier recruiting", "Inventory system", "POS / ordering system"] },
  { name: "Legal & Admin", steps: ["Business registration", "Tax setup", "Insurance"] },
  { name: "Launch Prep", steps: ["Soft launch / trial", "Marketing materials", "Opening day plan"] },
];

export default async function ChecklistPage() {
  const company = await getOrCreateDemoCompany();
  const locale = await getServerLocale();
  const t = getTranslations(locale);

  if (!prisma.launchStage) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {t.checklist.title}
          </h1>
          <p className="mt-2 text-[var(--muted)]">
            {t.checklist.prismaSync}
          </p>
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
    for (let i = 0; i < DEFAULT_STAGES.length; i++) {
      const s = DEFAULT_STAGES[i];
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Checkliste
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Launch Checklist (Example)
        </p>
        <p className="mt-1 text-[var(--muted)]">
          Track pre-launch steps. Click a stage to set all steps to No. Upload files for LLM review.
        </p>
      </header>

      <Section title="Pre-launch Steps" description="Check off each step as you complete it.">
        <ChecklistClient companyId={company.id} stages={stages} />
      </Section>
    </div>
  );
}
