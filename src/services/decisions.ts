import { prisma } from "@/lib/prisma";

export const DecisionService = {
  async createDecision(params: {
    companyId: string;
    runId?: string;
    decisionKey: string;
    title: string;
    lever: string;
    decisionJson: Record<string, unknown>;
    scoringJson: Record<string, unknown>;
    evidenceJson: Record<string, unknown>;
  }) {
    return prisma.decision.create({
      data: {
        companyId: params.companyId,
        runId: params.runId,
        decisionKey: params.decisionKey,
        title: params.title,
        lever: params.lever as any,
        status: "proposed",
        decisionJson: params.decisionJson as object,
        scoringJson: params.scoringJson as object,
        evidenceJson: params.evidenceJson as object,
      },
    });
  },
};
