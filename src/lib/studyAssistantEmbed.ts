import type { ScenarioCategory } from "@/lib/scenarios";
import { STUDY_CATEGORY_PHASE_ID, workflowDashboardHrefForCategory } from "@/lib/assistantSteps";
import { VALID_STUDY_CATEGORIES } from "@/lib/studyCategoryContext";

/** Dashboard (Pläne) nach FB2 im Assistenten — ohne Zwischenseite „Studie“. */
export function dashboardUrlAfterFb2Assistant(category: string): string {
  const raw = workflowDashboardHrefForCategory(category as ScenarioCategory);
  const [pathPart, hash] = raw.split("#", 2);
  const url = new URL(pathPart, "http://localhost");
  url.searchParams.set("embed", "1");
  url.searchParams.set("assistantContinue", "fb2");
  const q = `${url.pathname}${url.search}`;
  return hash ? `${q}#${hash}` : q;
}

/** Dokumente-Phase nach FB3 im Assistenten. */
export function artifactsUrlAfterFb3Assistant(category: string): string {
  const phase = STUDY_CATEGORY_PHASE_ID[category as ScenarioCategory];
  return `/artifacts?embed=1&assistantContinue=fb3#artifacts-phase-${phase}`;
}

/** Nächster Schritt nach FB4 (nächster Bereich oder Entscheidungen). */
export function urlAfterFb4Assistant(category: string): string {
  const idx = VALID_STUDY_CATEGORIES.indexOf(category as ScenarioCategory);
  if (idx < 0 || idx >= VALID_STUDY_CATEGORIES.length - 1) {
    return `/decisions?embed=1&assistantContinue=fb4`;
  }
  const next = VALID_STUDY_CATEGORIES[idx + 1];
  return `/study/info/${next}?embed=1&assistantContinue=fb4`;
}
