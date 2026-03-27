import { prisma } from "@/lib/prisma";

export const ChatPolicyService = {
  async buildContext(companyId: string) {
    const [artifacts, kpis, sources, knowledgeObjects] = await Promise.all([
      prisma.artifact.findMany({ where: { companyId, approved: true } }),
      prisma.kpiValue.findMany({ where: { companyId } }),
      prisma.source.findMany({ where: { companyId } }),
      prisma.knowledgeObject.findMany({ where: { status: "active" } }),
    ]);

    return {
      artifacts,
      kpis,
      sources,
      knowledgeObjects,
    };
  },
};
