import { getServerLocale } from "@/lib/locale";
import { ManualTabs } from "@/components/ManualTabs";

const COPY = {
  de: {
    title: "Handbuch",
    subtitle:
      "Dieses Handbuch erklärt die App so, dass auch neue Nutzerinnen und Nutzer ohne Vorwissen verstehen, was sie in jedem Bereich sehen, warum dieser Bereich wichtig ist und wie er im Arbeitsalltag sinnvoll genutzt wird.",
    guideTab: "Handbuch",
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
    methodologyTitle: "5) Methodik",
    methodologyIntro:
      "Die vorliegende Arbeit folgt dem Design Science Research Ansatz, bei dem ein KI-gestütztes Business-Intelligence- bzw. Decision-Workflow-System konzipiert, entwickelt und anschließend empirisch evaluiert wird. Ziel ist es, sowohl die technischen und konzeptionellen Anforderungen als auch den praktischen Nutzen und die Akzeptanz eines solchen Systems in Unternehmen zu untersuchen.",
    methodologyQas: [
      {
        question:
          "1. Welche technischen und konzeptionellen Anforderungen müssen erfüllt sein, um ein KI-gestütztes Business-Intelligence-System für Unternehmen zu entwickeln?",
        paragraphs: [
          "Zur Beantwortung der ersten Forschungsfrage erfolgt eine systematische Anforderungsanalyse, in der die technischen und konzeptionellen Grundlagen eines KI-gestützten Entscheidungsunterstützungssystems abgeleitet werden. Dies umfasst insbesondere die Definition von Systemarchitektur, Datenquellen, Analyseprozessen sowie die Konzeption eines regel- und datenbasierten n8n/LLM-Workflows.",
        ],
      },
      {
        question:
          "2. Welche Faktoren und Indikatoren lassen sich für eine KI-gestützte Analyse systematisch identifizieren, um Frühwarnsignale für strategische Fehlentscheidungen in Unternehmen zu erkennen?",
        paragraphs: [
          "Die zweite Forschungsfrage wird durch die konzeptionelle Modellierung des Systems beantwortet. Dabei werden relevante Faktoren, Kennzahlen und Frühwarnindikatoren für strategische Entscheidungen identifiziert und strukturiert in die Logik des Systems integriert.",
        ],
      },
      {
        question:
          "3. Inwiefern verbessert ein KI-gestützter, regel- und datenbasierter LLM-Workflow die wahrgenommene Qualität strategischer Entscheidungen in der Markteintritts- und Wachstumsphase (z. B. Entscheidungsqualität, Transparenz/Nachvollziehbarkeit, Planungssicherheit, Geschwindigkeit) im Vergleich zu einem Vorgehen ohne KI-Unterstützung?",
        paragraphs: [
          "Zur Beantwortung der dritten Forschungsfrage wird ein experimentelles Within-Subject Design eingesetzt. Die Probanden bearbeiten identische Entscheidungsszenarien unter zwei Bedingungen:",
          "(1) ohne KI-Unterstützung und",
          "(2) mit dem entwickelten System.",
          "Die Datenerhebung erfolgt mittels standardisierter Likert-Skalen, die insbesondere Entscheidungsqualität, Transparenz/Nachvollziehbarkeit, Planungssicherheit, Geschwindigkeit, Vertrauen sowie kognitive Entlastung messen.",
          "Die Auswertung erfolgt mit SPSS und umfasst deskriptive Analysen, t-Tests für abhängige Stichproben sowie lineare Regressionsanalysen, um den Einfluss des KI-Systems und weiterer Variablen auf die Entscheidungsqualität zu untersuchen.",
        ],
      },
      {
        question:
          "4. Inwiefern sind Unternehmen bereit, KI-gestützte Systeme zur strategischen Entscheidungsunterstützung einzusetzen, und welche wahrgenommenen Risiken und Hemmnisse beeinflussen die Nutzung?",
        paragraphs: [
          "Zur Beantwortung der vierten Forschungsfrage wird die Technologieakzeptanz auf Basis etablierter Modelle (TAM/UTAUT) erhoben. Dabei werden insbesondere folgende Konstrukte gemessen:",
          "wahrgenommener Nutzen (Performance Expectancy), wahrgenommene Benutzerfreundlichkeit (Effort Expectancy), soziale Einflussfaktoren (Social Influence), unterstützende Rahmenbedingungen (Facilitating Conditions) und Nutzungsabsicht (Behavioral Intention).",
          "Zusätzlich werden wahrgenommene Risiken, Hemmnisse und Vertrauen in KI-Systeme erfasst. Die quantitative Auswertung erfolgt ebenfalls in SPSS. Ergänzend werden offene Fragen eingesetzt, deren Antworten mittels qualitativer Inhaltsanalyse ausgewertet werden, um vertiefte Einblicke in Akzeptanzbarrieren und Nutzungspotenziale zu gewinnen.",
        ],
      },
    ],
    methodologyClosing:
      "Durch die Kombination aus Artefaktentwicklung, experimenteller Evaluation sowie theoriegeleiteter Akzeptanzanalyse wird ein umfassender methodischer Rahmen geschaffen, der sowohl die Wirkung als auch die praktische Einsetzbarkeit des Systems fundiert untersucht.",
  },
  en: {
    title: "User Guide",
    subtitle: "Overview of page content, purpose, and practical value.",
    guideTab: "Guide",
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
        body: "This page provides orientation after login and highlights status and next actions.",
      },
      {
        title: "Dashboard / Processes",
        body: "This area runs phase-based workflows and structures the decision process.",
      },
      {
        title: "Runs",
        body: "This view shows active and completed runs to keep process steps traceable.",
      },
      {
        title: "Documents",
        body: "This area stores generated outputs for review, release, and evaluation.",
      },
      {
        title: "KPIs / Insights",
        body: "This section presents metrics and analysis to support evidence-based decisions.",
      },
      {
        title: "Knowledge Base",
        body: "This area provides context sources that improve output relevance and quality.",
      },
      {
        title: "Questionnaires / Use Case",
        body: "This section captures structured evaluation data across without/with-tool conditions.",
      },
      {
        title: "Settings",
        body: "This page manages technical configuration for stable and reproducible operation.",
      },
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
    methodologyTitle: "5) Methodology",
    methodologyIntro: "This section describes the research design used to develop and evaluate the system.",
    methodologyQas: [],
    methodologyClosing: "",
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
          structureEntries: c.structureEntries,
          flowTitle: c.flowTitle,
          flowItems: c.flowItems,
          tipsTitle: c.tipsTitle,
          tipsItems: c.tipsItems,
          methodologyTitle: c.methodologyTitle,
          methodologyIntro: c.methodologyIntro,
          methodologyQas: c.methodologyQas,
          methodologyClosing: c.methodologyClosing,
        }}
      />
    </div>
  );
}

