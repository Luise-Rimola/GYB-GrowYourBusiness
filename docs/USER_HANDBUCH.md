# BusinessDSS User-Handbuch

## 1) Ziel der App

BusinessDSS unterstuetzt dich dabei, Unternehmensentscheidungen strukturiert zu treffen:
- Workflows je Planungsphase durchlaufen
- Artefakte erzeugen und evaluieren
- KPI- und Indikatorwerte nachvollziehbar auswerten
- Fruehwarnsignale frueh sichtbar machen

## 2) Kernbereiche der App

- `Dashboard` (`/dashboard`): Startpunkt fuer Workflows je Phase
- `Runs` (`/runs`): Schritt-fuer-Schritt Bearbeitung der Workflow-Outputs
- `Artefakte` (`/artifacts`): Ergebnisbibliothek, Freigaben, Evaluationen, Warnhinweise
- `KPIs` (`/insights`): KPI-Bibliothek, KPI-Werte, Strategy Indicators, Mapping Rules
- `Study` (`/study`): Frageboegen FB1-FB4, direktvergleichende Auswertung
- `Evaluation` (`/evaluation`): Use-Case- und Szenario-Evaluation
- `Workflow Overview` (`/workflow-overview`): Prozessdiagramme und Modell-Logik

## 3) Empfohlener Arbeitsablauf

1. Unternehmensprofil und Intake vervollstaendigen  
2. Dokumente/Quellen hochladen  
3. Phase im Dashboard starten  
4. Run-Schritte bearbeiten und validieren  
5. Artefakte pruefen und freigeben  
6. Fruehwarnhinweise lesen und aufloesen  
7. KPI- und Indikatorlage bewerten  
8. Study/Evaluation abschliessen und exportieren

## 4) KPI-, Indikator- und Rule-Logik

### KPIs
- KPI-Werte kommen aus manueller Eingabe, Dokument-Extraktion oder Workflows.
- In der KPI-Ansicht werden deskriptive Statistiken je KPI gezeigt.

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

Artefakte koennen mit Qualitaetskriterien bewertet werden:
- Antwortqualitaet
- Quellenqualitaet
- Realismus
- Verstaendlichkeit
- Struktur
- Halluzinationshinweis + Freitext

Diese Bewertung hilft dir, die Zuverlaessigkeit von KI-Ausgaben nachzuweisen.

## 7) DSR/Studienfluss

- FB1: Allgemeine Ausgangserhebung
- FB2/FB3: Kategorie- und Phasenbezogene Erhebungen
- Use-Case/Szenario-Evaluation: Vergleich und Vertrauen in KI-Unterstuetzung
- FB4: Abschlussinterview
- Export: Daten fuer Statistik und externe Auswertung

## 8) Gute Praxis

- Artefakte erst nach Plausibilitaetscheck freigeben.
- Bei `Status: Risiko` konkrete Gegenmassnahmen festhalten.
- KPI-Trends regelmaessig aktualisieren.
- Rule-Hinweise nicht ignorieren, sondern als Entscheidungs-Trigger nutzen.

