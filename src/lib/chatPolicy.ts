import { prisma } from "@/lib/prisma";
import { WIZARD_WORKFLOW_ORDER } from "@/lib/planningFramework";
import { WORKFLOW_BY_KEY } from "@/lib/workflows";

export async function areAllWorkflowsComplete(companyId: string): Promise<boolean> {
  const [runs, profile] = await Promise.all([
    prisma.run.findMany({
      where: { companyId },
      include: { steps: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.companyProfile.findFirst({
      where: { companyId },
      orderBy: { version: "desc" },
    }),
  ]);

  const hasProfile = !!profile && (profile.completenessScore ?? 0) >= 0.5;
  const runsByWorkflow = Object.fromEntries(
    WIZARD_WORKFLOW_ORDER.map((key) => [
      key,
      runs.filter((r) => r.workflowKey === key).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ])
  );

  const workflowsInOrder = WIZARD_WORKFLOW_ORDER.filter((k) => WORKFLOW_BY_KEY[k]);

  function isWorkflowComplete(key: string): boolean {
    if (key === "WF_BUSINESS_FORM") return hasProfile;
    const hasComplete = runsByWorkflow[key]?.some((r) => r.status === "complete" || r.status === "approved");
    const hasInProgress = runsByWorkflow[key]?.some((r) => ["draft", "running", "incomplete"].includes(r.status));
    return !!hasComplete && !hasInProgress;
  }

  return workflowsInOrder.every(isWorkflowComplete);
}
