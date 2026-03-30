"use client";

import { useState } from "react";
import { Section } from "@/components/Section";
import { MANUAL_DICTIONARY_DE, MANUAL_DICTIONARY_EN } from "@/lib/manualDictionary";

type GuideCopy = {
  appGoalTitle: string;
  appGoalBody: string;
  structureTitle: string;
  structureItems: readonly string[];
  flowTitle: string;
  flowItems: readonly string[];
  tipsTitle: string;
  tipsItems: readonly string[];
};

export function ManualTabs({
  locale,
  guideTabLabel,
  dictionaryTabLabel,
  dictionaryIntro,
  guide,
}: {
  locale: "en" | "de";
  guideTabLabel: string;
  dictionaryTabLabel: string;
  dictionaryIntro: string;
  guide: GuideCopy;
}) {
  const [tab, setTab] = useState<"guide" | "dictionary">("guide");
  const dict = locale === "de" ? MANUAL_DICTIONARY_DE : MANUAL_DICTIONARY_EN;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-3">
        <button
          type="button"
          onClick={() => setTab("guide")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "guide"
              ? "bg-teal-600 text-white"
              : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {guideTabLabel}
        </button>
        <button
          type="button"
          onClick={() => setTab("dictionary")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === "dictionary"
              ? "bg-teal-600 text-white"
              : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {dictionaryTabLabel}
        </button>
      </div>

      {tab === "guide" ? (
        <div className="space-y-8">
          <Section title={guide.appGoalTitle}>
            <p className="text-sm text-[var(--foreground)]">{guide.appGoalBody}</p>
          </Section>

          <Section title={guide.structureTitle}>
            <ul className="list-inside list-disc space-y-2 text-sm text-[var(--foreground)]">
              {guide.structureItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
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
      ) : (
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
      )}
    </div>
  );
}
