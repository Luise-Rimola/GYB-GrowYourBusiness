import { getServerLocale } from "@/lib/locale";
import { ManualTabs } from "@/components/ManualTabs";
import { EVALUATION_FF_MAP_ROWS } from "@/lib/manualResearchMapping";

const COPY = {
  de: {
    title: "Handbuch",
    subtitle:
      "Dieses Handbuch erklärt die App so, dass auch neue Nutzerinnen und Nutzer ohne Vorwissen verstehen, was sie in jedem Bereich sehen, warum dieser Bereich wichtig ist und wie er im Arbeitsalltag sinnvoll genutzt wird. Zusätzliche Reiter: Konzept & Anforderungen, Evaluation, Tech Stack und App-Dokumentation für Studie, Architektur und Repository.",
    guideTab: "Überblick",
    conceptTabLabel: "Konzept & Anforderungen",
    evaluationTabLabel: "Evaluation",
    dictionaryTab: "Wörterbuch",
    dictionaryIntro:
      "Kurze Erklärungen wie im Grundlagenunterricht — ohne Fachjargon. So finden Sie Begriffe aus der App wieder.",
    appGoalTitle: "1) Ziel der App",
    appGoalBody:
      "Grow Your Business unterstützt Sie dabei, geschäftliche Entscheidungen nicht aus dem Bauch heraus, sondern strukturiert, nachvollziehbar und auf Basis Ihrer Unternehmensdaten zu treffen. Die App verbindet dafür mehrere Bausteine miteinander, darunter Profilinformationen, Dokumente, Kennzahlen, prozessbasierte Arbeitsschritte und KI-gestützte Auswertungen, damit aus verstreuten Informationen ein klares Gesamtbild mit begründbaren Handlungsempfehlungen entsteht.",
    structureTitle: "2) Aufbau der App",
    structureEntries: [
      {
        title: "Homepage",
        body: "Die Homepage ist die öffentliche Einstiegsseite, auf der neue Nutzerinnen und Nutzer zuerst landen und von dort direkt zur Anmeldung geführt werden. Sie erklärt den Nutzen der Plattform in verständlicher Form, zeigt den Zweck der App und hilft dabei, ohne Vorwissen zu verstehen, warum man sich einloggen sollte und was danach möglich ist.",
      },
      {
        title: "Start",
        body: "Die Startseite nach dem Login zeigt den praktischen Ablauf der App als geführte Schrittfolge durch Studie und Arbeitsprozess. Dort sehen Sie, welche Schritte bereits erledigt sind, welche als Nächstes kommen und an welchen Stellen die Fragebögen zwischen den Prozessschritten eingebunden sind, um die Nutzung der App systematisch zu evaluieren.",
      },
      {
        title: "Prozesse",
        body: "In diesem Bereich werden die einzelnen Business-Dokumente Schritt für Schritt erstellt und die zugehörigen Analysen mit Hilfe von KI durchgeführt. Zu jedem Unterprozess gibt es ein Notizfeld, in dem Sie zusätzliche Details, Rahmenbedingungen oder Korrekturen hinterlassen können, damit die Generierung stärker auf Ihren konkreten Fall eingeht und die Ergebnisse qualitativ besser werden. Falls keine API-Anbindung genutzt wird, können Sie denselben Ablauf trotzdem umsetzen, indem Sie Prompts per Copy-and-Paste in externe Tools wie ChatGPT oder Claude einfügen und die Antworten anschließend wieder in die App zurückkopieren; dadurch behalten Sie noch mehr Kontrolle über Eingaben und Ausgaben und können die Resultate gezielt weiter verbessern.",
      },
      {
        title: "Dokumente",
        body: "In diesem Bereich befinden sich die Ergebnisse beziehungsweise Outputs aus den Prozessen, also die Business-Dokumente, die auch im realen Unternehmensalltag für Analyse, Bewertung, Entscheidungsgrundlagen und bei Bedarf sogar gegenüber Institutionen genutzt werden können. Jedes einzelne Dokument kann bewertet werden, damit strukturiertes Feedback hinterlegt wird, wie gut die KI bei Analyse, Inhaltstiefe und Erstellung gearbeitet hat und wo bei späteren Durchläufen noch Optimierungspotenzial besteht.",
      },
      {
        title: "Fragebögen",
        body: "Die Fragebögen dienen dazu zu prüfen, ob die KI-gestützten Prozesse im realen Unternehmensalltag tatsächlich hilfreich für bessere Entscheidungen sind und ob sie sich sinnvoll in bestehende Arbeitsabläufe integrieren lassen. Sie sind bewusst als Forschungsinstrument zur Beantwortung der Forschungsfragen konzipiert und gehören damit zur Methodik der Evaluation, nicht zur späteren Endanwendung als operatives Kernfeature.",
      },
      {
        title: "Use-Case",
        body: "Auf dieser Seite beschreiben und bewerten Sie konkrete Anwendungsszenarien aus der Praxis, damit der tatsächliche Nutzen nicht nur allgemein behauptet, sondern anhand von vergleichbaren Fällen verständlich eingeordnet und begründet werden kann.",
      },
      {
        title: "Berater-Chat",
        body: "Der Berater-Chat funktioniert wie ein KI-gestützter Unternehmensberater, dem Sie konkrete Fragen zu Ihrer Situation stellen können, etwa zu Strategie, Markt, Risiken, Prioritäten oder nächsten Schritten. Er bietet Hilfestellung bei der Einordnung von Ergebnissen, liefert argumentativ nutzbare Hinweise und kann auf relevante Quellenbezüge verweisen, damit Entscheidungen nicht nur schneller, sondern auch nachvollziehbarer und fundierter abgeleitet werden.",
      },
      {
        title: "Unternehmensprofil & Intake-Assistent",
        body: "Hier legen Sie die fachlichen Grundlagen Ihres Unternehmenskontexts fest, auf denen spätere Prozesse aufbauen, damit Auswertungen und Empfehlungen zur tatsächlichen Situation passen und nicht auf unvollständigen Annahmen basieren.",
      },
      {
        title: "Wissensdatenbank",
        body: "In der Wissensdatenbank hinterlegen Sie Quellen, Dokumente und relevantes Kontextwissen, das in die Verarbeitung einfließt, damit Antworten und Ergebnisse konkreter, belastbarer und näher an Ihrer realen Unternehmenslage ausfallen.",
      },
      {
        title: "Handbuch",
        body: "Das Handbuch erklärt Seiten, Begriffe und Ablauf in verständlicher Sprache für Personen, die die App noch nicht kennen, damit der Einstieg leichter fällt und jeder Bereich mit seinem Zweck und Nutzen sofort eingeordnet werden kann.",
      },
      {
        title: "KPIs",
        body: "KPIs sind Key Performance Indicators, also zentrale Leistungskennzahlen, mit denen Sie den Zustand und die Entwicklung Ihres Unternehmens messbar machen, zum Beispiel in Bereichen wie Wachstum, Effizienz, Marktleistung oder finanzieller Stabilität. Auf dieser Seite sehen Sie nicht nur KPI-Werte, sondern auch Strategic Indicators, die als verdichtete strategische Signale Risiken und Chancen früh sichtbar machen, sowie ergänzende Auswertungen und Hinweise, damit Sie Entwicklungen besser verstehen und daraus konkrete Entscheidungen, Maßnahmen und Prioritäten ableiten können.",
      },
      {
        title: "Läufe & Prüfung",
        body: "Hier sehen Sie detailliert, wie einzelne Durchläufe entstanden sind und welche Prüfschritte erfolgt sind, damit die Entstehung von Ergebnissen transparent bleibt und bei Bedarf gezielt nachgebessert werden kann.",
      },
      {
        title: "Prozessdiagramm",
        body: "Das Prozessdiagramm zeigt die Gesamtlogik der App als visuelle Abfolge, damit Zusammenhänge, Reihenfolgen und Abhängigkeiten schneller verstanden werden als über reine Textbeschreibungen.",
      },
      {
        title: "Einstellungen",
        body: "In den Einstellungen hinterlegen Sie unter anderem die Anbindung einer LLM-API. Eine LLM-API ist die technische Schnittstelle zu einem großen Sprachmodell, über die die App KI-Funktionen wie Analyse, Textgenerierung und inhaltliche Unterstützung ausführt. Durch diese Konfiguration legen Sie fest, wie die App mit dem KI-Dienst kommuniziert, damit die Prozesse zuverlässig laufen, Ergebnisse reproduzierbar bleiben und Sie die KI-Unterstützung kontrolliert in Ihren Arbeitsalltag integrieren können.",
      },
    ],
    flowTitle: "3) Empfohlener Ablauf",
    flowItems: [
      "Zu Beginn sollten Sie das Unternehmensprofil vollständig erfassen und die notwendigen Systemeinstellungen hinterlegen, weil erst dadurch die App inhaltlich passend arbeitet und spätere Auswertungen den richtigen Unternehmenskontext berücksichtigen.",
      "Anschließend laden Sie relevante Quellen und Dokumente hoch, damit die Wissensbasis aufgebaut wird und die KI auf belastbare Informationen zugreifen kann, was sich direkt auf die Qualität der generierten Ergebnisse auswirkt.",
      "Danach führen Sie die Prozesse schrittweise entlang der jeweiligen Phase aus, um Themen strukturiert zu bearbeiten und aus ersten Annahmen schrittweise konkretisierte, nutzbare Ergebnisse zu entwickeln.",
      "Im nächsten Schritt prüfen und evaluieren Sie die erzeugten Dokumente, damit Qualität, Verständlichkeit und Praxistauglichkeit gesichert sind, bevor Ergebnisse in Entscheidungen oder Maßnahmen überführt werden.",
      "Darauf aufbauend werten Sie Kennzahlen und Hinweise aus, um Entwicklungen objektiv einzuordnen und Entscheidungen so abzuleiten, dass sie sowohl datenbasiert als auch inhaltlich nachvollziehbar sind.",
      "Zum Abschluss nutzen Sie Fragebögen und Use-Case-Evaluationen, um die Nutzung strukturiert zu reflektieren und belastbar zu dokumentieren, welcher Mehrwert im Vergleich zur Arbeit ohne Tool tatsächlich entstanden ist.",
    ],
    tipsTitle: "4) Tipps für gute Ergebnisse",
    tipsItems: [
      "Je klarer und vollständiger Ihre Eingabedaten sind, desto präziser und nützlicher fallen die KI-Ergebnisse aus, weshalb sich eine sorgfältige Pflege von Profil, Quellen und Kennzahlen langfristig deutlich auszahlt.",
      "Wenn sich zentrale Ausgangsdaten verändern, sollten betroffene Prozesse erneut ausgeführt werden, damit Ergebnisse aktuell bleiben und Entscheidungen nicht auf veralteten Annahmen beruhen.",
      "Bevor Sie Ergebnisse als Entscheidungsgrundlage verwenden, empfiehlt sich eine kurze Qualitätsprüfung mit Evaluation, damit Plausibilität, Relevanz und Verständlichkeit nachvollziehbar abgesichert sind.",
      "Warnhinweise sollten nicht nur registriert, sondern inhaltlich geprüft werden, damit zuerst Ursachen verstanden und danach die wirksamsten Maßnahmen priorisiert werden können.",
    ],
    concept: {
      tabLabel: "Konzept & Anforderungen",
      title: "Konzept der App & Requirements Engineering (RE)",
      introBullets: [
        "Aus Sicht der Informations- und Entscheidungsunterstützung ist die Anwendung ein Artefakt im Sinne des Design Science Research (DSR).",
        "Adressierte Problemklasse: strategische Entscheidungen unter Unsicherheit, verteilten Informationen und wachsendem Daten- sowie KI-Einsatz.",
        "Das System bündelt Stammdaten, Wissensquellen, Kennzahlen, geführte Workflows und KI-gestützte Analysen zu einem nachvollziehbaren Entscheidungsweg.",
        "Es ersetzt nicht die fachliche oder rechtliche Verantwortung von Nutzerinnen und Nutzern.",
        "Requirements Engineering (RE) benennt funktional nötige Fähigkeiten (Was soll das System tun?) und nicht-funktionale Qualitäten (Zuverlässigkeit, Sicherheit, Bedienbarkeit, Integrationsfähigkeit).",
        "Die Reiter „Evaluation“, „Tech Stack“ und „App-Dokumentation“ ergänzen dieses Konzept um Methodik, Messlogik und technische Realisierung.",
      ],
      sections: [
        {
          title: "DSR-Rahmen und Nutzenversprechen",
          bullets: [
            "DSR-Zyklus: Problemstellung, Lösungsidee (integrierte KI-Workflows für Business-Analyse und -dokumentation), Bau und Evaluation des Artefakts verknüpfen.",
            "Organisatorischer Nutzen: weniger Brüche zwischen Datenlage, Analyse und Entscheidungsvorbereitung.",
            "Begründungsketten: Artefakte, Läufe und Bewertungen bleiben nachvollziehbar gespeichert.",
            "Wiederholbarkeit: dieselben Pfade sind bei geänderten Rahmendaten erneut durchlaufbar.",
            "Forschung: Architektur liefert messbare Größen zu Akzeptanz, wahrgenommener Entscheidungsqualität und Anforderungserfüllung (Reiter „Evaluation“).",
          ],
        },
        {
          title: "Zielbild, Stakeholder und Verantwortlichkeiten",
          bullets: [
            "Primär: Führungskräfte und Fachrollen, die strategische Fragen vorbereiten, priorisieren oder entscheiden.",
            "Sekundär: Pflege von Stammdaten und Kontext (Profil, Intake), Kuratieren von Quellen, KPI-Pflege, Prüfen und Freigeben von Artefakten.",
            "RE-Zielbild: transparente, daten- und quellenbasierte Entscheidungsvorbereitung statt isolierter Einzelrecherchen.",
            "Zwischenstände: Läufe, Schritte und Notizen machen den Fortschritt sichtbar.",
            "Verantwortung für Richtigkeit, Compliance und Endentscheidung: beim Unternehmen; die App unterstützt, dokumentiert und strukturiert.",
          ],
        },
        {
          title: "Funktionale Anforderungen (überblick und Tiefe)",
          bullets: [
            "Kontext & Stammdaten: Profil, Intake, Einstellungen — fachlicher Rahmen und LLM-Anbindung.",
            "Wissensbezug: Uploads, Quellen, aufbereitete Inhalte — Basis für Retrieval und KI-Qualität.",
            "Phasenorientierte Workflows: geführte Schritte je Phase, Notizen, Review; optional externer LLM-Workflow per Copy/Paste bei erhaltener Nachvollziehbarkeit in der App.",
            "Läufe & Schritte: technische Kette mit Status, Verifikation und verständlichen Fehlermeldungen.",
            "Artefakte/Dokumente: Versionierung, Freigabe, Warnhinweise, strukturierte Dokumenten-Evaluation.",
            "Kennzahlen: KPI-Bibliothek, Ist-Werte, Strategy Indicators, integrierte Auswertungen zu Risiko und Chancen.",
            "Studie & Messung: FB1–FB5, Szenario-, Use-Case- und Berater-Chat-Evaluation als empirische Instrumente zu den Forschungsfragen.",
            "Export: SPSS, Excel, PDF/ZIP für Auswertung und Archiv.",
            "Gesamtkette: Kontext → Generierung → Bewertung → Export.",
          ],
        },
        {
          title: "Nicht-funktionale Anforderungen (Qualitätsdimensionen)",
          bullets: [
            "Nachvollziehbarkeit: Läufe, Schrittprotokolle, Quellenbezüge, gespeicherte Bewertungen.",
            "Wiederholbarkeit: Eingangsdaten geändert — Pfade erneut laufen, ohne still veraltete Artefakte.",
            "Verfügbarkeit & Bedienbarkeit: KI-Schritte im Studien- und Arbeitsalltag abschließbar und prüfbar; nachvollziehbare Fehlerbilder.",
            "Sicherheit & Datenschutz: sensible Daten und Schlüssel serverseitig; Artefakt-Freigaben; E-Mail/Evaluation gemäß Policy.",
            "Vertraulichkeit & Mandantenfähigkeit: Daten pro Arbeitsbereich/Unternehmenskontext.",
            "Wartbarkeit & Erweiterbarkeit: klare Modulgrenzen (u. a. Services, gemeinsame Bibliotheken, API-Routen) für neue Phasen oder Messinstrumente.",
            "Internationalisierung: ausgewählte Oberflächen und dieses Handbuch mehrsprachig.",
          ],
        },
        {
          title: "Qualität der KI-Ausgaben und Governance",
          bullets: [
            "Funktionale KI-Features allein genügen nicht — Qualitäts- und Governance-Kriterien sind explizit.",
            "Strukturierte Evaluationen: Plausibilität, Quellenqualität, Halluzinationshinweise, Frühwarn- und Indikatorblöcke wo vorgesehen.",
            "Warnungen bei Datenlücken oder Regelverletzungen; Artefakte zurückweisen oder nachbessern.",
            "Akzeptanz & Integration: Nutzen, Aufwand, Vertrauen, organisatorischer Fit — u. a. über TAM/UTAUT, FIT, GOV und Freitexte.",
            "Im RE: nicht-funktionale Ziele jenseits reiner Modellgenauigkeit.",
          ],
        },
        {
          title: "Forschungsbezug: Studieninstrumente vs. spätere Produktvision",
          bullets: [
            "Fragebögen und Evaluationspfade sind an FF1–FF4 gekoppelt und operationalisieren das DSR-Artefakt.",
            "Späteres Produkt: Teile können vereinfacht oder ausgeblendet werden.",
            "Studien-MVP: Tiefe Messung bleibt fachlich begründet, um Wirkung und Akzeptanz messen zu können.",
            "Grenze „reines Produkt“: Messaufwand nur reduzieren, wenn Traceability und Evidenz für Kernaussagen erhalten bleiben.",
          ],
        },
        {
          title: "Traceability: Anforderung → Baustein → Messgröße",
          bullets: [
            "Profil und Datengrundlagen halten den Kontext fest.",
            "Prozesse und Läufe führen Analyse- und Generierungspfade aus.",
            "Dokumente speichern Artefakte inkl. Freigabe- und Bewertungsstatus.",
            "KPIs und Indikatoren liefern quantitative Einbettung.",
            "Evaluation (Fragebögen, Szenarien, Dokument-, Berater-, Use-Case-Bewertungen) prüft qualitative und Akzeptanz-Anforderungen.",
            "Export verbindet Software mit Statistik (SPSS, Tabellen, Freitexte).",
            "Im Reiter „Evaluation“: Zuordnung bis auf Variablen und Formulare je FF.",
          ],
        },
        {
          title: "Randbedingungen, Risiken und bewusste Abgrenzungen",
          bullets: [
            "Kein Ersatz für ERP-Controlling oder rechtsverbindliche Beratung.",
            "LLM-Ausgaben können unvollständig oder fehlerhaft sein — Prüfung, Evaluation und Freigabe sind Kern des Konzepts.",
            "Technik: Qualität/Kosten hängen von Modell, Prompting, API; LLM-Keys typisch pro Arbeitsbereich.",
            "MVP: begrenzte Drittsystem-Integration — Schwerpunkt Workflow und Export, kein Enterprise-Bus.",
          ],
        },
      ],
    },
    evaluation: {
      tabLabel: "Evaluation",
      title: "Evaluation in der Studie",
      intro:
        "Der Reiter „Evaluation“ fasst die empirische Methodik und die Zuordnung von Messvariablen zu den vier Forschungsfragen zusammen. Damit ist nachvollziehbar, welche Fragebogen- und Evaluationsformulare welche FF operationalisieren.",
      methodologyTitle: "Methodik (Kurzfassung)",
      methodologyIntro:
        "Die vorliegende Arbeit folgt dem Design Science Research Ansatz, bei dem ein KI-gestütztes Business-Intelligence- bzw. Decision-Workflow-System konzipiert, entwickelt und anschließend empirisch evaluiert wird. Ziel ist es, sowohl die technischen und konzeptionellen Anforderungen als auch den praktischen Nutzen und die Akzeptanz eines solchen Systems in Unternehmen zu untersuchen.",
      methodologyQas: [
        {
          question:
            "FF1 — Welche technischen und konzeptionellen Anforderungen müssen erfüllt sein, um ein KI-gestütztes Business-Intelligence-System für Unternehmen zu entwickeln?",
          paragraphs: [
            "Zur Beantwortung erfolgt eine systematische Anforderungsanalyse: Architektur, Datenquellen, Analyseprozesse, Workflow-Logik (inkl. LLM/n8n), sowie die Abbildung in den App-Bereichen Profil, Prozesse, Dokumente, KPIs und Evaluation.",
          ],
        },
        {
          question:
            "FF2 — Welche Faktoren und Indikatoren lassen sich systematisch identifizieren, um Frühwarnsignale für strategische Fehlentscheidungen zu erkennen?",
          paragraphs: [
            "Konzeptionell werden relevante Kennzahlen, Risikoindikatoren und Beobachtungsgrößen modelliert und in FB1 (Abschnitt D), in der Dokumenten-Evaluation (optional Frühwarn- und KPI-Blöcke) sowie qualitativ in FB4 (Interview) abgebildet.",
          ],
        },
        {
          question:
            "FF3 — Inwiefern verbessert ein KI-gestützter Workflow die wahrgenommene Qualität strategischer Entscheidungen im Vergleich zu einem Vorgehen ohne KI-Unterstützung?",
          paragraphs: [
            "Within-Subject Design: identische Entscheidungsszenarien ohne vs. mit Tool. Likert-Konstrukte in FB2/FB3/FB4 (u. a. DQ, EV, TR, CF, CL, Vergleich COMP), Szenario-Evaluation (Nutzer vs. KI, Konfidenz, Bewertungsdimensionen) sowie Dokumenten- und Berater-Evaluation messen wahrgenommene Qualität, Belegbarkeit und Nutzen.",
            "Auswertung u. a. mit SPSS (deskriptiv, t-Tests für abhängige Stichproben, Regressionen).",
          ],
        },
        {
          question:
            "FF4 — Inwiefern sind Unternehmen bereit, KI-gestützte Systeme einzusetzen, und welche Risiken und Hemmnisse beeinflussen die Nutzung?",
          paragraphs: [
            "Technologieakzeptanz (TAM/UTAUT: PE, EE, SI, FC), Integration/Fit/Governance (FIT, GOV), Abschlussfragebogen FB5 sowie offene Texte und Berater-/Dokumenten-Feedback erfassen Akzeptanz, Hemmnisse und Vertrauen. Ergänzend qualitative Inhaltsanalyse offener Antworten.",
          ],
        },
      ],
      methodologyClosing:
        "Die Kombination aus Artefaktentwicklung, experimenteller Evaluation und Akzeptanzanalyse bildet den methodischen Rahmen; die folgende Tabelle operationalisiert ihn auf Variablebene.",
      mappingIntro:
        "Jede Zeile nennt ein Instrument (Kürzel), den technischen Variablennamen bzw. Schlüssel und die zugeordnete(n) Forschungsfrage(n). ✓ bedeutet: die Variable trägt zur Beantwortung dieser FF bei. Mehrfachmarkierungen sind erwünscht, wenn eine Variable mehrere Aspekte abdeckt.",
      ffFootnote:
        "FF1 = Anforderungen/Konzept; FF2 = Frühwarnsignale & Indikatoren; FF3 = Entscheidungsqualität/Vergleich ohne–mit KI; FF4 = Akzeptanz, Integration, Hemmnisse, Risiko.",
      repeatNotice:
        "Hinweis: FB2, FB3 und FB4 werden in der App je Themenbereich (Studienphase) erneut ausgefüllt; die Item-Schlüssel (z. B. DQ1) sind identisch, der Kontext ist phasebezogen.",
      tableColInstrument: "Instrument",
      tableColCode: "Kürzel / Variable",
      tableColLabel: "Kurzbeschreibung",
      tableColFf1: "FF1",
      tableColFf2: "FF2",
      tableColFf3: "FF3",
      tableColFf4: "FF4",
    },
    tech: {
      tabLabel: "Tech Stack",
      title: "Technischer Stack der Anwendung",
      intro:
        "Vollständiger Überblick für IT-, Architektur- und DevOps-Rollen: Frameworks, Bibliotheken und Werkzeuge, aus denen die Web-App besteht. Konkrete Versionsnummern stehen in `package.json` und ändern sich bei Upgrades.",
      sections: [
        {
          title: "Architektur",
          body: "Full-Stack-Webanwendung mit Next.js (App Router unter `src/app/`), React für die UI und TypeScript. Route Handlers (`src/app/api/**/route.ts`), Server Components und Server Actions tragen Geschäftslogik, Persistenz und KI-Aufrufe; sensible Schlüssel bleiben serverseitig.",
        },
        {
          title: "Laufzeit & Frontend",
          body: "Next.js 16 mit React 19; lokaler Dev-Server per `npm run dev` (Webpack-Modus laut Skript). Styling mit Tailwind CSS 4 (`@tailwindcss/postcss`). Client-Komponenten (`\"use client\"`) dort, wo Interaktivität nötig ist: Formulare, Charts, Berater, Fragebögen.",
        },
        {
          title: "Datenbank & ORM",
          body: "PostgreSQL als Primärdatenbank; Prisma 6 (`prisma/schema.prisma`, `@prisma/client`). `npm run db:generate` / `db:push` / `db:seed` für Schema und Demo-Daten. Optional semantische Suche: `npm run db:vector:setup` führt `prisma/sql/enable-pgvector.sql` aus; weitere SQL-Hilfen unter `prisma/sql/`.",
        },
        {
          title: "KI & externe Dienste",
          body: "OpenAI-kompatible LLM-HTTP-APIs (Arbeitsbereich in der DB, Aufruf u. a. über `src/app/api/llm/complete/route.ts`). HTTP mit undici. Transaktions-E-Mail optional über Resend (`resend`). PDF: `unpdf`, `pdf-lib`; Berichte/ZIP-Exporte zusätzlich `jspdf`, `html2canvas-pro`. Optional Profil-Anreicherung mit Brave Search (`BRAVE_SEARCH_API_KEY` in `.env.example`).",
        },
        {
          title: "Validierung, Auth & Sicherheit",
          body: "Eingabe- und API-Payloads mit Zod. Auth: JWT/Sitzung mit `jose`, Passwörter mit `bcryptjs`; Edge-/Request-Schicht in `src/middleware.ts` (Cookie/Session je nach Implementierung). Produktiv: `AUTH_SECRET`, HTTPS, restriktive CORS/Rate-Limits und DB-Zugriff nach eurer Policy — nicht `DEV_AUTH_BYPASS` setzen.",
        },
        {
          title: "UI, Styling & Bedienung",
          body: "Komponentenbibliotheken: `@radix-ui/react-popover`, `react-day-picker`, `@tailwindcss/forms`, Hilfsklassen mit `clsx` und `tailwind-merge`. Übersetzte Oberfläche: serverseitige Locale (`getServerLocale`) und getrennte Copy-Strukturen (z. B. Handbuch in `src/app/manual/page.tsx`).",
        },
        {
          title: "Visualisierung, Export & JSON",
          body: "Diagramme mit `mermaid`; KPIs mit `chart.js`, `chartjs-adapter-moment` und `moment` sowie `recharts`. Datumslogik `date-fns`. Paket-Exporte mit `jszip`. Robustes JSON mit `jsonrepair`; Inspektion mit `@uiw/react-json-view`.",
        },
        {
          title: "Tooling & Qualitätssicherung",
          body: "TypeScript 5, ESLint 9 mit `eslint-config-next`, optionales React-Compiler-Plugin in `package.json`. Build: `npm run build`; Qualität: `npm run lint`, `npx tsc --noEmit`. Einmalige Skripte mit `tsx` (Prisma-Seed, `scripts/`). Konfiguration: `next.config.ts`.",
        },
      ],
    },
    docs: {
      tabLabel: "App-Dokumentation",
      title: "Dokumentation für Entwicklung & Betrieb",
      intro:
        "Vollständige Orientierung im Repository: wo Nutzerdoku liegt, wie der Code aufgebaut ist, welche APIs existieren, welche Umgebungsvariablen nötig sind und wie ihr lokal baut, testet und deployt.",
      sections: [
        {
          title: "Ausführliches Nutzerhandbuch (Datei)",
          body: "Die ausführliche Markdown-Doku liegt unter `docs/USER_HANDBUCH.md`. Inhalt u. a.: Ziel der App, Kernbereiche (`Dashboard`, `Runs`, `Artifacts`, `Study`, `Evaluation`, …), seitenweise Erklärung von Inhalt, Zweck und Nutzen, sowie Hinweise zu Workflows und Export. Parallel zum in-app-Handbuch lesbar oder ins Team-Wiki übernehmen.",
        },
        {
          title: "Wichtige Verzeichnisse",
          body: "`src/app/` — App Router: Seiten, Layouts, `src/app/manual/` (dieses Handbuch), `src/app/api/**/route.ts` (REST). `src/components/` — wiederverwendbare UI. `src/lib/` — Prisma-Client-Helfer, Locale, Studien-/Export-Mapping, Validierung. `src/services/` — Domänenlogik (Workflows, Kontextpakete, Berater). `src/prompts/` — Prompt-Registry und Vorlagen. `src/middleware.ts` — Request-Grenzen/Auth. `prisma/` — `schema.prisma`, `seed.ts`, SQL unter `prisma/sql/`. `scripts/` — Wartungs-TS (z. B. `backfill-realistic-evaluations.ts`). `next.config.ts` — Next-Konfiguration.",
        },
        {
          title: "Prompts & Fachlogik",
          body: "KI-Schritte sind über Prompt-Vorlagen, Renderer (`src/lib/promptRenderer.ts` u. a.) und Zod-Output-Schemata abgesichert. Zentrale Einstiegspunkte und Metadaten unter `src/prompts/`; bei neuen Phasen immer Schema, Prompt und UI/Export gemeinsam erweitern.",
        },
        {
          title: "REST-API (Überblick)",
          body: "Alle Routen unter `src/app/api/`: Auth — `auth/login`, `register`, `logout`, `verify-email`, `resend-verification`. Exporte — `export`, `export/open-answers`, `export/documents-excel-zip`, `export/documents-pdf-zip`, `export/send-package-email`; Studie — `study/export`. Läufe und Phasen — `runs/run-steps`, `runs/ensure`, `run-step/execute`, `phase-runs/start`, `cancel`, `status`, `dashboard/start-phase-runs`. Checkliste — `checklist/stage`, `checklist/step`, `checklist/stage-reset`. KI — `llm/complete`. Evaluation — `evaluation/scenario-answer`, `scenario-prompt`, `send-anonymized-email`. Profil — `profile/enrich-company`. Sonstiges — `settings`, `insights/integrated-analysis`, `chat/thread-title`.",
        },
        {
          title: "Umgebungsvariablen & `.env.example`",
          body: "Vor dem Start `.env` aus `.env.example` anlegen. Pflicht u. a.: `DATABASE_URL` (bei Supabase oft Pooler-Port `6543` mit `pgbouncer=true`), `DIRECT_URL` für Migrationen, `AUTH_SECRET` (mindestens 16 Zeichen). E-Mail in Produktion: `RESEND_API_KEY`, `EMAIL_FROM`; Studien-Mail: `EVALUATION_MAIL_TO`. Optional: `BRAVE_SEARCH_API_KEY`, LLM-Default-Variablen (`LLM_*`, `KIMI_*`). Nur lokal: `DEV_AUTH_BYPASS=1` oder `UNLOCK_ALL_WORKFLOWS=1` — in Produktion deaktivieren.",
        },
        {
          title: "Skripte, Datenbank & Wartung",
          body: "`package.json`: `dev`, `build`, `start`, `lint`, `db:generate`, `db:push`, `db:seed`, `db:vector:setup`, `db:inventory-enum`, `db:cleanup:llm-settings`, `eval:backfill`. Prisma-Seed: `prisma/seed.ts`. Zusätzliche Hilfen unter `scripts/` und `prisma/cleanupLlmSettings.ts`.",
        },
        {
          title: "Lokale Entwicklung & häufige Befehle",
          body: "Abhängigkeiten installieren (`npm install`), Postgres bereitstellen, `.env` setzen, dann `npm run db:push` und `npm run db:seed` bei Bedarf. App: `npm run dev` (Port `3000`). Nach Schemaänderungen `npm run db:generate`. Evaluations-Demo-Daten: `npm run eval:backfill` (nur wenn sinnvoll für eure DB).",
        },
        {
          title: "Build, Lint & Typecheck",
          body: "Produktion: `npm run build`, Start: `npm run start`. Qualität vor Commit: `npm run lint` und `npx tsc --noEmit`. CI/CD sollte dieselben Schritte ausführen; Node-Version an die von Next.js 16 empfohlene anlehnen.",
        },
        {
          title: "Betrieb, Sicherheit & Troubleshooting",
          body: "Secrets niemals ins Repo; auf Hosting (z. B. Vercel) Umgebungsvariablen setzen. DB: bei Supabase den Transaction-Pooler für die App nutzen, sonst Session-Limit-Fehler (`MaxClientsInSessionMode`). Backups und Zugriffsrechte nach IT-Policy. Bei Auth-/Cookie-Problemen `src/middleware.ts` und Cookie-Domain prüfen; bei E-Mail `RESEND_API_KEY` und verifizierte Absenderdomain.",
        },
      ],
    },
  },
  en: {
    title: "User guide",
    subtitle:
      "Overview of page content, purpose, and practical value — plus concept/requirements, evaluation mapping, tech stack, and repository documentation tabs.",
    guideTab: "Overview",
    conceptTabLabel: "Concept & requirements",
    evaluationTabLabel: "Evaluation",
    dictionaryTab: "Glossary",
    dictionaryIntro:
      "Short explanations in plain language — like a primer. Use it to look up terms used in the app.",
    appGoalTitle: "1) App objective",
    appGoalBody:
      "Grow Your Business helps you make structured business decisions. The system combines company data, documents, KPIs, and AI-supported analysis into transparent recommendations.",
    structureTitle: "2) App structure",
    structureEntries: [
      {
        title: "Home",
        body: "Public landing and sign-in entry point.",
      },
      {
        title: "Start",
        body: "After login: guided flow through study and work steps, including where questionnaires appear for evaluation.",
      },
      {
        title: "Processes",
        body: "Phase-based workflows to produce analyses and documents; optional manual LLM path via copy/paste.",
      },
      {
        title: "Documents",
        body: "Generated artifacts for review, release, and per-document evaluation.",
      },
      {
        title: "Questionnaires",
        body: "Structured instruments for the study; they operationalise the research questions.",
      },
      {
        title: "Use case",
        body: "Free-form scenarios and comparison notes.",
      },
      {
        title: "Advisor chat",
        body: "Contextual advisor Q&A with citations; evaluated separately.",
      },
      {
        title: "Company profile & intake",
        body: "Foundational business context for later workflows.",
      },
      {
        title: "Knowledge base",
        body: "Sources and context feeding retrieval and quality.",
      },
      {
        title: "This manual",
        body: "Plain-language orientation for new users.",
      },
      {
        title: "KPIs / insights",
        body: "Metrics and strategic indicators for evidence-based decisions.",
      },
      {
        title: "Runs & audit",
        body: "Traceability of how outputs were produced.",
      },
      {
        title: "Workflow diagram",
        body: "Visual map of dependencies and order.",
      },
      {
        title: "Settings",
        body: "LLM API configuration for reproducible AI execution.",
      },
    ],
    flowTitle: "3) Recommended workflow",
    flowItems: [
      "Complete profile and settings so analyses match your company context.",
      "Upload and maintain sources/knowledge.",
      "Run processes phase by phase.",
      "Review and evaluate documents before decisions.",
      "Use KPIs/alerts to prioritise actions.",
      "Complete questionnaires and evaluations to document without-vs-with-tool effects.",
    ],
    tipsTitle: "4) Tips for better results",
    tipsItems: [
      "Richer, cleaner inputs improve model outputs.",
      "Re-run workflows after major data changes.",
      "Use evaluations to sanity-check before committing.",
      "Investigate warnings before acting.",
    ],
    concept: {
      tabLabel: "Concept & requirements",
      title: "App concept & requirements engineering (RE)",
      introBullets: [
        "From an information-systems perspective, the application is a Design Science Research (DSR) artefact.",
        "Problem class: strategic decisions under uncertainty, fragmented information, and growing use of data and generative AI.",
        "The system combines master data, knowledge sources, metrics, guided workflows, and AI-supported analysis into a traceable preparation path.",
        "It does not replace professional, legal, or managerial accountability.",
        "Requirements engineering (RE) states functional capabilities (what the system must do) and non-functional qualities (reliability, security, usability, integrability).",
        "The Evaluation, Tech stack, and App documentation tabs add methodology, measurement logic, and implementation detail to this concept.",
      ],
      sections: [
        {
          title: "DSR framing and value proposition",
          bullets: [
            "DSR cycle: problem statement, solution idea (integrated AI workflows for analysis and documentation), build, and evaluation are explicitly linked.",
            "Organisational benefit: fewer gaps between data situation, analysis, and decision preparation.",
            "Justification chains: artifacts, runs, and ratings remain stored and inspectable.",
            "Repeatability: the same paths can be re-run when context data changes.",
            "Research: the architecture yields measurable variables on acceptance, perceived decision quality, and requirements fit (see Evaluation tab).",
          ],
        },
        {
          title: "Goals, stakeholders, and responsibilities",
          bullets: [
            "Primary: leaders and specialists who prepare, prioritise, or take strategic decisions.",
            "Secondary: maintain master context (Profile, intake), curate sources, keep KPIs current, review or approve artifacts.",
            "RE goal: transparent, evidence-aware preparation instead of isolated ad-hoc research.",
            "Intermediate states: runs, steps, and notes make progress visible.",
            "Accountability for correctness, compliance, and final decisions stays with the organisation; the app supports, documents, and structures.",
          ],
        },
        {
          title: "Functional requirements (breadth and depth)",
          bullets: [
            "Context & master data: profile, intake, settings — business frame and LLM connectivity.",
            "Knowledge: uploads, sources, prepared content — retrieval and AI output quality.",
            "Phase workflows: guided steps per phase, notes, review; optional external LLM path via copy/paste while keeping in-app traceability.",
            "Runs & steps: technical chain with status, verification, and clear errors.",
            "Documents/artifacts: versioning, approval, warnings, structured document evaluation.",
            "Metrics: KPI library, actuals, strategy indicators, integrated risk/opportunity views.",
            "Study & measurement: FB1–FB5, scenario, use-case, and advisor-chat evaluation as empirical instruments for the research questions.",
            "Export: SPSS, Excel, PDF/ZIP for analysis and archiving.",
            "End-to-end chain: context → generation → appraisal → export.",
          ],
        },
        {
          title: "Non-functional requirements (quality dimensions)",
          bullets: [
            "Traceability: runs, step logs, source references, stored evaluations.",
            "Repeatability: inputs change — re-run paths without silently relying on stale artifacts.",
            "Operability: AI steps completable and inspectable in study and daily use; understandable failure modes.",
            "Security & privacy: sensitive data and keys server-side; artifact approvals; email/evaluation handling per policy.",
            "Confidentiality & tenancy: data scoped per workspace/company context.",
            "Maintainability: clear module boundaries (services layer, shared libraries, API routes) for new phases or instruments.",
            "Internationalisation: selected UI and this manual support multiple languages.",
          ],
        },
        {
          title: "AI output quality and governance",
          bullets: [
            "Functional AI alone is not enough — explicit quality and governance criteria.",
            "Structured evaluations: plausibility, source quality, hallucination flags, early-warning and indicator blocks where designed.",
            "Warnings on data gaps or rule violations; reject or rework artifacts.",
            "Acceptance & integration: usefulness, effort, trust, organisational fit — e.g. TAM/UTAUT, FIT, GOV, open text.",
            "In RE terms: non-functional goals beyond raw model accuracy.",
          ],
        },
        {
          title: "Research stance: study instruments vs product vision",
          bullets: [
            "Questionnaires and evaluation paths are tied to FF1–FF4 and operationalise the DSR artefact.",
            "A future product may simplify or hide parts of the instrumentation.",
            "Study MVP: depth of measurement remains justified to measure effects and acceptance.",
            "Boundary to a “pure product”: reduce measurement load only if traceability and evidence for core claims remain.",
          ],
        },
        {
          title: "Traceability: requirement → module → measure",
          bullets: [
            "Profile and foundational data anchor context.",
            "Processes and runs implement analysis and generation paths.",
            "Documents store artifacts including approval and rating state.",
            "KPIs and indicators provide quantitative embedding.",
            "Evaluation (questionnaires, scenarios, document, advisor, use-case appraisals) tests qualitative and acceptance requirements.",
            "Export connects the software to statistics (SPSS, tables, open text).",
            "Evaluation tab: mapping down to variables and forms per FF.",
          ],
        },
        {
          title: "Constraints, risks, and deliberate scope limits",
          bullets: [
            "Does not replace enterprise ERP/controlling or provide legally binding advice.",
            "LLM outputs can be incomplete or wrong — review, evaluation, and approvals are core to the concept.",
            "Technical reality: quality/cost depend on model, prompting, API; LLM keys typically workspace-scoped.",
            "MVP: limited third-party integration — focus on workflow and export, not a full enterprise service bus.",
          ],
        },
      ],
    },
    evaluation: {
      tabLabel: "Evaluation",
      title: "Study evaluation",
      intro:
        "This tab summarises the empirical methodology and maps measurement variables to the four research questions (FF1–FF4).",
      methodologyTitle: "Methodology (short)",
      methodologyIntro:
        "The work follows Design Science Research: an AI-supported BI/decision workflow artefact is built and empirically evaluated for requirements fit, early-warning thinking, perceived decision quality (without vs with AI), and adoption barriers.",
      methodologyQas: [
        {
          question:
            "FF1 — What technical and conceptual requirements must a KI-supported BI system for companies satisfy?",
          paragraphs: [
            "Answered through structured requirements analysis: architecture, data sources, analysis processes, workflow logic (including LLM integration), mapped to profile, processes, documents, KPIs, and evaluation surfaces.",
          ],
        },
        {
          question:
            "FF2 — Which factors and indicators can systematically support early-warning thinking for strategic mis-decisions?",
          paragraphs: [
            "Conceptual modelling of KPIs and risk signals, captured in FB1 section D, optional early-warning and indicator blocks in document evaluation, and qualitative prompts in FB4 interview.",
          ],
        },
        {
          question:
            "FF3 — How does an AI-supported workflow change perceived strategic decision quality vs working without AI?",
          paragraphs: [
            "Within-subject comparison. Likert blocks FB2/FB3/FB4 (DQ, EV, TR, CF, CL, COMP, etc.), scenario evaluation (user vs AI, confidence, rating dimensions), document and advisor evaluations quantify perceived quality and usefulness.",
            "Analysis e.g. in SPSS (descriptives, paired tests, regressions).",
          ],
        },
        {
          question:
            "FF4 — To what extent are organisations willing to adopt such systems, and which risks/barriers matter?",
          paragraphs: [
            "TAM/UTAUT constructs (PE, EE, SI, FC), integration/fit/governance (FIT, GOV), closing questionnaire FB5, open texts, and advisor/document feedback capture acceptance and barriers, plus qualitative content analysis.",
          ],
        },
      ],
      methodologyClosing:
        "The table below operationalises this framework at variable level; every listed variable is assigned to at least one FF.",
      mappingIntro:
        "Each row lists an instrument (code), the variable key, a short description, and which research question(s) it supports. ✓ means the variable contributes to that FF; multiple checks are intentional.",
      ffFootnote:
        "FF1 = requirements/concept; FF2 = early warning & indicators; FF3 = decision quality / without–with AI; FF4 = adoption, integration, barriers, risk.",
      repeatNotice:
        "Note: FB2–FB4 are completed per study topic area; keys (e.g. DQ1) repeat with phase-specific context.",
      tableColInstrument: "Instrument",
      tableColCode: "Code / variable",
      tableColLabel: "Short description",
      tableColFf1: "FF1",
      tableColFf2: "FF2",
      tableColFf3: "FF3",
      tableColFf4: "FF4",
    },
    tech: {
      tabLabel: "Tech stack",
      title: "Application technology stack",
      intro:
        "Full reference for engineering, architecture, and operations: frameworks, libraries, and tooling in this codebase. Exact versions live in `package.json` and change when you upgrade dependencies.",
      sections: [
        {
          title: "Architecture",
          body: "Full-stack Next.js (App Router under `src/app/`) with React and TypeScript. Route handlers (`src/app/api/**/route.ts`), Server Components, and Server Actions host business logic, persistence, and LLM calls; secrets stay on the server.",
        },
        {
          title: "Runtime & UI",
          body: "Next.js 16 with React 19; local dev via `npm run dev` (Webpack mode as defined in the script). Tailwind CSS 4 with `@tailwindcss/postcss`. Client components (`\"use client\"`) where needed: forms, charts, advisor, questionnaires.",
        },
        {
          title: "Database & ORM",
          body: "PostgreSQL as primary store; Prisma 6 (`prisma/schema.prisma`, `@prisma/client`). Use `npm run db:generate`, `db:push`, and `db:seed` for schema and sample data. Optional embeddings: `npm run db:vector:setup` runs `prisma/sql/enable-pgvector.sql`; more SQL helpers under `prisma/sql/`.",
        },
        {
          title: "AI & integrations",
          body: "OpenAI-compatible LLM HTTP APIs (workspace settings in the database; calls e.g. via `src/app/api/llm/complete/route.ts`). HTTP with undici. Transactional email optionally via Resend (`resend`). PDF: `unpdf`, `pdf-lib`; reports/ZIP also `jspdf`, `html2canvas-pro`. Optional profile enrichment: Brave Search (`BRAVE_SEARCH_API_KEY` in `.env.example`).",
        },
        {
          title: "Validation, auth & security",
          body: "Structured validation with Zod. Auth: JWT/session helpers with `jose`, passwords with `bcryptjs`; request edge logic in `src/middleware.ts` (cookies/session per implementation). Production: `AUTH_SECRET`, HTTPS, sensible CORS/rate limits, and DB access per policy — never enable `DEV_AUTH_BYPASS` in prod.",
        },
        {
          title: "UI, styling & UX",
          body: "Libraries: `@radix-ui/react-popover`, `react-day-picker`, `@tailwindcss/forms`, class helpers `clsx` and `tailwind-merge`. Localised UI: server locale (`getServerLocale`) and separate copy bundles (e.g. manual strings in `src/app/manual/page.tsx`).",
        },
        {
          title: "Visualisation, export & JSON",
          body: "Diagrams with `mermaid`; KPIs with `chart.js`, `chartjs-adapter-moment`, `moment`, and `recharts`. Dates with `date-fns`. Bundles with `jszip`. Resilient JSON with `jsonrepair`; inspection with `@uiw/react-json-view`.",
        },
        {
          title: "Tooling & quality",
          body: "TypeScript 5, ESLint 9 with `eslint-config-next`, optional React Compiler plugin in `package.json`. Build: `npm run build`; checks: `npm run lint`, `npx tsc --noEmit`. One-off scripts with `tsx` (Prisma seed, `scripts/`). App config in `next.config.ts`.",
        },
      ],
    },
    docs: {
      tabLabel: "App documentation",
      title: "Developer & operations documentation",
      intro:
        "End-to-end orientation: where the long-form handbook lives, how the repo is structured, which HTTP APIs exist, which environment variables you need, and how to develop, check, and ship the app.",
      sections: [
        {
          title: "Extended user handbook (file)",
          body: "The detailed Markdown handbook is `docs/USER_HANDBUCH.md`. It covers goals, core areas (`Dashboard`, `Runs`, `Artifacts`, `Study`, `Evaluation`, …), per-page purpose and benefit, plus workflow and export notes. Read alongside this in-app guide or mirror it into your team wiki.",
        },
        {
          title: "Key directories",
          body: "`src/app/` — App Router pages/layouts, `src/app/manual/` (this guide), `src/app/api/**/route.ts` (REST). `src/components/` — reusable UI. `src/lib/` — Prisma helpers, locale, study/export mapping, validation. `src/services/` — domain logic (workflows, context packs, advisor). `src/prompts/` — prompt registry/templates. `src/middleware.ts` — request/auth edge. `prisma/` — `schema.prisma`, `seed.ts`, SQL under `prisma/sql/`. `scripts/` — maintenance TS (e.g. `backfill-realistic-evaluations.ts`). `next.config.ts` — Next configuration.",
        },
        {
          title: "Prompts & domain logic",
          body: "LLM steps combine prompt templates, render helpers (e.g. `src/lib/promptRenderer.ts`), and Zod output schemas. Central metadata under `src/prompts/`; when adding phases, update schema, prompt, UI, and exports together.",
        },
        {
          title: "REST API (overview)",
          body: "All handlers live under `src/app/api/`. Auth — `auth/login`, `register`, `logout`, `verify-email`, `resend-verification`. Exports — `export`, `export/open-answers`, `export/documents-excel-zip`, `export/documents-pdf-zip`, `export/send-package-email`; study — `study/export`. Runs & phases — `runs/run-steps`, `runs/ensure`, `run-step/execute`, `phase-runs/start`, `cancel`, `status`, `dashboard/start-phase-runs`. Checklist — `checklist/stage`, `checklist/step`, `checklist/stage-reset`. AI — `llm/complete`. Evaluation — `evaluation/scenario-answer`, `scenario-prompt`, `send-anonymized-email`. Profile — `profile/enrich-company`. Other — `settings`, `insights/integrated-analysis`, `chat/thread-title`.",
        },
        {
          title: "Environment variables & `.env.example`",
          body: "Copy `.env.example` to `.env` before running. Required: `DATABASE_URL` (Supabase often port `6543` with `pgbouncer=true`), `DIRECT_URL` for migrations, `AUTH_SECRET` (≥16 chars). Production mail: `RESEND_API_KEY`, `EMAIL_FROM`; study mailouts: `EVALUATION_MAIL_TO`. Optional: `BRAVE_SEARCH_API_KEY`, LLM defaults (`LLM_*`, `KIMI_*`). Local-only flags: `DEV_AUTH_BYPASS=1` or `UNLOCK_ALL_WORKFLOWS=1` — disable in production.",
        },
        {
          title: "Scripts, database & maintenance",
          body: "`package.json` scripts: `dev`, `build`, `start`, `lint`, `db:generate`, `db:push`, `db:seed`, `db:vector:setup`, `db:inventory-enum`, `db:cleanup:llm-settings`, `eval:backfill`. Prisma seed: `prisma/seed.ts`. Extra helpers in `scripts/` and `prisma/cleanupLlmSettings.ts`.",
        },
        {
          title: "Local development & common commands",
          body: "Install deps (`npm install`), provision Postgres, set `.env`, then `npm run db:push` and optionally `npm run db:seed`. Run the app with `npm run dev` (port `3000`). After schema edits: `npm run db:generate`. Demo evaluation backfill: `npm run eval:backfill` (only when appropriate for your database).",
        },
        {
          title: "Build, lint & typecheck",
          body: "Production: `npm run build`, serve: `npm run start`. Before commits: `npm run lint` and `npx tsc --noEmit`. CI should run the same steps; align Node with Next.js 16 recommendations.",
        },
        {
          title: "Operations, security & troubleshooting",
          body: "Never commit secrets; configure env vars on hosting (e.g. Vercel). With Supabase, use the transaction pooler for app traffic to avoid `MaxClientsInSessionMode`. Follow your IT policy for backups and access. For auth/cookie issues inspect `src/middleware.ts` and cookie domains; for mail verify `RESEND_API_KEY` and a verified sender domain.",
        },
      ],
    },
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
        conceptTab={c.concept}
        evaluationTab={c.evaluation}
        techTab={c.tech}
        docsTab={c.docs}
        dictionaryTabLabel={c.dictionaryTab}
        dictionaryIntro={c.dictionaryIntro}
        guide={{
          appGoalTitle: c.appGoalTitle,
          appGoalBody: c.appGoalBody,
          structureTitle: c.structureTitle,
          structureEntries: c.structureEntries,
          flowTitle: c.flowTitle,
          flowItems: c.flowItems,
          tipsTitle: c.tipsTitle,
          tipsItems: c.tipsItems,
        }}
        evaluationRows={EVALUATION_FF_MAP_ROWS}
      />
    </div>
  );
}
