import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { WORKFLOW_NAMES, PLANNING_PHASES, WIZARD_WORKFLOW_ORDER } from "@/lib/planningFramework";
import { WorkflowAssistantFrame } from "@/components/WorkflowAssistantFrame";
import { workflowSteps } from "@/lib/workflowSteps";

type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
};

export default async function WorkflowOnlyAssistantPage({
  searchParams,
}: {
  searchParams?: Promise<{ phase?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const phaseFilter = String(params.phase ?? "").trim();
  const company = await getOrCreateDemoCompany();
  const runs = await prisma.run.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      workflowKey: true,
      status: true,
      createdAt: true,
      steps: {
        select: {
          stepKey: true,
          schemaValidationPassed: true,
          createdAt: true,
        },
      },
    },
  });

  const phaseByWorkflow = new Map<string, string>();
  for (const phase of PLANNING_PHASES) {
    for (const key of phase.workflowKeys) phaseByWorkflow.set(key, phase.id);
  }

  const workflowOrder = WIZARD_WORKFLOW_ORDER.filter((workflowKey) => {
    if (!phaseFilter) return true;
    return phaseByWorkflow.get(workflowKey) === phaseFilter;
  });

  const steps: AssistantStep[] = workflowOrder.map((workflowKey) => {
    const wfRuns = runs.filter((r) => r.workflowKey === workflowKey);
    const latestRun = wfRuns[0];
    const configuredSteps = workflowSteps[workflowKey] ?? [];
    const latestByStepKey = new Map<string, { schemaValidationPassed: boolean; createdAt: Date }>();
    if (latestRun) {
      for (const s of latestRun.steps) {
        const existing = latestByStepKey.get(s.stepKey);
        if (!existing || new Date(s.createdAt) > new Date(existing.createdAt)) {
          latestByStepKey.set(s.stepKey, {
            schemaValidationPassed: s.schemaValidationPassed,
            createdAt: s.createdAt,
          });
        }
      }
    }
    const firstOpenStepIndex = configuredSteps.findIndex((cfg) => {
      const saved = latestByStepKey.get(cfg.stepKey);
      return !saved || !saved.schemaValidationPassed;
    });
    const hasOpenSteps = firstOpenStepIndex >= 0;
    const allStepsDone = configuredSteps.length > 0 && !hasOpenSteps;
    const phaseId = phaseByWorkflow.get(workflowKey);

    return {
      href: latestRun && hasOpenSteps
        ? `/runs/${latestRun.id}?step=${firstOpenStepIndex}`
        : latestRun && allStepsDone
          ? `/runs/${latestRun.id}`
          : phaseId
            ? `/dashboard#phase-${phaseId}`
            : "/dashboard",
      label: WORKFLOW_NAMES[workflowKey] ?? workflowKey,
      completed: Boolean(latestRun && allStepsDone),
    };
  });

  return (
    <div className="-my-10 max-md:-mx-6 max-md:w-[calc(100%+3rem)] max-md:max-w-[100vw] overflow-hidden py-2 md:mx-0 md:w-full md:py-4">
      <WorkflowAssistantFrame steps={steps} />
    </div>
  );
}
