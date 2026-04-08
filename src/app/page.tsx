import Link from "next/link";
import { getSessionSafe } from "@/lib/session";

const landingCopy = {
  de: {
    heroTitle: "Grow Your Business",
    heroSubtitle:
      "AI-Powered Growth System für Strategie, Priorisierung und Umsetzung. Du bekommst klare Phasen, verständliche Workflows und belastbare Ergebnisse.",
    ctaPrimary: "Kostenlos starten",
    ctaContinue: "Weiter zur App",
    trust1: "Strukturierte Entscheidungsvorlagen",
    trust2: "Transparente KPI- und Quellenlogik",
    trust3: "Auditierbare Ergebnisse für Teams",
    flowTitle: "So funktioniert der Ablauf",
    flowSubtitle: "Ein klarer End-to-End-Prozess für bessere Entscheidungen.",
    whyTitle: "Warum Grow Your Business",
    whySubtitle:
      "Entwickelt für Teams, die schnell entscheiden müssen und trotzdem Qualität brauchen.",
    securityTitle: "Datensicherheit",
    securitySubtitle:
      "Deine Daten werden geschützt verarbeitet. Du kontrollierst jederzeit, was verwendet wird.",
    securityPoints: [
      "Daten werden abgesichert verarbeitet und nur für den gewählten Zweck genutzt.",
      "Übertragungen können anonymisiert erfolgen, damit keine unnötigen Personenbezüge geteilt werden.",
      "Du entscheidest selbst, welche Daten ins System einfließen und was ausgeschlossen bleibt.",
      "Ganz unverbindlich starten: erst testen, dann bei Bedarf schrittweise erweitern.",
    ],
    finalTitle: "Bereit für bessere Entscheidungen?",
    finalSubtitle:
      "Melde dich an und starte direkt im internen Home-Bereich mit Workflows, Entscheidungen und Dokumenten.",
    finalPrimary: "Jetzt registrieren",
    langSwitch: "Sprache",
    phases: [
      {
        title: "Intake & Kontext",
        text: "Firma, Ziele, KPI-Basis und Marktannahmen werden strukturiert erfasst.",
      },
      {
        title: "Analyse & Workflow",
        text: "Workflows führen dich Schritt für Schritt durch belastbare Entscheidungslogik.",
      },
      {
        title: "Entscheidung & Umsetzung",
        text: "Empfehlungen, Dokumente und Audit-Trail machen jede Entscheidung nachvollziehbar.",
      },
    ],
    features: [
      {
        title: "Guided Decision Engine",
        text: "Von der Problemdefinition bis zur Entscheidung mit klarer Methodik und weniger Bauchgefühl.",
      },
      {
        title: "KPI- und Quellenklarheit",
        text: "Datenpunkte, Herleitung und Unsicherheiten bleiben transparent und revisierbar.",
      },
      {
        title: "Dokumente mit Substanz",
        text: "Business-relevante Ergebnisse statt nur Chat-Text: strukturierte Outputs für Team und Umsetzung.",
      },
      {
        title: "Auditierbarer Verlauf",
        text: "Runs, Schritte und Entscheidungen bleiben versioniert und jederzeit nachvollziehbar.",
      },
    ],
  },
  en: {
    heroTitle: "Grow Your Business",
    heroSubtitle:
      "AI-Powered Growth System for strategy, prioritization, and execution. Get clear phases, understandable workflows, and actionable outputs.",
    ctaPrimary: "Start free",
    ctaContinue: "Continue to app",
    trust1: "Structured decision templates",
    trust2: "Transparent KPI and source logic",
    trust3: "Auditable outcomes for teams",
    flowTitle: "How the process works",
    flowSubtitle: "A clear end-to-end process for better decisions.",
    whyTitle: "Why Grow Your Business",
    whySubtitle: "Built for teams that must move fast without sacrificing quality.",
    securityTitle: "Data Security",
    securitySubtitle:
      "Your data is handled securely. You stay in control of what is used.",
    securityPoints: [
      "Data is processed securely and only used for the selected purpose.",
      "Transfers can be anonymized to avoid sharing unnecessary personal references.",
      "You decide which data is included and what stays excluded.",
      "Start with no commitment: test first, then expand step by step when needed.",
    ],
    finalTitle: "Ready for better decisions?",
    finalSubtitle:
      "Sign in and continue in your internal home area with workflows, decisions, and artifacts.",
    finalPrimary: "Create account",
    langSwitch: "Language",
    phases: [
      {
        title: "Intake & Context",
        text: "Capture company goals, KPI baseline, and market assumptions in a structured way.",
      },
      {
        title: "Analysis & Workflow",
        text: "Guided workflows lead you step by step through robust decision logic.",
      },
      {
        title: "Decision & Execution",
        text: "Recommendations, artifacts, and audit trail keep every decision transparent.",
      },
    ],
    features: [
      {
        title: "Guided Decision Engine",
        text: "From problem framing to final choice with clear method and less gut-feeling risk.",
      },
      {
        title: "KPI and source clarity",
        text: "Data points, rationale, and uncertainty remain transparent and reviewable.",
      },
      {
        title: "Actionable artifacts",
        text: "Business-ready outputs instead of raw chat text for teams and execution.",
      },
      {
        title: "Auditable history",
        text: "Runs, steps, and decisions stay versioned and fully traceable.",
      },
    ],
  },
} as const;

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const locale = params.lang === "en" ? "en" : "de";
  const c = landingCopy[locale];
  const session =
    process.env.DEV_AUTH_BYPASS === "1" ? { email: "dev@local" } : await getSessionSafe();
  const isAuthed = Boolean(session?.email);

  return (
    <div className="flex flex-col gap-14">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-8 shadow-sm dark:from-teal-950/30 dark:via-[var(--card)] dark:to-cyan-950/20 md:p-12">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-700/20" />
        <div className="absolute -bottom-24 left-20 h-52 w-52 rounded-full bg-cyan-200/40 blur-3xl dark:bg-cyan-700/20" />
        <div className="relative">
          <div className="mb-3 flex justify-end">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-white/80 px-2 py-1 text-xs dark:bg-[var(--card)]">
              <span className="text-[var(--muted)]">{c.langSwitch}:</span>
              <Link href="/?lang=de" className={locale === "de" ? "font-semibold text-teal-700" : "text-[var(--muted)] hover:text-teal-700"}>DE</Link>
              <span className="text-[var(--muted)]">|</span>
              <Link href="/?lang=en" className={locale === "en" ? "font-semibold text-teal-700" : "text-[var(--muted)] hover:text-teal-700"}>EN</Link>
            </div>
          </div>
          <p className="mb-4 inline-flex rounded-full border border-teal-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:border-teal-700 dark:bg-teal-950/30 dark:text-teal-300">
            AI-Powered Growth System
          </p>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">
            {c.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            {c.heroSubtitle}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {isAuthed ? (
              <Link
                href="/home"
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-700"
              >
                {c.ctaContinue}
              </Link>
            ) : (
              <Link
                href="/register"
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-teal-700"
              >
                {c.ctaPrimary}
              </Link>
            )}
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50 px-4 py-3 shadow-sm dark:border-teal-800 dark:from-[var(--card)] dark:to-teal-950/20">
              <p className="text-sm font-medium text-[var(--foreground)]">{c.trust1}</p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50 px-4 py-3 shadow-sm dark:border-teal-800 dark:from-[var(--card)] dark:to-teal-950/20">
              <p className="text-sm font-medium text-[var(--foreground)]">{c.trust2}</p>
            </div>
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-white to-teal-50 px-4 py-3 shadow-sm dark:border-teal-800 dark:from-[var(--card)] dark:to-teal-950/20">
              <p className="text-sm font-medium text-[var(--foreground)]">{c.trust3}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">{c.flowTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {c.flowSubtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {c.phases.map((phase, idx) => (
            <article
              key={phase.title}
              className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                {idx + 1}
              </div>
              <div className="min-w-0 w-full">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">{phase.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{phase.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">{c.whyTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {c.whySubtitle}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {c.features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm"
            >
              <h3 className="text-base font-semibold text-[var(--foreground)]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-[var(--foreground)]">{c.securityTitle}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">{c.securitySubtitle}</p>
        <ul className="mt-4 space-y-2 text-sm text-[var(--foreground)]">
          {c.securityPoints.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-teal-500" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-sm md:p-10">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--foreground)]">{c.finalTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              {c.finalSubtitle}
            </p>
          </div>
          <div className="flex gap-3">
            {isAuthed ? (
              <Link
                href="/home"
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {c.ctaContinue}
              </Link>
            ) : (
              <Link
                href="/register"
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {c.finalPrimary}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
