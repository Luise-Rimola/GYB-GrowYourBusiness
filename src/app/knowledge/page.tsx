import Link from "next/link";
import { redirect } from "next/navigation";

function isRedirectError(err: unknown): boolean {
  return err != null && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { Section } from "@/components/Section";
import { Badge } from "@/components/Badge";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { ProcessSourceButton } from "@/components/ProcessSourceButton";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { KnowledgeService } from "@/services/knowledge";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { WORKFLOW_NAMES } from "@/lib/planningFramework";

async function deletePhysicalFile(url: string | null) {
  if (!url?.startsWith("/uploads/")) return;
  const { unlink } = await import("fs/promises");
  const { join } = await import("path");
  const filepath = join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    await unlink(filepath);
  } catch {
    // ignore if file missing
  }
}

async function deleteKbSourceWithObjects(formData: FormData) {
  "use server";
  const sourceId = String(formData.get("sourceId") || "").trim();
  if (!sourceId) return;

  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  await prisma.$transaction(async (tx) => {
    const kbSource = await tx.knowledgeSource.findUnique({ where: { sourceId } });
    if (!kbSource) return;

    const objects = await tx.knowledgeObject.findMany({ where: { sourceId } });
    const objectIds = objects.map((o) => o.id);

    if (objectIds.length > 0) {
      await tx.knowledgeContradiction.deleteMany({
        where: {
          OR: [
            { knowledgeObjectIdA: { in: objectIds } },
            { knowledgeObjectIdB: { in: objectIds } },
          ],
        },
      });
      await tx.benchmark.deleteMany({ where: { sourceId } });
      await tx.knowledgeObject.deleteMany({ where: { sourceId } });
    }
    await tx.knowledgeChunk.deleteMany({ where: { sourceId } });
    await tx.knowledgeSource.delete({ where: { sourceId } });
    await tx.source.delete({ where: { id: sourceId } });
  });
  await deletePhysicalFile(source?.url ?? null);
  redirect("/knowledge");
}

async function deleteKbSourceWithoutObjects(formData: FormData) {
  "use server";
  const sourceId = String(formData.get("sourceId") || "").trim();
  if (!sourceId) return;

  const source = await prisma.source.findUnique({ where: { id: sourceId } });

  let orphan = await prisma.source.findFirst({ where: { title: "__ORPHAN__" } });
  if (!orphan) {
    orphan = await prisma.source.create({
      data: { type: "internal", title: "__ORPHAN__", url: null },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.knowledgeObject.updateMany({
      where: { sourceId },
      data: { sourceId: orphan!.id },
    });
    await tx.knowledgeChunk.deleteMany({ where: { sourceId } });
    const kb = await tx.knowledgeSource.findUnique({ where: { sourceId } });
    if (kb) await tx.knowledgeSource.delete({ where: { sourceId } });
    await tx.source.delete({ where: { id: sourceId } });
  });
  await deletePhysicalFile(source?.url ?? null);
  redirect("/knowledge");
}

async function addKbSourceFromFile(formData: FormData) {
  "use server";
  const file = formData.get("file") as File | null;
  const type = String(formData.get("type") || "report");
  if (!file || file.size === 0) return;

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeTitle = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "document";
  const id = `up${Date.now().toString(36)}`;

  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = `${id}.${ext}`;
  const filepath = join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const source = await prisma.source.create({
    data: {
      type: type as "report" | "paper" | "internal",
      title: safeTitle,
      url: `/uploads/${filename}`,
    },
  });
  await prisma.knowledgeSource.create({
    data: { sourceId: source.id, ingestionStatus: "new" },
  });
  redirect("/knowledge");
}

async function approveObject(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.knowledgeObject.update({
    where: { id },
    data: { status: "active" },
  });
  redirect("/knowledge");
}

async function deprecateObject(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.knowledgeObject.update({
    where: { id },
    data: { status: "deprecated" },
  });
  redirect("/knowledge");
}

async function deleteKpiValue(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.kpiValue.delete({ where: { id } });
  redirect("/knowledge");
}

async function deleteMarketingAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;
  if ("marketingAction" in prisma) {
    await prisma.marketingAction.delete({ where: { id } });
  }
  redirect("/knowledge");
}

async function deleteKnowledgeObject(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    await tx.knowledgeContradiction.deleteMany({
      where: {
        OR: [{ knowledgeObjectIdA: id }, { knowledgeObjectIdB: id }],
      },
    });
    await tx.benchmark.deleteMany({ where: { knowledgeObjectId: id } });
    await tx.knowledgeObject.delete({ where: { id } });
  });
  redirect("/knowledge");
}

async function publishVersion(formData: FormData) {
  "use server";
  const label = String(formData.get("label") || `v${Date.now()}`).trim();
  await KnowledgeService.publishVersion(label);
  redirect("/knowledge");
}

async function processSource(formData: FormData) {
  "use server";
  const sourceId = String(formData.get("sourceId") || "").trim();
  if (!sourceId) return;
  const company = await getOrCreateDemoCompany();
  try {
    const result = await KnowledgeService.processSource(sourceId, company.id);
    if (result.error) {
      redirect(`/knowledge?error=${encodeURIComponent(result.error)}`);
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    redirect(`/knowledge?error=${encodeURIComponent(msg)}`);
  }
  redirect("/knowledge");
}

async function deleteTextExtractionBatch(formData: FormData) {
  "use server";
  const batchId = String(formData.get("batchId") || "").trim();
  if (!batchId) return;
  const company = await getOrCreateDemoCompany();

  const [kpiValues, marketingActions] = await Promise.all([
    prisma.kpiValue.findMany({ where: { companyId: company.id } }),
    "marketingAction" in prisma ? prisma.marketingAction.findMany({ where: { companyId: company.id } }) : Promise.resolve([]),
  ]);
  const kpiToDelete = kpiValues.filter((k) => (k.sourceRefJson as { batchId?: string })?.batchId === batchId);
  const actionToDelete = marketingActions.filter((m) => (m.sourceRefJson as { batchId?: string })?.batchId === batchId);

  await prisma.kpiValue.deleteMany({ where: { id: { in: kpiToDelete.map((k) => k.id) } } });
  if (actionToDelete.length > 0 && "marketingAction" in prisma) {
    await prisma.marketingAction.deleteMany({ where: { id: { in: actionToDelete.map((a) => a.id) } } });
  }
  redirect("/knowledge");
}

async function processTextUpdate(formData: FormData) {
  "use server";
  const text = String(formData.get("text") || "").trim();
  if (!text || text.length < 10) return;
  const company = await getOrCreateDemoCompany();
  try {
    const result = await KnowledgeService.processTextUpdate(text, company.id);
    if (result.error) {
      redirect(`/knowledge?error=${encodeURIComponent(result.error)}`);
    }
    const batchParam = result.batchId ? `&batch=${encodeURIComponent(result.batchId)}` : "";
    const appliedParam = result.correctionsApplied?.length ? `&applied=${encodeURIComponent(JSON.stringify(result.correctionsApplied))}` : "";
    const rerunParam = result.needsRerun ? `&needsRerun=1` : "";
    const workflowsParam = result.recommendedWorkflows?.length ? `&workflows=${encodeURIComponent(result.recommendedWorkflows.join(","))}` : "";
    redirect(
      `/knowledge?updated=${result.kpisCreated ?? 0}-${result.actionsCreated ?? 0}${batchParam}${appliedParam}${rerunParam}${workflowsParam}`
    );
  } catch (err) {
    if (isRedirectError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    redirect(`/knowledge?error=${encodeURIComponent(msg)}`);
  }
}

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  personnel_plan: "Personalplan",
  financial_planning: "Finanzplanung",
  real_estate: "Immobilien",
  menu_cost: "Warenkosten",
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string; batch?: string; applied?: string; needsRerun?: string; workflows?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const params = await searchParams;
  const errorMsg = params.error ? decodeURIComponent(params.error) : null;
  const updatedMsg = params.updated ? (() => {
    const [k, a] = params.updated!.split("-").map(Number);
    return t.knowledge.textUpdateSuccess?.replace("{kpis}", String(k ?? 0)).replace("{actions}", String(a ?? 0)) ?? `${k ?? 0} KPIs, ${a ?? 0} Maßnahmen extrahiert.`;
  })() : null;
  let appliedData: { artifactType: string; artifactId: string; changes: string[] }[] = [];
  try {
    if (params.applied) appliedData = JSON.parse(decodeURIComponent(params.applied)) as typeof appliedData;
  } catch {
    /* ignore */
  }
  const needsRerun = params.needsRerun === "1";
  const workflowKeys = params.workflows ? params.workflows.split(",").filter(Boolean) : [];

  const company = await getOrCreateDemoCompany();
  const [sourcesRaw, objects, versions, contradictions, kpiValues, marketingActions] = await Promise.all([
    prisma.knowledgeSource.findMany({ include: { source: true } }),
    prisma.knowledgeObject.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.knowledgeVersion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.knowledgeContradiction.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.kpiValue.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }),
    "marketingAction" in prisma ? prisma.marketingAction.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  const sources = sourcesRaw.filter((s) => s.source.title !== "__ORPHAN__");

  const textInputKpis = kpiValues.filter((k) => (k.sourceRefJson as { type?: string })?.type === "text_input");
  const textInputActions = marketingActions.filter((m) => (m.sourceRefJson as { type?: string })?.type === "text_input");
  const batchMap = new Map<string, { preview: string; kpis: typeof textInputKpis; actions: typeof textInputActions; createdAt: Date }>();
  for (const k of textInputKpis) {
    const ref = k.sourceRefJson as { batchId?: string; inputPreview?: string };
    if (ref?.batchId) {
      const existing = batchMap.get(ref.batchId);
      if (existing) existing.kpis.push(k);
      else batchMap.set(ref.batchId, { preview: ref.inputPreview ?? "", kpis: [k], actions: [], createdAt: k.createdAt });
    }
  }
  for (const a of textInputActions) {
    const ref = a.sourceRefJson as { batchId?: string; inputPreview?: string };
    if (ref?.batchId) {
      const existing = batchMap.get(ref.batchId);
      if (existing) existing.actions.push(a);
      else batchMap.set(ref.batchId, { preview: ref.inputPreview ?? "", kpis: [], actions: [a], createdAt: a.createdAt });
    }
  }
  const recentBatches = Array.from(batchMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {errorMsg && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200">
          <strong>{t.knowledge.processError}:</strong> {errorMsg}
        </div>
      )}
      {updatedMsg && (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            {updatedMsg}
          </div>
          {appliedData.length > 0 && (
            <div className="rounded-xl border border-teal-300 bg-teal-50 p-4 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200">
              <p className="font-medium">
                {t.knowledge.correctionsApplied
                  ?.replace("{count}", String(appliedData.length))
                  ?.replace("{changes}", appliedData.map((a) => `${ARTIFACT_TYPE_LABELS[a.artifactType] ?? a.artifactType}: ${a.changes.join(", ")}`).join("; ")) ?? `Korrekturen in ${appliedData.length} Artefakt(en) übernommen.`}
              </p>
            </div>
          )}
          {needsRerun && workflowKeys.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="mb-2 font-medium">{t.knowledge.needsRerun}</p>
              <ul className="mb-3 list-inside list-disc space-y-1">
                {workflowKeys.map((key) => (
                  <li key={key}>{WORKFLOW_NAMES[key] ?? key}</li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
              >
                {t.knowledge.rerunWorkflows}
              </Link>
            </div>
          )}
        </div>
      )}
      {recentBatches.length > 0 && (
        <Section title={t.knowledge.recentExtractions} description={t.knowledge.recentExtractionsDesc}>
          <div className="space-y-2">
            {recentBatches.map((batch) => (
              <div key={batch.id} className="flex items-center justify-between rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {batch.preview || "—"}…
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {batch.kpis.length} KPIs, {batch.actions.length} Maßnahmen · {new Date(batch.createdAt).toLocaleString("de-DE")}
                  </p>
                </div>
                <ConfirmDeleteForm action={deleteTextExtractionBatch} confirmMessage={t.knowledge.deleteBatchConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                  <input type="hidden" name="batchId" value={batch.id} />
                  <button type="submit" className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">
                    {t.common.delete}
                  </button>
                </ConfirmDeleteForm>
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section title={t.knowledge.sourcesQueue} description={t.knowledge.sourcesQueueDesc}>
        <form action={addKbSourceFromFile} className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <input
            name="file"
            type="file"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
            className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-800 dark:file:bg-zinc-700 dark:file:text-zinc-200"
            required
          />
          <select
            name="type"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="report">Report</option>
            <option value="paper">Paper</option>
            <option value="internal">Internal</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            {t.knowledge.uploadDocument}
          </button>
        </form>
        <form action={processTextUpdate} className="mb-4 rounded-xl border border-dashed border-teal-300 p-4 dark:border-teal-800">
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.knowledge.textUpdateLabel}</p>
          <VoiceTextarea
            name="text"
            rows={4}
            placeholder={t.knowledge.textUpdatePlaceholder}
            className="mb-3 w-full rounded-xl border border-zinc-200 px-3 py-2 pr-14 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
          <button
            type="submit"
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            {t.knowledge.textUpdateSubmit}
          </button>
        </form>
        <div className="space-y-3">
          {sources.map((source) => (
            <div key={source.id} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {source.source.title}
                </p>
                <div className="flex items-center gap-2">
                  <Badge label={source.ingestionStatus} />
                  {source.source.url?.startsWith("/uploads/") && source.ingestionStatus === "new" && (
                    <form action={processSource}>
                      <input type="hidden" name="sourceId" value={source.source.id} />
                      <ProcessSourceButton label={t.knowledge.process} />
                    </form>
                  )}
                  <div className="flex items-center gap-1">
                    <ConfirmDeleteForm
                      action={deleteKbSourceWithoutObjects}
                      confirmMessage={t.knowledge.deleteSourceKeepObjectsConfirm}
                      title={t.common.confirmTitle}
                      cancelLabel={t.common.cancel}
                      confirmLabel={t.common.delete}
                    >
                      <input type="hidden" name="sourceId" value={source.source.id} />
                      <button
                        type="submit"
                        title={t.knowledge.deleteSourceKeepObjects}
                        className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                      >
                        {t.knowledge.deleteSourceKeepObjects}
                      </button>
                    </ConfirmDeleteForm>
                    <ConfirmDeleteForm
                      action={deleteKbSourceWithObjects}
                      confirmMessage={t.knowledge.deleteSourceWithObjectsConfirm}
                      title={t.common.confirmTitle}
                      cancelLabel={t.common.cancel}
                      confirmLabel={t.common.delete}
                    >
                      <input type="hidden" name="sourceId" value={source.source.id} />
                      <button
                        type="submit"
                        title={t.knowledge.deleteSourceWithObjects}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                      >
                        {t.knowledge.deleteSourceWithObjects}
                      </button>
                    </ConfirmDeleteForm>
                  </div>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{source.source.url ?? "—"}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t.knowledge.knowledgeObjects} description={t.knowledge.knowledgeObjectsDesc}>
        <div className="space-y-3">
          {objects.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.knowledge.noObjects}</p>
          ) : (
            <>
              {objects.slice(0, 3).map((obj) => (
              <div key={obj.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex-1">
                  <Link href={`/knowledge/${obj.id}`} className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
                    {obj.title}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{obj.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={`${obj.evidenceGrade} · ${obj.status}`} />
                  {obj.status === "draft" && (
                    <form action={approveObject}>
                      <input type="hidden" name="id" value={obj.id} />
                      <button type="submit" className="rounded-lg border border-emerald-600 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                        {t.knowledge.approve}
                      </button>
                    </form>
                  )}
                  {obj.status === "active" && (
                    <form action={deprecateObject}>
                      <input type="hidden" name="id" value={obj.id} />
                      <button type="submit" className="rounded-lg border border-amber-600 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                        {t.knowledge.deprecate}
                      </button>
                    </form>
                  )}
                  <ConfirmDeleteForm
                    action={deleteKnowledgeObject}
                    confirmMessage={t.knowledge.deleteObjectConfirm}
                    title={t.common.confirmTitle}
                    cancelLabel={t.common.cancel}
                    confirmLabel={t.common.delete}
                  >
                    <input type="hidden" name="id" value={obj.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                    >
                      {t.common.delete}
                    </button>
                  </ConfirmDeleteForm>
                </div>
              </div>
            ))}
            {objects.length > 3 && (
              <details className="group">
                <summary className="cursor-pointer list-none rounded-xl border border-dashed border-zinc-300 p-3 text-center text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900/50">
                  {t.knowledge.showMore} ({objects.length - 3} {t.knowledge.moreItems})
                </summary>
                <div className="mt-3 space-y-3">
                  {objects.slice(3).map((obj) => (
              <div key={obj.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex-1">
                  <Link href={`/knowledge/${obj.id}`} className="text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50">
                    {obj.title}
                  </Link>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{obj.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={`${obj.evidenceGrade} · ${obj.status}`} />
                  {obj.status === "draft" && (
                    <form action={approveObject}>
                      <input type="hidden" name="id" value={obj.id} />
                      <button type="submit" className="rounded-lg border border-emerald-600 px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                        {t.knowledge.approve}
                      </button>
                    </form>
                  )}
                  {obj.status === "active" && (
                    <form action={deprecateObject}>
                      <input type="hidden" name="id" value={obj.id} />
                      <button type="submit" className="rounded-lg border border-amber-600 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                        {t.knowledge.deprecate}
                      </button>
                    </form>
                  )}
                  <ConfirmDeleteForm
                    action={deleteKnowledgeObject}
                    confirmMessage={t.knowledge.deleteObjectConfirm}
                    title={t.common.confirmTitle}
                    cancelLabel={t.common.cancel}
                    confirmLabel={t.common.delete}
                  >
                    <input type="hidden" name="id" value={obj.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                    >
                      {t.common.delete}
                    </button>
                  </ConfirmDeleteForm>
                </div>
              </div>
            ))}
                </div>
              </details>
            )}
            </>
          )}
        </div>
      </Section>

      <Section title={t.knowledge.kpiUpdateData} description={t.knowledge.kpiUpdateDataDesc}>
        <div className="space-y-3">
          {kpiValues.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.knowledge.noKpiData}</p>
          ) : (
            (() => {
              const sorted = [...kpiValues].sort((a, b) => new Date(b.periodEnd ?? b.createdAt).getTime() - new Date(a.periodEnd ?? a.createdAt).getTime());
              return (
                <>
                  {sorted.slice(0, 3).map((kv) => (
                    <div key={kv.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">{kv.kpiKey}: {kv.value}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {kv.periodEnd ? new Date(kv.periodEnd).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" }) : "—"} · {(kv.sourceRefJson as { type?: string })?.type ?? "—"}
                        </p>
                      </div>
                      <ConfirmDeleteForm action={deleteKpiValue} confirmMessage={t.knowledge.deleteKpiValueConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                        <input type="hidden" name="id" value={kv.id} />
                        <button type="submit" className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">{t.common.delete}</button>
                      </ConfirmDeleteForm>
                    </div>
                  ))}
                  {sorted.length > 3 && (
                    <details className="group">
                      <summary className="cursor-pointer list-none rounded-xl border border-dashed border-zinc-300 p-3 text-center text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900/50">
                        {t.knowledge.showMore} ({sorted.length - 3} {t.knowledge.moreItems})
                      </summary>
                      <div className="mt-3 space-y-3">
                        {sorted.slice(3).map((kv) => (
                          <div key={kv.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">{kv.kpiKey}: {kv.value}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {kv.periodEnd ? new Date(kv.periodEnd).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" }) : "—"} · {(kv.sourceRefJson as { type?: string })?.type ?? "—"}
                              </p>
                            </div>
                            <ConfirmDeleteForm action={deleteKpiValue} confirmMessage={t.knowledge.deleteKpiValueConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                              <input type="hidden" name="id" value={kv.id} />
                              <button type="submit" className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">{t.common.delete}</button>
                            </ConfirmDeleteForm>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              );
            })()
          )}
        </div>
      </Section>

      <Section title={t.knowledge.measuresList} description={t.knowledge.measuresListDesc}>
        <div className="space-y-3">
          {marketingActions.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.knowledge.noMeasures}</p>
          ) : (
            (() => {
              const sorted = [...marketingActions].sort((a, b) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime());
              return (
                <>
                  {sorted.slice(0, 3).map((ma) => (
                    <div key={ma.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">{ma.description}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(ma.actionDate).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" })} · {ma.category ?? "—"}
                        </p>
                      </div>
                      <ConfirmDeleteForm action={deleteMarketingAction} confirmMessage={t.knowledge.deleteMeasureConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                        <input type="hidden" name="id" value={ma.id} />
                        <button type="submit" className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">{t.common.delete}</button>
                      </ConfirmDeleteForm>
                    </div>
                  ))}
                  {sorted.length > 3 && (
                    <details className="group">
                      <summary className="cursor-pointer list-none rounded-xl border border-dashed border-zinc-300 p-3 text-center text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900/50">
                        {t.knowledge.showMore} ({sorted.length - 3} {t.knowledge.moreItems})
                      </summary>
                      <div className="mt-3 space-y-3">
                        {sorted.slice(3).map((ma) => (
                          <div key={ma.id} className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-50">{ma.description}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {new Date(ma.actionDate).toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "numeric" })} · {ma.category ?? "—"}
                              </p>
                            </div>
                            <ConfirmDeleteForm action={deleteMarketingAction} confirmMessage={t.knowledge.deleteMeasureConfirm} title={t.common.confirmTitle} cancelLabel={t.common.cancel} confirmLabel={t.common.delete}>
                              <input type="hidden" name="id" value={ma.id} />
                              <button type="submit" className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300">{t.common.delete}</button>
                            </ConfirmDeleteForm>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              );
            })()
          )}
        </div>
      </Section>

      <Section title={t.knowledge.contradictions} description={t.knowledge.contradictionsDesc}>
        <div className="space-y-3">
          {contradictions.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">{item.reason}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {item.knowledgeObjectIdA} ↔ {item.knowledgeObjectIdB}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Knowledge Versions" description="Published snapshots with rollback support.">
        <form action={publishVersion} className="mb-4 flex gap-3">
          <input
            name="label"
            placeholder="Version label (e.g. v1.0)"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            {t.knowledge.publishVersion}
          </button>
        </form>
        <div className="space-y-3">
          {versions.map((version) => (
            <div key={version.id} className="rounded-2xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{version.versionLabel}</p>
                <Badge label={version.status} tone={version.status === "active" ? "success" : "neutral"} />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
