"use client";

import { ARTIFACT_REPORT_VIEW_MAP } from "@/lib/artifactReportViews";
import { hasRenderableArtifactContent } from "@/lib/artifactReportBodyUtils";
import { GrowthArtifactTabs } from "@/components/GrowthArtifactTabs";
import { GenericArtifactReportView } from "@/components/GenericArtifactReportView";
import type { Locale } from "@/lib/i18n";

/** `rp-dynamic-html-export`: feste Styles in `report-paper.css` (Tailwind in Server-HTML-Strings oft wirkungslos). */
const HTML_WRAPPER_CLASS =
  "rp-dynamic-html-export max-w-none text-sm leading-relaxed text-slate-800 [&_p]:mb-2";

type Props = {
  artifactType: string;
  content: Record<string, unknown>;
  /** `exportHtml` plus z. B. serverseitiges PESTEL-Fallback aus `content`. */
  resolvedHtml?: string | null;
  locale: Locale;
};

/**
 * Gemeinsames Rendering für Artefakt-Detail und Druck: spezielle Views → Growth-Tabs → HTML → strukturierte JSON-Darstellung.
 */
export function ArtifactReportBody({ artifactType, content, resolvedHtml, locale }: Props) {
  const ReportView = ARTIFACT_REPORT_VIEW_MAP[artifactType] ?? null;
  const isGrowthGuidedArtifact = artifactType === "growth_paid_ads" || artifactType === "growth_seo";
  const isDe = locale === "de";
  const trimmedHtml = resolvedHtml?.trim() ?? "";

  if (ReportView) {
    return <ReportView content={content} />;
  }
  if (isGrowthGuidedArtifact) {
    return (
      <GrowthArtifactTabs
        artifactType={artifactType as "growth_paid_ads" | "growth_seo"}
        content={content}
        locale={locale}
      />
    );
  }
  if (trimmedHtml.length > 0) {
    return <div className={HTML_WRAPPER_CLASS} dangerouslySetInnerHTML={{ __html: trimmedHtml }} />;
  }
  if (hasRenderableArtifactContent(content)) {
    return <GenericArtifactReportView content={content} />;
  }
  return (
    <div className={HTML_WRAPPER_CLASS}>
      <p>
        <em>{isDe ? "Kein Inhalt" : "No content"}</em>
      </p>
    </div>
  );
}
