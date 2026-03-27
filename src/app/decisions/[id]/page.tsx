import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { ReadableDataView } from "@/components/ReadableDataView";
import { AdvancedJson } from "@/components/AdvancedJson";
import { Badge } from "@/components/Badge";

async function createExperiment(formData: FormData) {
  "use server";
  const decisionId = String(formData.get("decision_id"));
  const hypothesis = String(formData.get("hypothesis") || "").trim();
  const design = String(formData.get("design") || "").trim();
  if (!decisionId || !hypothesis) return;
  const decision = await prisma.decision.findUnique({ where: { id: decisionId } });
  if (!decision) return;
  await prisma.experiment.create({
    data: {
      companyId: decision.companyId,
      decisionId,
      hypothesis,
      design,
      status: "planned",
      successCriteriaJson: {},
      stopGoJson: {},
    },
  });
  redirect(`/decisions/${decisionId}`);
}

async function updateDecisionStatus(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!id || !status) return;
  const valid = ["proposed", "approved", "in_progress", "evaluating", "scaled", "stopped"];
  if (!valid.includes(status)) return;
  await prisma.decision.update({
    where: { id },
    data: { status: status as "proposed" | "approved" | "in_progress" | "evaluating" | "scaled" | "stopped" },
  });
  redirect(`/decisions/${id}`);
}

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decision = await prisma.decision.findUnique({
    where: { id },
    include: { run: { include: { artifacts: true } } },
  });

  if (!decision) {
    notFound();
  }

  const evidence = decision.evidenceJson as Record<string, string[]>;
  const djson = decision.decisionJson as Record<string, unknown>;
  const founderSummary = djson?.founder_simple_summary as string | undefined;
  const executionPlan = djson?.experiment_plan ?? null;
  const decisionPackArtifact = decision.run?.artifacts?.find((a) => a.type === "decision_pack");
  const packContent = decisionPackArtifact?.contentJson as { execution_plan_30_60_90?: Record<string, unknown> } | null;
  const plan30_60_90 = packContent?.execution_plan_30_60_90 ?? executionPlan ?? {};
  const experiments = await prisma.experiment.findMany({
    where: { decisionId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <Section
        title={decision.title}
        description={decision.decisionKey}
        actions={
          <div className="flex items-center gap-2">
            <Badge label={decision.status} tone={decision.status === "approved" ? "success" : "warning"} />
            <form action={updateDecisionStatus} className="flex gap-2">
              <input type="hidden" name="id" value={decision.id} />
              <select name="status" defaultValue={decision.status} className="rounded-lg border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                <option value="proposed">Proposed</option>
                <option value="approved">Approved</option>
                <option value="in_progress">In progress</option>
                <option value="evaluating">Evaluating</option>
                <option value="scaled">Scaled</option>
                <option value="stopped">Stopped</option>
              </select>
              <button type="submit" className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800">
                Update
              </button>
            </form>
          </div>
        }
      >
        {founderSummary && (
          <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
            {founderSummary}
          </p>
        )}
        <ReadableDataView data={decision.decisionJson} summary="View data" />
      </Section>

      <Section
        title="Why this?"
        description="Full transparency on KPIs, benchmarks, assumptions, and scoring."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">KPIs Used</p>
              <ReadableDataView data={evidence?.kpi_keys ?? []} summary="View data" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Benchmarks</p>
              <ReadableDataView data={evidence?.source_ids ?? []} summary="View data" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Assumptions</p>
              <ReadableDataView data={(decision.decisionJson as Record<string, unknown>)?.assumptions ?? []} summary="View data" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Knowledge Objects</p>
              <ReadableDataView data={evidence?.knowledge_object_ids ?? []} summary="View data" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Artifacts</p>
              <ReadableDataView data={evidence?.artifact_ids ?? []} summary="View data" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Scoring Breakdown</p>
              <ReadableDataView data={decision.scoringJson} summary="View data" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Audit Links</p>
              {decision.runId ? (
                <Link href={`/runs/${decision.runId}`} className="mt-2 inline-block rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                  View Run Audit →
                </Link>
              ) : (
                <ReadableDataView data={{ run_id: decision.runId }} summary="View data" />
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section title="30/60/90 Execution Plan" description="Tasks and milestones.">
        {Object.keys(plan30_60_90).length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No execution plan in decision pack.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(plan30_60_90).map(([key, val]) => (
              <div key={key} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{key}</p>
                <pre className="mt-2 overflow-x-auto text-xs text-zinc-600 dark:text-zinc-300">
                  {typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Experiments" description="Track hypothesis and results.">
        {experiments.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No experiments yet.</p>
        ) : (
          <div className="space-y-3">
            {experiments.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{exp.hypothesis}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{exp.status}</p>
              </div>
            ))}
          </div>
        )}
        <form action={createExperiment} className="mt-4 flex flex-wrap gap-3">
          <input type="hidden" name="decision_id" value={decision.id} />
          <input name="hypothesis" placeholder="Hypothesis" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" required />
          <input name="design" placeholder="Design" className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950" />
          <button type="submit" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">Add Experiment</button>
        </form>
      </Section>

      <Section title="Advanced" description="Rohdaten (JSON).">
        <AdvancedJson
          title="Advanced"
          summary="Rohdaten (JSON)"
          data={{
            decision: decision.decisionJson,
            scoring: decision.scoringJson,
            evidence: decision.evidenceJson,
          }}
        />
      </Section>
    </div>
  );
}
