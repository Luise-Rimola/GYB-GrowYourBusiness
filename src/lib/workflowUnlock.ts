/** Wenn `UNLOCK_ALL_WORKFLOWS=1`, sind UI-Sperren für Workflows aus (nur für Demo/Entwicklung). */
export function unlockAllWorkflowsFromEnv(): boolean {
  return process.env.UNLOCK_ALL_WORKFLOWS === "1";
}
