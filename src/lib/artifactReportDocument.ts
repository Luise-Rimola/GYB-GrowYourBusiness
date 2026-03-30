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
