import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/companyContext";
import { prepareArtifactReportContent, resolveArtifactReportHtml } from "@/lib/artifactReportDocument";
import { getServerLocale } from "@/lib/locale";
import { ReportPaperLayout } from "@/components/ReportPaperLayout";
import { SourcesFooter } from "@/components/SourcesFooter";
import { ArtifactPrintChrome } from "@/components/ArtifactPrintChrome";
import { ArtifactReportBody } from "@/components/ArtifactReportBody";

export default async function ArtifactPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const company = await requireCompany();
  const { id } = await params;
  const artifact = await prisma.artifact.findFirst({
    where: { id, companyId: company.id },
  });
  if (!artifact) {
    notFound();
  }

  const content = await prepareArtifactReportContent(artifact);
  const locale = await getServerLocale();
  const sources = (content.sources_used as string[]) ?? [];
  const reportHtml = resolveArtifactReportHtml(
    artifact.exportHtml,
    content,
    artifact.type,
    artifact.title,
  );

  return (
    <>
      <ArtifactPrintChrome backHref={`/artifacts/${id}`} />
      <div className="mx-auto max-w-[210mm] px-2 pb-12 print:px-0 print:pb-0">
        <ReportPaperLayout title={artifact.title} generatedAt={artifact.createdAt}>
          <div className="report-paper-prose min-h-[120px] space-y-6 text-sm leading-relaxed">
            <ArtifactReportBody
              artifactType={artifact.type}
              content={content as Record<string, unknown>}
              resolvedHtml={reportHtml}
              locale={locale}
            />
          </div>
          {sources.length > 0 ? (
            <section className="report-paper-sources mt-10 break-inside-avoid border-t border-slate-300 pt-6">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Quellen</h2>
              <SourcesFooter sources={sources} showTitle={false} />
            </section>
          ) : null}
        </ReportPaperLayout>
      </div>
    </>
  );
}
