"use client";

import { useState } from "react";
import { Section } from "@/components/Section";
import { MANUAL_DICTIONARY_DE, MANUAL_DICTIONARY_EN } from "@/lib/manualDictionary";
import { EVALUATION_FF_MAP_ROWS, type EvaluationMapRow, type FfId } from "@/lib/manualResearchMapping";

type GuideCopy = {
  appGoalTitle: string;
  appGoalBody: string;
  structureTitle: string;
  structureEntries: ReadonlyArray<{
    title: string;
    body: string;
  }>;
  flowTitle: string;
  flowItems: readonly string[];
  tipsTitle: string;
  tipsItems: readonly string[];
};

export type ConceptSectionCopy =
  | { title: string; body: string; bullets?: never }
  | { title: string; bullets: readonly string[]; body?: never };

export type ConceptTabCopy = {
  tabLabel: string;
  title: string;
  /** Fließtext-Einleitung (z. B. Tech/Doku). */
  intro?: string;
  /** Stichpunkte-Einleitung (z. B. Konzept). Wenn gesetzt, hat Vorrang vor `intro`. */
  introBullets?: readonly string[];
  sections: readonly ConceptSectionCopy[];
};

export type EvaluationTabCopy = {
  tabLabel: string;
  title: string;
  intro: string;
  methodologyTitle: string;
  methodologyIntro: string;
  methodologyQas: ReadonlyArray<{
    question: string;
    paragraphs: readonly string[];
  }>;
  methodologyClosing: string;
  mappingIntro: string;
  ffFootnote: string;
  repeatNotice: string;
  tableColInstrument: string;
  tableColCode: string;
  tableColLabel: string;
  tableColFf1: string;
  tableColFf2: string;
  tableColFf3: string;
  tableColFf4: string;
};

function ffCell(ff: readonly FfId[], id: FfId): string {
  return ff.includes(id) ? "✓" : "";
}

function EvaluationMappingTable({
  rows,
  ev,
  locale,
}: {
  rows: readonly EvaluationMapRow[];
  ev: EvaluationTabCopy;
  locale: "en" | "de";
}) {
  const label = (r: EvaluationMapRow) => (locale === "en" ? r.labelEn : r.labelDe);
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="min-w-[720px] w-full border-collapse text-left text-xs text-[var(--foreground)]">
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/80">
            <th className="border-r border-[var(--card-border)] px-2 py-2 font-semibold">{ev.tableColInstrument}</th>
            <th className="border-r border-[var(--card-border)] px-2 py-2 font-semibold">{ev.tableColCode}</th>
            <th className="border-r border-[var(--card-border)] px-2 py-2 font-semibold">{ev.tableColLabel}</th>
            <th className="w-10 border-r border-[var(--card-border)] px-1 py-2 text-center font-semibold">{ev.tableColFf1}</th>
            <th className="w-10 border-r border-[var(--card-border)] px-1 py-2 text-center font-semibold">{ev.tableColFf2}</th>
            <th className="w-10 border-r border-[var(--card-border)] px-1 py-2 text-center font-semibold">{ev.tableColFf3}</th>
            <th className="w-10 px-1 py-2 text-center font-semibold">{ev.tableColFf4}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.instrument}-${r.code}`} className="border-b border-[var(--card-border)]/70 odd:bg-[var(--card)]/40">
              <td className="border-r border-[var(--card-border)] px-2 py-1.5 align-top font-medium">{r.instrument}</td>
              <td className="border-r border-[var(--card-border)] px-2 py-1.5 align-top font-mono text-[11px]">{r.code}</td>
              <td className="border-r border-[var(--card-border)] px-2 py-1.5 align-top">{label(r)}</td>
              <td className="border-r border-[var(--card-border)] px-1 py-1.5 text-center align-top">{ffCell(r.ff, "FF1")}</td>
              <td className="border-r border-[var(--card-border)] px-1 py-1.5 text-center align-top">{ffCell(r.ff, "FF2")}</td>
              <td className="border-r border-[var(--card-border)] px-1 py-1.5 text-center align-top">{ffCell(r.ff, "FF3")}</td>
              <td className="px-1 py-1.5 text-center align-top">{ffCell(r.ff, "FF4")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Renders `backtick` segments as inline <code> (paths, filenames, npm scripts). */
function ArticleRichParagraph({ className, text }: { className?: string; text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <div className={className ?? "text-sm leading-relaxed text-[var(--foreground)]"}>
      {parts.map((part, i) => {
        if (part.length >= 2 && part.startsWith("`") && part.endsWith("`")) {
          const inner = part.slice(1, -1);
          return (
            <code
              key={i}
              className="mx-0.5 rounded bg-[var(--background)] px-1 py-0.5 font-mono text-[12px] text-[var(--foreground)] ring-1 ring-[var(--card-border)]"
            >
              {inner}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function ArticleTab({ tab }: { tab: ConceptTabCopy }) {
  const hasIntroBullets = tab.introBullets && tab.introBullets.length > 0;
  return (
    <div className="space-y-6">
      <Section title={tab.title}>
        {hasIntroBullets ? (
          <ul className="list-outside list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
            {tab.introBullets!.map((line, i) => (
              <li key={i}>
                <ArticleRichParagraph className="text-[var(--foreground)]" text={line} />
              </li>
            ))}
          </ul>
        ) : tab.intro ? (
          <ArticleRichParagraph
            className="text-sm leading-relaxed text-[var(--foreground)]"
            text={tab.intro}
          />
        ) : null}
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-[var(--foreground)]">
          {tab.sections.map((s) => (
            <div key={s.title} className="space-y-2">
              <p className="font-semibold">{s.title}</p>
              {"bullets" in s && s.bullets?.length ? (
                <ul className="list-outside list-disc space-y-1.5 pl-5">
                  {s.bullets.map((line, i) => (
                    <li key={i}>
                      <ArticleRichParagraph className="text-[var(--foreground)]" text={line} />
                    </li>
                  ))}
                </ul>
              ) : "body" in s && s.body ? (
                <ArticleRichParagraph text={s.body} />
              ) : null}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function ManualTabs({
  locale,
  guideTabLabel,
  conceptTab,
  evaluationTab,
  techTab,
  docsTab,
  dictionaryTabLabel,
  dictionaryIntro,
  guide,
  evaluationRows,
}: {
  locale: "en" | "de";
  guideTabLabel: string;
  conceptTab: ConceptTabCopy;
  evaluationTab: EvaluationTabCopy;
  techTab: ConceptTabCopy;
  docsTab: ConceptTabCopy;
  dictionaryTabLabel: string;
  dictionaryIntro: string;
  guide: GuideCopy;
  evaluationRows: readonly EvaluationMapRow[];
}) {
  const [tab, setTab] = useState<"guide" | "concept" | "evaluation" | "tech" | "docs" | "dictionary">("guide");
  const dict = locale === "de" ? MANUAL_DICTIONARY_DE : MANUAL_DICTIONARY_EN;

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
        tab === id ? "bg-teal-600 text-white" : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-3">
        {tabBtn("guide", guideTabLabel)}
        {tabBtn("concept", conceptTab.tabLabel)}
        {tabBtn("evaluation", evaluationTab.tabLabel)}
        {tabBtn("tech", techTab.tabLabel)}
        {tabBtn("docs", docsTab.tabLabel)}
        {tabBtn("dictionary", dictionaryTabLabel)}
      </div>

      {tab === "guide" ? (
        <div className="space-y-8">
          <Section title={guide.appGoalTitle}>
            <p className="text-sm text-[var(--foreground)]">{guide.appGoalBody}</p>
          </Section>

          <Section title={guide.structureTitle}>
            <div className="space-y-4 text-sm leading-relaxed text-[var(--foreground)]">
              {guide.structureEntries.map((entry) => (
                <div key={entry.title} className="space-y-1">
                  <p className="font-semibold">{entry.title}</p>
                  <p>{entry.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title={guide.flowTitle}>
            <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--foreground)]">
              {guide.flowItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </Section>

          <Section title={guide.tipsTitle}>
            <ul className="list-inside list-disc space-y-2 text-sm text-[var(--foreground)]">
              {guide.tipsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        </div>
      ) : null}

      {tab === "concept" ? <ArticleTab tab={conceptTab} /> : null}
      {tab === "tech" ? <ArticleTab tab={techTab} /> : null}
      {tab === "docs" ? <ArticleTab tab={docsTab} /> : null}

      {tab === "evaluation" ? (
        <div className="space-y-8">
          <Section title={evaluationTab.title}>
            <p className="text-sm leading-relaxed text-[var(--foreground)]">{evaluationTab.intro}</p>
          </Section>

          <Section title={evaluationTab.methodologyTitle}>
            <div className="space-y-5 text-sm leading-relaxed text-[var(--foreground)]">
              <p>{evaluationTab.methodologyIntro}</p>
              {evaluationTab.methodologyQas.map((qa) => (
                <div key={qa.question} className="space-y-2">
                  <p className="font-semibold">{qa.question}</p>
                  {qa.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              ))}
              <p>{evaluationTab.methodologyClosing}</p>
            </div>
          </Section>

          <Section title={locale === "de" ? "Operative Zuordnung: Variablen → Forschungsfragen" : "Operational mapping: variables → research questions"}>
            <p className="mb-3 text-sm leading-relaxed text-[var(--foreground)]">{evaluationTab.mappingIntro}</p>
            <p className="mb-2 text-xs text-[var(--muted)]">{evaluationTab.ffFootnote}</p>
            <p className="mb-4 text-xs font-medium text-amber-800 dark:text-amber-200">{evaluationTab.repeatNotice}</p>
            <EvaluationMappingTable rows={evaluationRows} ev={evaluationTab} locale={locale} />
          </Section>
        </div>
      ) : null}

      {tab === "dictionary" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">{dictionaryIntro}</p>
          <dl className="space-y-5">
            {dict.map((entry) => (
              <div
                key={entry.term}
                className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4"
              >
                <dt className="text-sm font-semibold text-[var(--foreground)]">{entry.term}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{entry.explanation}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
