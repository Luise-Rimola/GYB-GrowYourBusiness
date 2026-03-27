/**
 * Text-based corrections: Extract user corrections from text, apply to artifacts/run steps,
 * and classify impact (small = direct update, large = workflow rerun needed).
 */
import { prisma } from "@/lib/prisma";

export type CorrectionField =
  | "personnel_costs"
  | "rent"
  | "menu_cost"
  | "revenue"
  | "other";

export type CorrectionScope = "all_months" | "single_month" | "overall";

export type ChangeMagnitude = "small" | "large";

export interface ExtractedCorrection {
  field_key: CorrectionField;
  new_value: number;
  old_value?: number;
  month?: string;
  scope: CorrectionScope;
  change_magnitude: ChangeMagnitude;
  description?: string;
}

/** Which artifact types and workflow steps each field maps to */
const FIELD_TO_ARTIFACT: Record<
  CorrectionField,
  { artifactType: string; jsonPath: string; runStepKey?: string }[]
> = {
  personnel_costs: [
    { artifactType: "personnel_plan", jsonPath: "monthly_personnel_costs", runStepKey: "personnel_plan" },
  ],
  rent: [
    { artifactType: "real_estate", jsonPath: "options", runStepKey: undefined },
  ],
  menu_cost: [
    { artifactType: "menu_cost", jsonPath: "total_warenkosten", runStepKey: undefined },
  ],
  revenue: [
    { artifactType: "financial_planning", jsonPath: "monthly_projection", runStepKey: undefined },
  ],
  other: [],
};

/** Which workflows need rerun when an artifact type changes */
const ARTIFACT_TO_RERUN_WORKFLOWS: Record<string, string[]> = {
  personnel_plan: ["WF_FINANCIAL_PLANNING"],
  financial_planning: ["WF_BUSINESS_PLAN"],
  real_estate: ["WF_FINANCIAL_PLANNING", "WF_BUSINESS_PLAN"],
  menu_cost: ["WF_FINANCIAL_PLANNING", "WF_BUSINESS_PLAN"],
  business_plan: [],
};

const CORRECTION_EXTRACTION_PROMPT = `Extract from this German or English text. Return BOTH:
1) kpis: KPI values (revenue, customers, etc.) – same format as before
2) actions: Business measures (Maßnahmen) – same format as before
3) corrections: User CORRECTIONS/OVERrides – when they say something like "X ist/sind Y, aber ich denke es wird Z" or "ändern von Y auf Z" or "sollte Z sein statt Y".

For corrections, each item must have:
- field_key: "personnel_costs"|"rent"|"menu_cost"|"revenue"|"other" (Personalkosten→personnel_costs, Miete→rent, Warenkosten→menu_cost, Umsatz→revenue)
- new_value: number (the corrected value)
- old_value: number if mentioned, else omit
- month: "YYYY-MM" ONLY if user explicitly names a month (e.g. "Monat 3", "März 2024"), else omit
- scope: "all_months" if value applies to all months (e.g. "Personalkosten 4000"), "single_month" if month given, "overall" for totals
- change_magnitude: "small" if single value change in one area, "large" if multiple values or structural (e.g. personnel_costs cascades to financial plans)
- description: short German description

Examples:
"Personalkosten sind 7000, ich denke es werden 4000" → corrections: [{field_key:"personnel_costs", new_value:4000, old_value:7000, scope:"all_months", change_magnitude:"large"}]
"Miete von 2000 auf 1500 reduzieren" → corrections: [{field_key:"rent", new_value:1500, old_value:2000, scope:"overall", change_magnitude:"small"}]

Return ONLY valid JSON: { "kpis": [...], "actions": [...], "corrections": [...] }`;

export const TextCorrectionService = {
  /**
   * Extract corrections from text via LLM.
   */
  async extractCorrections(
    text: string,
    companyId: string
  ): Promise<ExtractedCorrection[]> {
    const settings = await prisma.companySettings.findUnique({ where: { companyId } });
    const apiUrl = settings?.llmApiUrl?.trim();
    const apiKey = settings?.llmApiKey?.trim();
    const model = settings?.llmModel?.trim() || "gpt-4o-mini";
    if (!apiUrl) return [];

    const baseUrl = apiUrl.replace(/\/$/, "");
    const chatUrl = baseUrl.includes("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: `${CORRECTION_EXTRACTION_PROMPT}\n\nText:\n${text.slice(0, 8000)}` }],
        temperature: 0.2,
      }),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as { corrections?: ExtractedCorrection[] };
    const corrections = parsed.corrections ?? [];
    return corrections.filter(
      (c) =>
        c.field_key &&
        typeof c.new_value === "number" &&
        ["personnel_costs", "rent", "menu_cost", "revenue", "other"].includes(String(c.field_key))
    );
  },

  /**
   * Apply corrections to artifacts and run steps. Returns what was updated and whether rerun is needed.
   */
  async applyCorrections(
    companyId: string,
    corrections: ExtractedCorrection[]
  ): Promise<{
    applied: { artifactType: string; artifactId: string; changes: string[] }[];
    needsRerun: boolean;
    recommendedWorkflows: string[];
  }> {
    const applied: { artifactType: string; artifactId: string; changes: string[] }[] = [];
    const workflowsToRerun = new Set<string>();

    for (const corr of corrections) {
      const mappings = FIELD_TO_ARTIFACT[corr.field_key as CorrectionField] ?? FIELD_TO_ARTIFACT.other;
      if (mappings.length === 0) continue;

      for (const { artifactType, jsonPath, runStepKey } of mappings) {
        const artifacts = await prisma.artifact.findMany({
          where: { companyId, type: artifactType as import("@prisma/client").ArtifactType },
          orderBy: { createdAt: "desc" },
          take: 1,
        });
        const artifact = artifacts[0];
        if (!artifact) continue;

        const content = (artifact.contentJson ?? {}) as Record<string, unknown>;
        const updated = this.applyCorrectionToContent(content, jsonPath, corr);
        if (!updated.changed) continue;

        await prisma.artifact.update({
          where: { id: artifact.id },
          data: { contentJson: updated.content as object },
        });
        applied.push({
          artifactType,
          artifactId: artifact.id,
          changes: updated.changes,
        });

        const wfs = ARTIFACT_TO_RERUN_WORKFLOWS[artifactType];
        if (wfs) wfs.forEach((w) => workflowsToRerun.add(w));

        if (artifact.runId && runStepKey) {
          const step = await prisma.runStep.findFirst({
            where: { runId: artifact.runId, stepKey: runStepKey },
            orderBy: { createdAt: "desc" },
          });
          if (step?.parsedOutputJson) {
            const stepContent = step.parsedOutputJson as Record<string, unknown>;
            const stepUpdated = this.applyCorrectionToContent(stepContent, jsonPath, corr);
            if (stepUpdated.changed) {
              await prisma.runStep.update({
                where: { id: step.id },
                data: { parsedOutputJson: stepUpdated.content as object },
              });
            }
          }
        }
      }
    }

    return {
      applied,
      needsRerun: workflowsToRerun.size > 0,
      recommendedWorkflows: Array.from(workflowsToRerun),
    };
  },

  applyCorrectionToContent(
    content: Record<string, unknown>,
    jsonPath: string,
    corr: ExtractedCorrection
  ): { content: Record<string, unknown>; changed: boolean; changes: string[] } {
    const changes: string[] = [];
    const out = JSON.parse(JSON.stringify(content)) as Record<string, unknown>;

    if (jsonPath === "monthly_personnel_costs" && corr.field_key === "personnel_costs") {
      const arr = (out.monthly_personnel_costs ?? []) as Array<{ month?: string; total_personnel_eur?: number }>;
      if (!Array.isArray(arr) || arr.length === 0) return { content: out, changed: false, changes: [] };

      const monthFilter = corr.month ? (m: { month?: string }) => m.month === corr.month : () => true;
      let any = false;
      for (let i = 0; i < arr.length; i++) {
        if (monthFilter(arr[i])) {
          arr[i] = { ...arr[i], total_personnel_eur: corr.new_value };
          any = true;
          changes.push(`${arr[i].month ?? i + 1}: ${corr.new_value} €`);
        }
      }
      if (any) out.monthly_personnel_costs = arr;
      return { content: out, changed: any, changes };
    }

    if (jsonPath === "total_warenkosten" && corr.field_key === "menu_cost") {
      out.total_warenkosten = corr.new_value;
      changes.push(`Warenkosten: ${corr.new_value} €`);
      return { content: out, changed: true, changes };
    }

    if (jsonPath === "options" && corr.field_key === "rent") {
      const opts = (out.options ?? []) as Array<{ price_range?: string }>;
      if (Array.isArray(opts) && opts.length > 0) {
        opts[0] = { ...opts[0], price_range: `${corr.new_value} €/Monat` };
        out.options = opts;
        changes.push(`Miete: ${corr.new_value} €`);
        return { content: out, changed: true, changes };
      }
    }

    return { content: out, changed: false, changes: [] };
  },

  /**
   * Classify overall impact: small = only direct updates, large = rerun recommended.
   */
  classifyImpact(corrections: ExtractedCorrection[]): ChangeMagnitude {
    const hasLarge = corrections.some((c) => c.change_magnitude === "large");
    const multipleFields = new Set(corrections.map((c) => c.field_key)).size > 1;
    return hasLarge || multipleFields ? "large" : "small";
  },
};
