"use client";

import { useMemo, useState } from "react";

type TabId = "analysis" | "kpis" | "guide" | "code";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => text(v)).filter(Boolean);
}

function code(value: unknown): string {
  const t = text(value).trim();
  return t || "// No code snippet available.";
}

export function GrowthArtifactTabs({
  artifactType,
  content,
  locale,
}: {
  artifactType: "growth_paid_ads" | "growth_seo";
  content: Record<string, unknown>;
  locale: "de" | "en";
}) {
  const isDe = locale === "de";
  const [active, setActive] = useState<TabId>("analysis");

  const labels = useMemo(
    () => ({
      analysis: isDe ? "Auswertung" : "Analysis",
      kpis: isDe ? "KPIs" : "KPIs",
      guide: isDe ? "Anleitung" : "Guide",
      code: isDe ? "Code" : "Code",
      noData: isDe ? "Keine Daten verfügbar." : "No data available.",
      kpiName: isDe ? "KPI" : "KPI",
      kpiWhat: isDe ? "Was ist das?" : "What is it?",
      kpiWhy: isDe ? "Warum wichtig?" : "Why important?",
      kpiTarget: isDe ? "Zielhinweis" : "Target hint",
      kpiFrequency: isDe ? "Prueffrequenz" : "Check frequency",
    }),
    [isDe]
  );

  const analysis = isRecord(content.seo_analysis)
    ? content.seo_analysis
    : isRecord(content.paid_media_readiness)
      ? content.paid_media_readiness
      : {};
  const kpiFramework = isRecord(content.kpi_framework_for_client) ? content.kpi_framework_for_client : {};
  const implementationGuide = isRecord(content.implementation_guide) ? content.implementation_guide : {};
  const implementationCode = isRecord(content.implementation_code) ? content.implementation_code : {};

  const priorityKpis = Array.isArray(kpiFramework.priority_kpis) ? kpiFramework.priority_kpis : [];
  const trackingChecklist = stringArray(kpiFramework.tracking_validation_checklist);

  const setupSteps = stringArray(implementationGuide.setup_steps);
  const qaSteps = stringArray(implementationGuide.qa_steps);
  const rollout = stringArray(implementationGuide.rollout_plan_30_days);
  const pitfalls = stringArray(implementationGuide.common_pitfalls);

  const adsCodeBlocks =
    artifactType === "growth_paid_ads"
      ? [
          { title: "gtag base", snippet: code(implementationCode.gtag_base_snippet) },
          { title: "gtag conversion event", snippet: code(implementationCode.gtag_conversion_event_snippet) },
          { title: "Google Ads conversion", snippet: code(implementationCode.google_ads_conversion_snippet) },
          { title: "Meta Pixel base", snippet: code(implementationCode.meta_pixel_base_snippet) },
          { title: "Meta Pixel purchase event", snippet: code(implementationCode.meta_pixel_purchase_event_snippet) },
          { title: "CTA event tracking", snippet: code(implementationCode.cta_event_tracking_snippet) },
          { title: "UTM naming template", snippet: stringArray(implementationCode.utm_naming_template).join("\n") || "// No template available." },
        ]
      : [];

  const seoCodeBlocks =
    artifactType === "growth_seo"
      ? [
          { title: "Title templates", snippet: stringArray(implementationCode.title_template_examples).join("\n") || "// No template available." },
          { title: "Meta description templates", snippet: stringArray(implementationCode.meta_description_template_examples).join("\n") || "// No template available." },
          { title: "Product JSON-LD", snippet: code(implementationCode.product_json_ld_snippet) },
          { title: "FAQ JSON-LD", snippet: code(implementationCode.faq_json_ld_snippet) },
          { title: "robots.txt", snippet: code(implementationCode.robots_txt_example) },
          { title: "Sitemap guidance", snippet: code(implementationCode.sitemap_guidance_snippet) },
          { title: "Canonical tag", snippet: code(implementationCode.canonical_tag_snippet) },
          { title: "Internal linking block", snippet: code(implementationCode.internal_linking_block_template) },
        ]
      : [];

  const codeBlocks = artifactType === "growth_paid_ads" ? adsCodeBlocks : seoCodeBlocks;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-[var(--card-border)] pb-3">
        {(["analysis", "kpis", "guide", "code"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active === tab
                ? "bg-teal-600 text-white"
                : "bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {labels[tab]}
          </button>
        ))}
      </div>

      {active === "analysis" ? (
        <div className="space-y-3">
          {Object.keys(analysis).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{labels.noData}</p>
          ) : (
            Object.entries(analysis).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{key}</p>
                {Array.isArray(value) ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
                    {value.map((entry, idx) => (
                      <li key={`${key}-${idx}`}>{text(entry) || JSON.stringify(entry)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--foreground)]">{text(value) || JSON.stringify(value)}</p>
                )}
              </div>
            ))
          )}
        </div>
      ) : null}

      {active === "kpis" ? (
        <div className="space-y-4">
          {priorityKpis.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">{labels.noData}</p>
          ) : (
            priorityKpis.map((kpi, idx) => {
              const row = isRecord(kpi) ? kpi : {};
              return (
                <div key={`kpi-${idx}`} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{text(row.name) || text(row.kpi_key)}</p>
                  <div className="mt-2 space-y-1 text-sm text-[var(--muted)]">
                    <p><span className="font-medium text-[var(--foreground)]">{labels.kpiName}:</span> {text(row.kpi_key)}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{labels.kpiWhat}:</span> {text(row.what_it_is)}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{labels.kpiWhy}:</span> {text(row.why_it_matters)}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{labels.kpiTarget}:</span> {text(row.target_hint)}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{labels.kpiFrequency}:</span> {text(row.check_frequency)}</p>
                  </div>
                </div>
              );
            })
          )}
          {trackingChecklist.length > 0 ? (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {isDe ? "Tracking-Checkliste" : "Tracking checklist"}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                {trackingChecklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {active === "guide" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: isDe ? "Setup" : "Setup", items: setupSteps },
            { title: isDe ? "QA / Test" : "QA / Test", items: qaSteps },
            { title: isDe ? "30-Tage Rollout" : "30-day rollout", items: rollout },
            { title: isDe ? "Typische Fehler" : "Common pitfalls", items: pitfalls },
          ].map((block) => (
            <div key={block.title} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{block.title}</p>
              {block.items.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">{labels.noData}</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {active === "code" ? (
        <div className="space-y-4">
          {codeBlocks.map((block) => (
            <div key={block.title} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{block.title}</p>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
                <code>{block.snippet}</code>
              </pre>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

