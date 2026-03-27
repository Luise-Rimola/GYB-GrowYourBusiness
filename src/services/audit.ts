import { prisma } from "@/lib/prisma";

export const AuditService = {
  async recordRunInput(runId: string, snapshot: Record<string, unknown>) {
    return prisma.run.update({
      where: { id: runId },
      data: { inputSnapshotJson: snapshot as object },
    });
  },

  async attachStepValidation(runStepId: string, validation: Record<string, unknown>) {
    return prisma.runStep.update({
      where: { id: runStepId },
      data: {
        validationErrorsJson: validation as object,
        schemaValidationPassed: false,
      },
    });
  },
};
