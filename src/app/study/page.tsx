import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { getOrCreateStudyParticipant } from "@/lib/study";
import { getServerLocale } from "@/lib/locale";
import { getTranslations } from "@/lib/i18n";
import { Section } from "@/components/Section";
import StudyStartTabs from "@/components/StudyStartTabs";
import { SCENARIO_CATEGORIES, type ScenarioCategory } from "@/lib/scenarios";
import { workflowDashboardHrefForCategory } from "@/lib/assistantSteps";
import {
  CF_ITEMS,
  CL_ITEMS,
  COMP_ITEMS,
  DQ_ITEMS,
  EV_ITEMS,
  FIT_ITEMS,
  GOV_ITEMS,
  TAM_UTAUT_ITEMS,
  TR_ITEMS,
  US_ITEMS,
} from "@/lib/fragebogenScales";

const STUDY_FLOW_CATEGORIES: ScenarioCategory[] = [
  "markt_geschaeftsmodell",
  "produktstrategie",
  "marketing",
  "wachstum_expansion",
  "investition_strategie",
];

/** FB2 & FB3: nur gemeinsame Kernskalen (DQ, EV, TR, CF, CL) — Vergleich/US/TAM/COMP stehen in FB4. */
const FB2_FB3_TABLE_COLUMNS = [
  ...DQ_ITEMS.map((i) => i.key),
  ...EV_ITEMS.map((i) => i.key),
  ...TR_ITEMS.map((i) => i.key),
  ...CF_ITEMS.map((i) => i.key),
  ...CL_ITEMS.map((i) => i.key),
] as const;

/** FB4 Direktvergleich: nur Likert (Freitexte im Reiter „Offene Fragen“). */
const FB4_LIKERT_COMPARE_COLUMNS = [
  ...US_ITEMS.map((i) => i.key),
  ...TAM_UTAUT_ITEMS.map((i) => i.key),
  ...COMP_ITEMS.map((i) => i.key),
  ...FIT_ITEMS.map((i) => i.key),
  ...GOV_ITEMS.map((i) => i.key),
] as const;

const FB1_DISPLAY_KEYS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "B1",
  "B2",
  "B3",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "D1",
  "D2",
  "D3",
  "D4",
] as const;

const FB5_DISPLAY_KEYS = ["X1", "X2", "X3", "X4", "X5", "T1", "T2", "T3", "T4"] as const;

/** Offene Felder nebeneinander: FB2/3 (je O1–O3), FB4 (O1–O3 + Interview I1–I5). */
const OPEN_TEXT_COMPARE_SPECS = [
  ...(["O1", "O2", "O3"] as const).map((key) => ({ fb: "fb2" as const, key })),
  ...(["O1", "O2", "O3"] as const).map((key) => ({ fb: "fb3" as const, key })),
  ...(["O1", "O2", "O3"] as const).map((key) => ({ fb: "fb4" as const, key })),
  ...(["I1", "I2", "I3", "I4", "I5"] as const).map((key) => ({ fb: "fb4" as const, key })),
] as const;

/** Phasenzeilen für Tabellen (immer verfügbar, nicht nur innerhalb von StudyPage). */
const PHASE_CATEGORY_MAP = STUDY_FLOW_CATEGORIES.map((category) => ({
  phase: SCENARIO_CATEGORIES[category],
  category,
}));

function flattenQuestionnaireValues(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const visit = (v: unknown) => {
    if (v === null || v === undefined) return;
    if (typeof v === "number" && Number.isFinite(v)) {
      return;
    }
    if (typeof v === "string") {
      return;
    }
    if (Array.isArray(v)) {
      for (const it of v) visit(it);
      return;
    }
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (/^[A-Z]{1,4}\d+$/.test(k) || /^O\d+$/.test(k) || /^E\d+$/.test(k) || /^T\d+$/.test(k)) {
          if (typeof val === "number" && Number.isFinite(val)) out[k] = String(val);
          else if (typeof val === "string" && val.trim()) out[k] = val.trim();
          else out[k] = "—";
        } else {
          visit(val);
        }
      }
    }
  };
  visit(input);
  return out;
}

function averageOf(flat: Record<string, string>, keys: string[]) {
  const nums = keys
    .map((k) => Number(flat[k]))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return "—";
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return avg.toFixed(2);
}

function truncateOpenText(s: string, max = 96) {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function fb1Label(t: ReturnType<typeof getTranslations>, key: string): string {
  const s = (t.study as Record<string, string>)[`fb1${key}`];
  return s ?? key;
}

function fb5Label(t: ReturnType<typeof getTranslations>, key: string): string {
  const s = (t.study as Record<string, string>)[`fb5${key}`];
  return s ?? key;
}

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; category?: string }>;
}) {
  const company = await getOrCreateDemoCompany();
  const participant = await getOrCreateStudyParticipant(company.id);
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getTranslations(locale);
  const isEn = locale === "en";
  const researchQuestions = [
    "Welche technischen und konzeptionellen Anforderungen müssen erfüllt sein, um ein KI-gestütztes Business-Intelligence-System für Unternehmen zu entwickeln?",
    "Welche Faktoren und Indikatoren lassen sich für eine KI-gestützte Analyse systematisch identifizieren, um Frühwarnsignale für strategische Fehlentscheidungen in Unternehmen zu erkennen?",
    "Inwiefern verbessert ein KI-gestützter, regel- und datenbasierter LLM-Workflow die wahrgenommene Qualität strategischer Entscheidungen in der Markteintritts- und Wachstumsphase (z. B. Entscheidungsqualität, Transparenz/Nachvollziehbarkeit, Planungssicherheit, Geschwindigkeit) im Vergleich zu einem Vorgehen ohne KI-Unterstützung?",
    "Inwiefern sind Unternehmen bereit, KI-gestützte Systeme zur strategischen Entscheidungsunterstützung einzusetzen, und welche wahrgenommenen Risiken und Hemmnisse beeinflussen die Nutzung?",
  ] as const;

  const [questionnaireRows, runs, artifactCount] = await Promise.all([
    loadStudyQuestionnaireRows(participant.id),
    prisma.run.findMany({ where: { companyId: company.id }, select: { status: true } }),
    prisma.artifact.count({ where: { companyId: company.id } }),
  ]);

  /** Pro Kategorie: Häkchen aus gespeicherten Responses (nicht nur globale StudyParticipant-Flags). */
  const fb2DoneByCategory = new Set<string>();
  const fb3DoneByCategory = new Set<string>();
  const fb4DoneByCategory = new Set<string>();
  for (const r of questionnaireRows) {
    if (!r.category) continue;
    if (r.questionnaireType === "fb2") fb2DoneByCategory.add(r.category);
    if (r.questionnaireType === "fb3") fb3DoneByCategory.add(r.category);
    if (r.questionnaireType === "fb4") fb4DoneByCategory.add(r.category);
  }

  const allFb4Done =
    STUDY_FLOW_CATEGORIES.length > 0 &&
    STUDY_FLOW_CATEGORIES.every((c) => fb4DoneByCategory.has(c));

  const hasFb5Response = questionnaireRows.some((r) => r.questionnaireType === "fb5");

  const fb1Row = questionnaireRows.find((r) => r.questionnaireType === "fb1" && r.category == null);
  const fb5Row = questionnaireRows.find((r) => r.questionnaireType === "fb5" && r.category == null);
  const fb1Flat = fb1Row ? flattenQuestionnaireValues(fb1Row.responsesJson) : {};
  const fb5Flat = fb5Row ? flattenQuestionnaireValues(fb5Row.responsesJson) : {};

  const completed = {
    fb1: participant.completedFb1,
    llm: Boolean((participant as { completedLlmSetup?: boolean }).completedLlmSetup),
    /** Fallback: alte globale FB2 ohne Kategorie */
    fb2: participant.completedFb2BeforeRuns || fb2DoneByCategory.size > 0,
    /** Fallback: alte globale FB3 ohne Kategorie */
    fb3: participant.completedFb3AfterRuns || fb3DoneByCategory.size > 0,
    fb4: allFb4Done,
    fb5: Boolean((participant as { completedFb5?: boolean }).completedFb5) || hasFb5Response,
  };

  const phaseBlocks = [
    {
      title: t.study.studyPhaseConfigTitle,
      items: [
        {
          label: t.study.studyFb1Btn,
          href: "/study/fb1",
          completed: completed.fb1,
        },
      ],
    },
    ...STUDY_FLOW_CATEGORIES.map((cat) => ({
      title: SCENARIO_CATEGORIES[cat],
      infoHref: `/study/info/${cat}`,
      items: [
        {
          label: t.study.studyFb2Btn,
          href: `/study/fb2/${cat}`,
          completed: fb2DoneByCategory.has(cat),
        },
        {
          label: t.study.studyFb3Btn,
          href: `/study/fb3/${cat}`,
          completed: fb3DoneByCategory.has(cat),
        },
        {
          label: t.study.studyFb4Btn,
          href: `/study/fb4/${cat}`,
          completed: fb4DoneByCategory.has(cat),
        },
      ],
    })),
    {
      title: t.study.studyFb5PhaseTitle,
      items: [
        {
          label: t.study.studyFb5Btn,
          href: "/study/fb5",
          completed: completed.fb5,
        },
      ],
    },
  ];

  const flowContent = (
    <div className="space-y-6">
      {phaseBlocks.map((phase) => (
        <div key={phase.title} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{phase.title}</h3>
          <div className="mt-4 space-y-3">
            {phase.items.map((it) => (
              <div key={it.href + it.label} className="flex items-center gap-3">
                {it.completed ? (
                  <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">
                    —
                  </span>
                )}
                <Link
                  href={it.href}
                  className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium transition hover:border-teal-300 hover:bg-teal-50/50"
                >
                  {it.label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const dataContent = (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">{t.study.studyDataTabDesc}</p>
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.study.studyTablePhase}</th>
              {FB2_FB3_TABLE_COLUMNS.map((col) => (
                <th key={col} className="px-3 py-3 text-left font-semibold text-[var(--foreground)]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PHASE_CATEGORY_MAP.flatMap(({ phase, category }) => {
              const rows = [
                { type: "fb2" as const, actorLabel: t.study.studyTableActorUser },
                { type: "fb3" as const, actorLabel: t.study.studyTableActorTool },
              ];
              return rows.map(({ type, actorLabel }) => {
                const row = questionnaireRows.find(
                  (r) => r.questionnaireType === type && r.category === category
                );
                const flat = row ? flattenQuestionnaireValues(row.responsesJson) : {};
                const rowHref = `/study/${type}/${category}`;
                return (
                  <tr key={`${phase}-${type}-${category}`} className="border-b border-[var(--card-border)] hover:bg-[var(--background)]/50">
                    <td className="px-4 py-3">
                      <Link href={rowHref} className="font-medium text-teal-700 underline decoration-transparent hover:decoration-current">
                        {phase} ({actorLabel})
                      </Link>
                    </td>
                    {FB2_FB3_TABLE_COLUMNS.map((col) => (
                      <td key={col} className="px-3 py-3 text-[var(--muted)]">
                        {flat[col] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const analysisContent = (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">{t.study.studyAnalysisTabDesc}</p>
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.study.studyTablePhase}</th>
              <th className="px-3 py-3 text-left font-semibold text-[var(--foreground)]">DQ</th>
              <th className="px-3 py-3 text-left font-semibold text-[var(--foreground)]">EV</th>
              <th className="px-3 py-3 text-left font-semibold text-[var(--foreground)]">TR</th>
              <th className="px-3 py-3 text-left font-semibold text-[var(--foreground)]">CF</th>
              <th className="px-3 py-3 text-left font-semibold text-[var(--foreground)]">CL</th>
            </tr>
          </thead>
          <tbody>
            {PHASE_CATEGORY_MAP.flatMap(({ phase, category }) => {
              const rows = [
                { type: "fb2" as const, actorLabel: t.study.studyTableActorUser },
                { type: "fb3" as const, actorLabel: t.study.studyTableActorTool },
              ];
              return rows.map(({ type, actorLabel }) => {
                const row = questionnaireRows.find(
                  (r) => r.questionnaireType === type && r.category === category
                );
                const flat = row ? flattenQuestionnaireValues(row.responsesJson) : {};
                const rowHref = `/study/${type}/${category}`;

                const dq = averageOf(flat, ["DQ1", "DQ2", "DQ3", "DQ4"]);
                const ev = averageOf(flat, ["EV1", "EV2", "EV3", "EV4"]);
                const tr = averageOf(flat, ["TR1", "TR2", "TR3"]);
                const cf = averageOf(flat, ["CF1", "CF2", "CF3"]);
                const cl = averageOf(flat, ["CL1", "CL2", "CL3"]);

                return (
                  <tr key={`analysis-${phase}-${type}-${category}`} className="border-b border-[var(--card-border)] hover:bg-[var(--background)]/50">
                    <td className="px-4 py-3">
                      <Link href={rowHref} className="font-medium text-teal-700 underline decoration-transparent hover:decoration-current">
                        {phase} ({actorLabel})
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)]">{dq}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{ev}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{tr}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{cf}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{cl}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const compareContent = (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">{t.study.studyCompareTabDesc}</p>
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
              <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">{t.study.studyTableHeaderPhaseFb4}</th>
              {FB4_LIKERT_COMPARE_COLUMNS.map((col) => (
                <th key={col} className="min-w-[3rem] px-2 py-3 text-left text-xs font-semibold text-[var(--foreground)]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PHASE_CATEGORY_MAP.map(({ phase, category }) => {
              const row = questionnaireRows.find((r) => r.questionnaireType === "fb4" && r.category === category);
              const flat = row ? flattenQuestionnaireValues(row.responsesJson) : {};
              return (
                <tr key={`compare-fb4-${category}`} className="border-b border-[var(--card-border)] hover:bg-[var(--background)]/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/study/fb4/${category}`}
                      className="font-medium text-teal-700 underline decoration-transparent hover:decoration-current"
                    >
                      {phase} — {t.study.studyFb4Btn}
                    </Link>
                  </td>
                  {FB4_LIKERT_COMPARE_COLUMNS.map((col) => (
                    <td key={col} className="px-2 py-2 align-top text-xs text-[var(--muted)]">
                      {flat[col] ?? "—"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const fb1Fb5Content = (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">{t.study.studyFb1Fb5TabDesc}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--card-border)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{t.study.studyFb1Btn}</h3>
            <Link href="/study/fb1" className="text-xs font-medium text-teal-700 hover:underline">
              →
            </Link>
          </div>
          <dl className="space-y-3 text-sm">
            {FB1_DISPLAY_KEYS.map((k) => (
              <div key={k} className="border-b border-[var(--card-border)] pb-3 last:border-0 last:pb-0">
                <dt className="text-xs text-[var(--muted)]">{fb1Label(t, k)}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">{fb1Flat[k] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">{t.study.studyFb5Btn}</h3>
            <Link href="/study/fb5" className="text-xs font-medium text-teal-700 hover:underline">
              →
            </Link>
          </div>
          <dl className="space-y-3 text-sm">
            {FB5_DISPLAY_KEYS.map((k) => (
              <div key={k} className="border-b border-[var(--card-border)] pb-3 last:border-0 last:pb-0">
                <dt className="text-xs text-[var(--muted)]">{fb5Label(t, k)}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-[var(--foreground)]">{fb5Flat[k] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );

  const openTextCompareContent = (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted)]">{t.study.studyOpenTextTabDesc}</p>
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="w-full min-w-[72rem] text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
              <th className="sticky left-0 z-[1] min-w-[10rem] bg-[var(--background)] px-3 py-3 text-left font-semibold text-[var(--foreground)]">
                {t.study.studyOpenTextPhaseCol}
              </th>
              {OPEN_TEXT_COMPARE_SPECS.map(({ fb, key }) => (
                <th
                  key={`${fb}-${key}`}
                  className="min-w-[7rem] px-2 py-3 text-left text-xs font-semibold text-[var(--foreground)]"
                >
                  {fb === "fb2" ? "FB2" : fb === "fb3" ? "FB3" : "FB4"} {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PHASE_CATEGORY_MAP.map(({ phase, category }) => {
              const r2 = questionnaireRows.find((r) => r.questionnaireType === "fb2" && r.category === category);
              const r3 = questionnaireRows.find((r) => r.questionnaireType === "fb3" && r.category === category);
              const r4 = questionnaireRows.find((r) => r.questionnaireType === "fb4" && r.category === category);
              const f2 = r2 ? flattenQuestionnaireValues(r2.responsesJson) : {};
              const f3 = r3 ? flattenQuestionnaireValues(r3.responsesJson) : {};
              const f4 = r4 ? flattenQuestionnaireValues(r4.responsesJson) : {};
              return (
                <tr key={`open-${category}`} className="border-b border-[var(--card-border)] hover:bg-[var(--background)]/50">
                  <td className="sticky left-0 z-[1] bg-[var(--card)] px-3 py-2 align-top font-medium text-[var(--foreground)]">
                    {phase}
                  </td>
                  {OPEN_TEXT_COMPARE_SPECS.map(({ fb, key }) => {
                    const flat = fb === "fb2" ? f2 : fb === "fb3" ? f3 : f4;
                    const raw = flat[key] ?? "—";
                    const isEmpty = raw === "—" || raw.trim() === "";
                    const display = isEmpty ? "—" : truncateOpenText(raw);
                    return (
                      <td
                        key={`${category}-${fb}-${key}`}
                        className="max-w-[14rem] px-2 py-2 align-top text-xs text-[var(--muted)]"
                        title={!isEmpty ? raw : undefined}
                      >
                        {isEmpty ? "—" : display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {t.nav.study}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Dieser Bereich dokumentiert den Studienablauf, die Fragebogenantworten sowie den Vergleich zwischen Entscheidungen mit und ohne KI-Unterstützung.
        </p>
        <details className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--foreground)]">
            Forschungsfragen anzeigen
          </summary>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
            {researchQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </details>
      </header>

      {params.saved === "1" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb1Saved}
        </div>
      )}
      {params.saved === "fb2" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb2Saved}
        </div>
      )}
      {params.saved === "fb3" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb3Saved}
        </div>
      )}
      {params.saved === "fb4" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.studyFb4Saved}
          {params.category && (
            <span className="ml-1 text-[var(--muted)]">
              {" "}
              ({t.study.studyFb4SavedCategorySuffix}{" "}
              {SCENARIO_CATEGORIES[params.category as ScenarioCategory] ?? params.category})
            </span>
          )}
        </div>
      )}
      {params.saved === "fb5" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.fb5Saved}
        </div>
      )}
      {params.saved === "llm" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {t.study.studyLlmSaved}
        </div>
      )}

      <Section title="" description="">
        <StudyStartTabs
          flowLabel={t.study.studyTabFlowLabel}
          dataLabel={t.study.studyTabDataLabel}
          analysisLabel={t.study.studyTabAnalysisLabel}
          compareLabel={t.study.studyTabCompareLabel}
          fb1Fb5Label={t.study.studyTabFb1Fb5}
          openTextCompareLabel={t.study.studyTabOpenText}
          flowContent={flowContent}
          dataContent={dataContent}
          analysisContent={analysisContent}
          compareContent={compareContent}
          fb1Fb5Content={fb1Fb5Content}
          openTextCompareContent={openTextCompareContent}
        />

        <div className="mt-6 border-t border-[var(--card-border)] pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/study/export"
                download="study-export.csv"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-6 py-3 text-sm font-medium transition hover:bg-[var(--background)]"
              >
                {t.study.studyExportCsv} (SPSS)
              </a>
              {isEn ? (
                <a
                  href="/api/export?scope=study&format=pdf&lang=en"
                  download="study-export-en.pdf"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-6 py-3 text-sm font-medium transition hover:bg-[var(--background)]"
                >
                  PDF Download (EN)
                </a>
              ) : (
                <a
                  href="/api/export?scope=study&format=pdf&lang=de"
                  download="study-export-de.pdf"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-6 py-3 text-sm font-medium transition hover:bg-[var(--background)]"
                >
                  PDF Download (DE)
                </a>
              )}
              <a
                href={`/api/export?scope=study&format=excel&lang=${locale}`}
                download="study-export.xls"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--card-border)] px-6 py-3 text-sm font-medium transition hover:bg-[var(--background)]"
              >
                {isEn ? "Excel (Tables + Logs)" : "Excel (Tabellen + Logs)"}
              </a>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <p className="text-xs font-medium text-[var(--muted)]">
                {isEn ? "Continue to evaluation of" : "Weiter zur Evaluation von"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/artifacts"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {isEn ? "Artifacts" : "Artefakten"}
                </Link>
                <Link
                  href="/evaluation"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {isEn ? "Use cases" : "Use Cases"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

async function loadStudyQuestionnaireRows(participantId: string): Promise<
  Array<{
    questionnaireType: string;
    category: string | null;
    responsesJson: unknown;
    createdAt: Date;
  }>
> {
  const delegate = (prisma as any).questionnaireResponse;
  if (delegate?.findMany) {
    return delegate.findMany({
      where: {
        participantId,
        OR: [
          {
            questionnaireType: { in: ["fb2", "fb3", "fb4"] },
            category: { not: null },
          },
          {
            questionnaireType: { in: ["fb1", "fb5"] },
            category: null,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        questionnaireType: true,
        category: true,
        responsesJson: true,
        createdAt: true,
      },
    });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      questionnaireType: string;
      category: string | null;
      responsesJson: unknown;
      createdAt: Date | string;
    }>
  >`
    SELECT questionnaireType, category, responsesJson, createdAt
    FROM QuestionnaireResponse
    WHERE participantId = ${participantId}
      AND (
        (questionnaireType IN ('fb2','fb3','fb4') AND category IS NOT NULL)
        OR (questionnaireType IN ('fb1','fb5') AND category IS NULL)
      )
    ORDER BY createdAt DESC
  `;

  return rows.map((r) => ({
    questionnaireType: r.questionnaireType,
    category: r.category,
    responsesJson: r.responsesJson,
    createdAt: r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
  }));
}
