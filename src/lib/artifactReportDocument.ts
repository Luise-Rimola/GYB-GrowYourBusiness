import type { Artifact } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ARTIFACT_REPORT_VIEW_MAP } from "@/lib/artifactReportViews";

/**
 * Same JSON as on the artifact detail page (e.g. merges financial_planning into business_plan).
 */
export async function prepareArtifactReportContent(artifact: Artifact): Promise<Record<string, unknown>> {
  let content = artifact.contentJson as Record<string, unknown>;
  if (artifact.type === "business_plan" && artifact.companyId) {
    const fpArtifact = await prisma.artifact.findFirst({
      where: { companyId: artifact.companyId, type: "financial_planning" },
      orderBy: { createdAt: "desc" },
    });
    const fpContent = fpArtifact?.contentJson as { monthly_projection?: unknown[] } | null;
    if (fpContent?.monthly_projection?.length) {
      content = { ...content, monthly_projection: fpContent.monthly_projection };
    }
  }
  return content;
}

export function getReportViewForArtifactType(type: string) {
  return ARTIFACT_REPORT_VIEW_MAP[type] ?? null;
}

/** HTML aus Artefakt-JSON, wenn PESTEL-Struktur vorliegt (inkl. ältere „trend_analysis“ mit PESTEL-Titel). */
export function buildPestelFallbackHtmlFromContent(
  content: Record<string, unknown>,
  artifactType: string,
  artifactTitle: string | null | undefined,
): string | null {
  const isLegacyPestelStoredAsTrend = artifactType === "trend_analysis" && /pestel/i.test(artifactTitle ?? "");
  const sections = ["political", "economic", "social", "technological", "environmental", "legal"] as const;
  const hasPestelShape = sections.some((k) => Array.isArray(content[k]));
  if (!(artifactType === "pestel_analysis" || isLegacyPestelStoredAsTrend) || !hasPestelShape) return null;
  const toList = (items: unknown) =>
    Array.isArray(items)
      ? items
          .map((item) => {
            const row = (item ?? {}) as Record<string, unknown>;
            const factor = String(row.factor ?? "").trim();
            const impact = String(row.impact ?? "").trim();
            const risk = String(row.risk_level ?? "").trim();
            if (!factor && !impact) return "";
            return `<li><strong>${factor || "Faktor"}</strong>: ${impact || "—"}${risk ? ` (${risk})` : ""}</li>`;
          })
          .filter(Boolean)
          .join("")
      : "";
  return sections
    .map((k) => {
      const entries = toList(content[k]);
      if (!entries) return "";
      const title = k.charAt(0).toUpperCase() + k.slice(1);
      return `<h3>${title}</h3><ul>${entries}</ul>`;
    })
    .join("");
}

/** Gleiche Priorität wie auf der Artefakt-Detailseite: `exportHtml`, sonst serverseitiges PESTEL-HTML aus JSON. */
export function resolveArtifactReportHtml(
  exportHtml: string | null | undefined,
  content: Record<string, unknown>,
  artifactType: string,
  artifactTitle: string | null | undefined,
): string | null {
  const pestel = buildPestelFallbackHtmlFromContent(content, artifactType, artifactTitle);
  return exportHtml ?? pestel ?? null;
}
