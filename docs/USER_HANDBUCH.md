# BusinessDSS User-Handbuch

## 1) Ziel der App

BusinessDSS unterstuetzt dich dabei, Unternehmensentscheidungen strukturiert zu treffen:
- Workflows je Planungsphase durchlaufen
- Dokumente erzeugen und evaluieren
- KPI- und Indikatorwerte nachvollziehbar auswerten
- Fruehwarnsignale frueh sichtbar machen

## 2) Kernbereiche der App

- `Dashboard` (`/dashboard`): Startpunkt fuer Workflows je Phase
- `Runs` (`/runs`): Schritt-fuer-Schritt Bearbeitung der Workflow-Outputs
- `Dokumente` (`/artifacts`): Ergebnisbibliothek, Freigaben, Evaluationen, Warnhinweise
- `KPIs` (`/insights`): KPI-Bibliothek, KPI-Werte, Strategy Indicators, Mapping Rules
- `Study` (`/study`): Frageboegen FB1–FB5, direktvergleichende Auswertung, Export
- `Evaluation` (`/evaluation`): Use-Case- und Szenario-Evaluation
- `Workflow Overview` (`/workflow-overview`): Prozessdiagramme und Modell-Logik

## 3) Empfohlener Arbeitsablauf

1. Unternehmensprofil und Intake vervollstaendigen  
2. Dokumente/Quellen hochladen (optional Wissen verarbeiten)  
3. LLM/API in den Einstellungen konfigurieren; Phase im Dashboard starten  
4. Run-Schritte bearbeiten und validieren  
5. Dokumente pruefen, evaluieren und freigeben  
6. Fruehwarnhinweise lesen und aufloesen  
7. Unter `Insights` KPI-Werte, **integrierte KPI KI-Analyse**, Strategy Indicators und Rule-Hinweise pruefen  
8. Study (FB1–FB5), Use-Case-Evaluation und Export abschliessen

## 4) KPI-, Indikator- und Rule-Logik

### KPIs
- KPI-Werte kommen aus manueller Eingabe, Dokument-Extraktion oder Workflows.
- In der KPI-Ansicht (`/insights`) werden deskriptive Statistiken je KPI gezeigt; die **integrierte KPI KI-Analyse** verknuepft KPIs, Wissen und Handlungsvorschlaege.

### Strategy Indicators
- Sind verdichtete Risiko-/Strategiesignale (z. B. `threat_score`).
- Werden in geeigneten Workflows mitausgegeben und gespeichert.

### Indicator Mapping Rules
- Regeln auf Basis von KPI-/Indikatorwerten.
- Beispiel: wenn `gtm_readiness_score < 60`, dann bestimmte Handlungen priorisieren.
- Aktive Rules erscheinen als Hinweise.

## 5) Fruehwarnsignale: Wann wird ein Hinweis gezeigt?

Nur wenn mindestens ein Risikofaktor zutrifft, z. B.:
- `risk_exposure_score >= 70`
- `threat_score >= 70`
- `weakness_score >= 70`
- `competitive_intensity_index >= 75`
- Risikomatrix mit `likelihood=high` und `impact=high`
- Expliziter Risiko-Text in `risk_explanation`

Dann wird:
- `Fruehwarnhinweis` angezeigt
- `Status: Risiko` sichtbar
- Detailerklaerung eingeblendet (welcher Faktor ausgelost hat)

## 6) Artefakt-Evaluation

Dokumente koennen mit Qualitaetskriterien bewertet werden:
- Antwortqualitaet
- Quellenqualitaet
- Realismus
- Verstaendlichkeit
- Struktur
- Halluzinationshinweis + Freitext

Diese Bewertung hilft dir, die Zuverlaessigkeit von KI-Ausgaben nachzuweisen.

## 7) DSR/Studienfluss

- FB1: Allgemeine Ausgangserhebung
- Pro Planungsbereich (Kategorie): Kurzinfo, FB2 (ohne Tool), Workflow-Runs, Dokumente, FB3 (mit Tool), **FB4** (Direktvergleich ohne/mit Tool inkl. Interview-Fragen — nicht nur ein Abschlussinterview)
- Entscheidungen (`/decisions`) und **Evaluation** (`/evaluation`): Use-Case-/Szenario-Bewertung
- **FB5**: Abschlussfragen zu Integration, Phasen und Nutzung im Alltag
- Export: Daten fuer Statistik und externe Auswertung

## 8) Gute Praxis

- Dokumente erst nach Plausibilitaetscheck freigeben.
- Bei `Status: Risiko` konkrete Gegenmassnahmen festhalten.
- KPI-Trends regelmaessig aktualisieren.
- Rule-Hinweise nicht ignorieren, sondern als Entscheidungs-Trigger nutzen.

