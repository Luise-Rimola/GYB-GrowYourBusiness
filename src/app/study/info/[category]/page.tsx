import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenarios";
import { WORKFLOW_NAMES } from "@/lib/planningFramework";
import { getStudyCategoryContext, VALID_STUDY_CATEGORIES } from "@/lib/studyCategoryContext";

export default async function StudyCategoryInfoPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { category } = await params;
  const sp = await searchParams;
  const isEmbed = sp.embed === "1";
  if (!VALID_STUDY_CATEGORIES.includes(category as ScenarioCategory)) notFound();

  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const cat = category as ScenarioCategory;
  const categoryLabel = SCENARIO_CATEGORIES[cat];
  const ctx = getStudyCategoryContext(locale)[cat];
  const workflowNames = ctx.workflowKeys.map((k) => WORKFLOW_NAMES[k] ?? k);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/study" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
          ← {t.study.studyStart}
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t.study.studyInfoBeforeFb2Prefix} {t.study.studyFb2BeforeCategory} — {categoryLabel}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{t.study.studyInfoIntro}</p>
      </header>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <p>
          <span className="font-semibold">{t.study.studyInfoCurrentPhase}</span> {ctx.phase}
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">{ctx.description}</p>
        <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{t.study.studyInfoWhatDone}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {workflowNames.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{t.study.studyInfoWhatImportant}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {ctx.important.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      </section>

      <div className="flex justify-end">
        <Link
          href={isEmbed ? `/study/fb2/${cat}?embed=1` : `/study/fb2/${cat}`}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          {t.study.studyInfoContinueTo} {t.study.studyFb2BeforeCategory}
        </Link>
      </div>
    </div>
  );
}
