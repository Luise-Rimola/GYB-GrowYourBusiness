/**
 * Gleiche Logik wie im Workflow-Assistenten (/assistant/workflows):
 * Ein Lauf gilt als vollständig, wenn für jeden konfigurierten Schritt
 * der bevorzugte sichtbare Stand `schemaValidationPassed` hat
 * (letzte gültige Antwort, sonst letzter Versuch).
 */
export function isRunProcessFullyComplete(
  configuredSteps: { stepKey: string }[],
  runStepsLatest: Array<{ stepKey: string; schemaValidationPassed: boolean }>,
): boolean {
  if (configuredSteps.length === 0) return false;
  const byKey = new Map(runStepsLatest.map((s) => [s.stepKey, s]));
  return configuredSteps.every((cfg) => byKey.get(cfg.stepKey)?.schemaValidationPassed === true);
}
