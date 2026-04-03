export type WorkflowStepStatus = "verified" | "saved" | "invalid" | "pending";

export function getWorkflowStepStatus(
  idx: number,
  stepsConfig: readonly { stepKey: string }[],
  runSteps: readonly { stepKey: string; verifiedByUser: boolean; schemaValidationPassed: boolean }[],
  opts?: {
    businessFormComplete?: boolean;
    kpiQuestionsComplete?: boolean;
  },
): WorkflowStepStatus {
  const cfg = stepsConfig[idx];
  if (!cfg) return "pending";
  const saved = runSteps.find((s) => s.stepKey === cfg.stepKey);
  const formComplete =
    (cfg.stepKey === "business_form" && opts?.businessFormComplete) ||
    (cfg.stepKey === "kpi_questions_answer" && opts?.kpiQuestionsComplete);
  const isFormStep = cfg.stepKey === "business_form" || cfg.stepKey === "kpi_questions_answer";
  if (isFormStep && formComplete) return "verified";
  if (saved?.verifiedByUser) return "verified";
  if (saved?.schemaValidationPassed) return "saved";
  if (saved && !saved.schemaValidationPassed) return "invalid";
  return "pending";
}
