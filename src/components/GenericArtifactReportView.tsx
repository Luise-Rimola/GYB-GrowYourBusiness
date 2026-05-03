"use client";

import { ReadableDataView } from "@/components/ReadableDataView";

/**
 * Strukturierte Darstellung beliebiger Artefakt-JSONs (wie erweiterter Daten-Explorer),
 * ohne `exportHtml`. `sources_used` wird weggelassen (Quellen erscheinen unten gesondert).
 */
export function GenericArtifactReportView({ content }: { content: Record<string, unknown> }) {
  const { sources_used: _omit, ...rest } = content;
  return (
    <div className="max-w-none [&_dl]:gap-1 [&_dt]:break-words [&_dd]:break-words">
      <ReadableDataView data={rest} collapsible={false} summary="Inhalt" presentation="report" />
    </div>
  );
}
