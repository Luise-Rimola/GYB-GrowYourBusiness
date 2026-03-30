import { getServerLocale } from "@/lib/locale";
import { ManualTabs } from "@/components/ManualTabs";

const COPY = {
  de: {
    title: "Handbuch",
    subtitle: "Überblick über Aufbau, Navigation und sinnvollen Ablauf in der App.",
    guideTab: "Handbuch",
    dictionaryTab: "Wörterbuch",
    dictionaryIntro:
      "Kurze Erklärungen wie im Grundlagenunterricht — ohne Fachjargon. So finden Sie Begriffe aus der App wieder.",
    appGoalTitle: "1) Ziel der App",
    appGoalBody:
      "Grow Your Business unterstützt Sie dabei, Unternehmensentscheidungen strukturiert zu treffen. Das System verbindet Unternehmensdaten, Dokumente, KPIs und KI-gestützte Auswertungen zu nachvollziehbaren Empfehlungen.",
    structureTitle: "2) Aufbau der App",
    structureItems: [
      "Start: zentrale Orientierung, wichtigste nächste Schritte.",
      "Prozesse: Ausführung der KI-Prozesse entlang der Phasen.",
      "Dokumente: erzeugte Ergebnisse prüfen, freigeben und evaluieren.",
      "KPIs: Kennzahlen, Lücken und KI-Analyse der Unternehmenslage.",
      "Wissensdatenbank: Quellen-Upload, Wissensobjekte, KPI-Daten und Maßnahmen.",
      "Fragebögen / Use-Case: Studien- und Evaluationsbereich.",
      "Einstellungen: LLM-API, Profil und Systemkonfiguration.",
    ],
    flowTitle: "3) Empfohlener Ablauf",
    flowItems: [
      "Unternehmensprofil ausfüllen und LLM-API in Einstellungen hinterlegen.",
      "Quellen/Dokumente in der Wissensdatenbank hochladen und verarbeiten.",
      "Prozesse je Phase ausführen.",
      "Dokumente prüfen und relevante Ergebnisse evaluieren.",
      "KPIs und Hinweise auswerten, Entscheidungen ableiten.",
      "Use-Case / Fragebögen für den strukturierten Vergleich nutzen.",
    ],
    tipsTitle: "4) Tipps für gute Ergebnisse",
    tipsItems: [
      "Mehr und bessere Daten führen zu präziseren KI-Antworten.",
      "Nach größeren Datenänderungen betroffene Prozesse erneut ausführen.",
      "Dokumente mit Evaluationen absichern, bevor Entscheidungen finalisiert werden.",
      "Bei Warnhinweisen zuerst Ursachen prüfen, dann Maßnahmen priorisieren.",
    ],
  },
  en: {
    title: "User Guide",
    subtitle: "Overview of app structure, navigation, and recommended workflow.",
    guideTab: "Guide",
    dictionaryTab: "Glossary",
    dictionaryIntro:
      "Short explanations in plain language — like a primer. Use it to look up terms used in the app.",
    appGoalTitle: "1) App objective",
    appGoalBody:
      "Grow Your Business helps you make structured business decisions. The system combines company data, documents, KPIs, and AI-supported analysis into transparent recommendations.",
    structureTitle: "2) App structure",
    structureItems: [
      "Home: central orientation and next steps.",
      "Processes: execute AI processes by phase.",
      "Documents: review, release, and evaluate generated outputs.",
      "KPIs: metrics, gaps, and integrated AI analysis.",
      "Knowledge Base: source upload, knowledge objects, KPI data, and actions.",
      "Questionnaires / Use Case: study and evaluation area.",
      "Settings: LLM API, profile, and system configuration.",
    ],
    flowTitle: "3) Recommended workflow",
    flowItems: [
      "Complete company profile and configure LLM API in settings.",
      "Upload/process sources in the knowledge base.",
      "Run processes per phase.",
      "Review documents and evaluate relevant outputs.",
      "Analyze KPIs/alerts and derive decisions.",
      "Use questionnaires/use case for structured comparison.",
    ],
    tipsTitle: "4) Tips for better results",
    tipsItems: [
      "More and better data improves answer quality.",
      "Re-run affected processes after major data changes.",
      "Validate documents through evaluation before final decisions.",
      "When warnings appear, inspect root causes before acting.",
    ],
  },
} as const;

export default async function ManualPage() {
  const locale = await getServerLocale();
  const c = locale === "de" ? COPY.de : COPY.en;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{c.title}</h1>
        <p className="mt-2 text-[var(--muted)]">{c.subtitle}</p>
      </header>

      <ManualTabs
        locale={locale === "de" ? "de" : "en"}
        guideTabLabel={c.guideTab}
        dictionaryTabLabel={c.dictionaryTab}
        dictionaryIntro={c.dictionaryIntro}
        guide={{
          appGoalTitle: c.appGoalTitle,
          appGoalBody: c.appGoalBody,
          structureTitle: c.structureTitle,
          structureItems: c.structureItems,
          flowTitle: c.flowTitle,
          flowItems: c.flowItems,
          tipsTitle: c.tipsTitle,
          tipsItems: c.tipsItems,
        }}
      />
    </div>
  );
}

