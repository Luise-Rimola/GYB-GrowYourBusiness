import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCompany } from "@/lib/companyContext";
import { prepareArtifactReportContent, getReportViewForArtifactType } from "@/lib/artifactReportDocument";
import { ReportPaperLayout } from "@/components/ReportPaperLayout";
import { SourcesFooter } from "@/components/SourcesFooter";
import { ArtifactPrintChrome } from "@/components/ArtifactPrintChrome";

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
  const ReportView = getReportViewForArtifactType(artifact.type);
  const sources = (content.sources_used as string[]) ?? [];

  return (
    <>
      <ArtifactPrintChrome backHref={`/artifacts/${id}`} />
      <div className="mx-auto max-w-[210mm] px-2 pb-12 print:px-0 print:pb-0">
        <ReportPaperLayout title={artifact.title} generatedAt={artifact.createdAt}>
          {ReportView ? (
            <div className="report-paper-prose space-y-6">
              <ReportView content={content} />
            </div>
          ) : (
            <div
              className="report-paper-html min-h-[120px] text-sm leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: artifact.exportHtml ?? "<p><em>Kein Inhalt</em></p>",
              }}
            />
          )}
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
