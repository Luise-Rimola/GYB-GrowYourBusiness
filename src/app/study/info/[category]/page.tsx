import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { workflowDisplayName } from "@/lib/planningFramework";
import { getStudyCategoryContext, getStudyCategoryLabels, VALID_STUDY_CATEGORIES, type StudyCategoryKey } from "@/lib/studyCategoryContext";

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
  if (!VALID_STUDY_CATEGORIES.includes(category as StudyCategoryKey)) notFound();

  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const cat = category as StudyCategoryKey;
  const categoryLabel = getStudyCategoryLabels(locale)[cat];
  const ctx = getStudyCategoryContext(locale)[cat];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
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
          {ctx.workflowKeys.map((k) => (
            <li key={k}>{workflowDisplayName(locale, k)}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">{t.study.studyInfoDocs}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {locale === "de" ? (
            <>
              <li>Ein Übersichts-Dokument mit den wichtigsten Erkenntnissen.</li>
              <li>Ein Dokument mit Chancen, Risiken und offenen Fragen.</li>
              <li>Ein Entscheidungs-Dokument mit klaren nächsten Schritten.</li>
            </>
          ) : (
            <>
              <li>An overview document with the most important findings.</li>
              <li>A document with opportunities, risks, and open questions.</li>
              <li>A decision document with clear next steps.</li>
            </>
          )}
        </ul>
        <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{t.study.studyInfoWhatImportant}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          {ctx.important.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      </section>

      {!isEmbed ? (
        <div className="flex justify-end">
          <Link
            href={`/study/fb2/${cat}`}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {t.study.studyInfoContinueTo} {t.study.studyFb2BeforeCategory}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
