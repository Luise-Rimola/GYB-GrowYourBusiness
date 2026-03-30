import { prisma } from "@/lib/prisma";
import { WIZARD_WORKFLOW_ORDER } from "@/lib/planningFramework";
import { workflowSteps } from "@/lib/workflowSteps";
import { getWorkflowName } from "@/lib/workflows";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";

/**
 * Nächster Eintrag in WIZARD_WORKFLOW_ORDER: Ziel-URL für Navigation vom aktuellen Lauf.
 * Existiert noch kein Lauf für den nächsten Prozess, wird ein neuer Lauf angelegt (wie /api/runs/ensure)
 * und direkt verlinkt — nicht zur Dashboard-Prozessübersicht.
 */
export async function getNextWorkflowNavigation(
  companyId: string,
  currentWorkflowKey: string,
): Promise<{ href: string; label: string } | null> {
  const idx = WIZARD_WORKFLOW_ORDER.indexOf(currentWorkflowKey);
  if (idx < 0 || idx >= WIZARD_WORKFLOW_ORDER.length - 1) return null;

  const nextKey = WIZARD_WORKFLOW_ORDER[idx + 1];
  const label = getWorkflowName(nextKey);

  let nextRun = await prisma.run.findFirst({
    where: { companyId, workflowKey: nextKey },
    orderBy: { createdAt: "desc" },
    include: {
      steps: { select: { stepKey: true, schemaValidationPassed: true, createdAt: true } },
    },
  });

  if (!nextRun) {
    try {
      const contextPack = await ContextPackService.build(companyId, nextKey);
      const created = await WorkflowService.createRun(companyId, nextKey, contextPack);
      nextRun = await prisma.run.findUnique({
        where: { id: created.id },
        include: {
          steps: { select: { stepKey: true, schemaValidationPassed: true, createdAt: true } },
        },
      });
    } catch (e) {
      console.error("[getNextWorkflowNavigation] ensure run failed:", e);
      return { href: "/dashboard", label };
    }
  }

  if (!nextRun) {
    return { href: "/dashboard", label };
  }

  const configuredSteps = workflowSteps[nextKey] ?? [];
  const latestByStepKey = new Map<string, { schemaValidationPassed: boolean; createdAt: Date }>();
  for (const s of nextRun.steps) {
    const existing = latestByStepKey.get(s.stepKey);
    if (!existing || new Date(s.createdAt) > new Date(existing.createdAt)) {
      latestByStepKey.set(s.stepKey, {
        schemaValidationPassed: s.schemaValidationPassed,
        createdAt: s.createdAt,
      });
    }
  }
  const firstOpen = configuredSteps.findIndex((cfg) => {
    const saved = latestByStepKey.get(cfg.stepKey);
    return !saved || !saved.schemaValidationPassed;
  });
  const stepParam = firstOpen >= 0 ? firstOpen : 0;
  return { href: `/runs/${nextRun.id}?step=${stepParam}`, label };
}
