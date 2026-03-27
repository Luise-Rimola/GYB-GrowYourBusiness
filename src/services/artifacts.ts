import { prisma } from "@/lib/prisma";

export const ArtifactService = {
  async createArtifact(params: {
    companyId: string;
    runId?: string;
    type: string;
    title: string;
    version: number;
    contentJson: Record<string, unknown>;
    exportHtml?: string;
  }) {
    return prisma.artifact.create({
      data: {
        companyId: params.companyId,
        runId: params.runId,
        type: params.type as any,
        title: params.title,
        version: params.version,
        contentJson: params.contentJson as object,
        exportHtml: params.exportHtml,
      },
    });
  },
};
