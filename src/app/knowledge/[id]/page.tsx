import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Section } from "@/components/Section";
import { Badge } from "@/components/Badge";
import { ReadableDataView } from "@/components/ReadableDataView";
import { AdvancedJson } from "@/components/AdvancedJson";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";

export default async function KnowledgeObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const obj = await prisma.knowledgeObject.findUnique({
    where: { id },
    include: { source: true },
  });

  if (!obj) notFound();

  const allDecisions = await prisma.decision.findMany({ take: 100 });
  const decisionsUsing = allDecisions.filter((d) => {
    const ev = d.evidenceJson as Record<string, string[]>;
    return ev?.knowledge_object_ids?.includes(id);
  }).slice(0, 10);

  const contradictions = await prisma.knowledgeContradiction.findMany({
    where: {
      OR: [{ knowledgeObjectIdA: id }, { knowledgeObjectIdB: id }],
    },
  });

  return (
    <div className="space-y-8">
      <Section
        title={obj.title}
        description={`${obj.type} · Grade ${obj.evidenceGrade} · ${obj.status}`}
        actions={<Badge label={`${obj.evidenceGrade} · ${obj.status}`} tone={obj.status === "active" ? "success" : "neutral"} />}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t.knowledge.content}</p>
            <ReadableDataView data={obj.contentJson} summary={t.data.viewData} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t.knowledge.evidenceScore}</p>
            <ReadableDataView data={obj.evidenceScoreJson} summary={t.data.viewData} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{t.knowledge.source}</p>
            <Link href="#" className="text-sm text-zinc-600 hover:underline dark:text-zinc-300">
              {obj.source.title}
            </Link>
            {obj.source.url && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{obj.source.url}</p>
            )}
          </div>
        </div>
      </Section>

      <Section title={t.knowledge.relatedDecisions} description={t.knowledge.relatedDecisionsDesc}>
        {decisionsUsing.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.knowledge.noneYet}</p>
        ) : (
          <div className="space-y-2">
            {decisionsUsing.map((d) => (
              <Link
                key={d.id}
                href={`/decisions/${d.id}`}
                className="block rounded-lg border border-zinc-200 p-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                {d.title}
              </Link>
            ))}
          </div>
        )}
      </Section>

      {contradictions.length > 0 && (
        <Section title="Contradictions" description="Conflicting knowledge objects.">
          <div className="space-y-2">
            {contradictions.map((c) => (
              <div key={c.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="font-semibold text-amber-800 dark:text-amber-200">{c.reason}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">{c.severity}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Advanced" description="Rohdaten (JSON).">
        <AdvancedJson data={{ content: obj.contentJson, evidence: obj.evidenceScoreJson }} title="Advanced" summary="Rohdaten (JSON)" />
      </Section>
    </div>
  );
}
