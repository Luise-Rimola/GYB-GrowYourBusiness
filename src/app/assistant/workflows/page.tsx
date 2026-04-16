import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { WORKFLOW_NAMES, PLANNING_PHASES, WIZARD_WORKFLOW_ORDER } from "@/lib/planningFramework";
import { WorkflowAssistantFrame } from "@/components/ProcessAssistant";
import { workflowSteps } from "@/lib/workflowSteps";
import { isRunProcessFullyComplete } from "@/lib/runProcessCompletion";

type AssistantStep = {
  href: string;
  label: string;
  completed: boolean;
  phaseId?: string;
};

function pickPreferredStepStates(
  steps: Array<{ stepKey: string; schemaValidationPassed: boolean; createdAt: Date }>
) {
  const byKey = new Map<string, Array<{ stepKey: string; schemaValidationPassed: boolean; createdAt: Date }>>();
  for (const step of steps) {
    const list = byKey.get(step.stepKey) ?? [];
    list.push(step);
    byKey.set(step.stepKey, list);
  }
  const preferred = new Map<string, { schemaValidationPassed: boolean; createdAt: Date }>();
  for (const [stepKey, list] of byKey.entries()) {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const chosen = list.find((step) => step.schemaValidationPassed) ?? list[0];
    preferred.set(stepKey, {
      schemaValidationPassed: chosen.schemaValidationPassed,
      createdAt: chosen.createdAt,
    });
  }
  return preferred;
}

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
    const latestByStepKey = latestRun ? pickPreferredStepStates(latestRun.steps) : new Map<string, { schemaValidationPassed: boolean; createdAt: Date }>();
    const runStepsForComplete = [...latestByStepKey.entries()].map(([stepKey, v]) => ({
      stepKey,
      schemaValidationPassed: v.schemaValidationPassed,
    }));
    const allStepsDone = isRunProcessFullyComplete(configuredSteps, runStepsForComplete);
    const firstOpenStepIndex = configuredSteps.findIndex((cfg) => {
      const saved = latestByStepKey.get(cfg.stepKey);
      return !saved || !saved.schemaValidationPassed;
    });
    const hasOpenSteps = firstOpenStepIndex >= 0;
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
      phaseId,
    };
  });

  return (
    <div className="-my-10 max-md:-mx-6 max-md:w-[calc(100%+3rem)] max-md:max-w-[100vw] overflow-hidden py-2 md:mx-0 md:w-full md:py-4">
      <WorkflowAssistantFrame steps={steps} assistantTitle="KI-Analyse Assistent" />
    </div>
  );
}
