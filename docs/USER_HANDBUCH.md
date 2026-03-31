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

## 3) Seitenverstaendnis: Inhalt, Zweck, Nutzen

### `Home` (`/home`)
- **Inhalt:** Ueberblick ueber Reifegrad, naechste Schritte und Status relevanter Aufgaben.
- **Warum gibt es die Seite?** Damit du den aktuellen Stand sofort siehst, ohne in mehrere Menues zu wechseln.
- **Nutzen:** Du erkennst Prioritaeten in Sekunden und startest direkt mit dem naechsten sinnvollen Schritt.

### `Profil` (`/profile`)
- **Inhalt:** Unternehmens- und Kontextdaten als Grundlage fuer Workflows und Bewertungen.
- **Warum gibt es die Seite?** KI-Ausgaben sind nur dann belastbar, wenn Rahmenbedingungen und Ziele klar sind.
- **Nutzen:** Bessere Ergebnisqualitaet, weniger Rueckfragen in Workflows, konsistentere Empfehlungen.

### `Assistant` (`/assistant`)
- **Inhalt:** Gefuehrte Navigation durch die wichtigsten Arbeitsschritte je Phase.
- **Warum gibt es die Seite?** Um den Prozess zu strukturieren und Luecken im Ablauf sichtbar zu machen.
- **Nutzen:** Hoehere Prozesssicherheit; auch neue Nutzer wissen sofort, was als naechstes zu tun ist.

### `Dashboard` (`/dashboard`)
- **Inhalt:** Phasenbasierter Einstieg in Workflows, inklusive Fortschritt und Verzweigungen.
- **Warum gibt es die Seite?** Entscheidungen sollen entlang der Unternehmensphase getroffen werden, nicht isoliert.
- **Nutzen:** Fokus auf die richtigen Themen pro Phase (z. B. Launch statt Reife-Themen).

### `Runs` (`/runs`)
- **Inhalt:** Laufende und abgeschlossene Workflow-Durchlaeufe mit Schritten, Status und Ergebnissen.
- **Warum gibt es die Seite?** Ein Workflow ist nachvollziehbar nur mit transparenter Schrittkette.
- **Nutzen:** Du kannst Entscheidungen begruenden, Zwischenstaende pruefen und Iterationen gezielt verbessern.

### `Dokumente / Artefakte` (`/artifacts`)
- **Inhalt:** Erzeugte Dokumente, Versionen, Freigaben, Evaluationswerte und Warnhinweise.
- **Warum gibt es die Seite?** Ergebnisse muessen nicht nur erzeugt, sondern bewertet und freigegeben werden.
- **Nutzen:** Qualitaetssicherung und Auditierbarkeit; besserer Nachweis gegenueber Team/Stakeholdern.

### `Wissen` (`/knowledge`)
- **Inhalt:** Quellen, Uploads und aufbereitete Wissensbasis fuer Workflows.
- **Warum gibt es die Seite?** Ohne belastbare Quellen bleibt die KI-Argumentation oft zu generisch.
- **Nutzen:** Hoehere Faktentreue, bessere Kontextabdeckung und weniger Halluzinationsrisiko.

### `Einstellungen` (`/settings`)
- **Inhalt:** Konfiguration von LLM/API und weiteren Systemparametern.
- **Warum gibt es die Seite?** Technische Konfiguration ist Voraussetzung fuer stabile, reproduzierbare Ausgaben.
- **Nutzen:** Verlaesslicher Betrieb, kontrollierbare Kosten, planbare Antwortqualitaet.

### `KPIs / Insights` (`/insights`)
- **Inhalt:** KPI-Werte, KPI-Bibliothek, integrierte KPI-KI-Analyse, Strategy Indicators, Mapping Rules.
- **Warum gibt es die Seite?** Entscheidungen brauchen Messgroessen statt Bauchgefuehl.
- **Nutzen:** Fruehzeitiges Erkennen von Risiko-/Chancenmustern und datenbasierte Priorisierung.

### `Entscheidungen` (`/decisions`)
- **Inhalt:** Vorschlaege, Freigabestatus und Umsetzungsstand von Entscheidungen.
- **Warum gibt es die Seite?** Entscheidungen sollen vom Vorschlag bis zur Umsetzung nachverfolgbar bleiben.
- **Nutzen:** Klare Verantwortlichkeit, bessere Governance und transparente Historie.

### `Evaluation` (`/evaluation`)
- **Inhalt:** Use-Case- und Szenario-Bewertung inklusive Vergleichs- und Qualitaetskriterien.
- **Warum gibt es die Seite?** Um den Nutzen von Vorgehensweisen systematisch statt rein subjektiv zu bewerten.
- **Nutzen:** Fundierte Auswahl zwischen Alternativen und bessere Begruendung fuer Management-Entscheide.

### `Study` (`/study`)
- **Inhalt:** Frageboegen FB1 bis FB5 je Kategorie/Phase, inkl. Vergleich ohne/mit Tool.
- **Warum gibt es die Seite?** Die Wirkung des Systems soll strukturiert erhoben und analysierbar gemacht werden.
- **Nutzen:** Vergleichbare Daten ueber Nutzung, Qualitaet und Akzeptanz im Arbeitsalltag.

### `Workflow Overview` (`/workflow-overview`)
- **Inhalt:** Visualisierung der Prozesslogik, Abhaengigkeiten und Modellfluss.
- **Warum gibt es die Seite?** Komplexe Logik wird als Bild schneller verstanden als als reine Textliste.
- **Nutzen:** Besseres Gesamtverstaendnis; leichteres Onboarding fuer neue Teammitglieder.

## 4) Empfohlener Arbeitsablauf

1. Unternehmensprofil und Intake vervollstaendigen  
2. Dokumente/Quellen hochladen (optional Wissen verarbeiten)  
3. LLM/API in den Einstellungen konfigurieren; Phase im Dashboard starten  
4. Run-Schritte bearbeiten und validieren  
5. Dokumente pruefen, evaluieren und freigeben  
6. Fruehwarnhinweise lesen und aufloesen  
7. Unter `Insights` KPI-Werte, **integrierte KPI KI-Analyse**, Strategy Indicators und Rule-Hinweise pruefen  
8. Study (FB1–FB5), Use-Case-Evaluation und Export abschliessen

## 5) KPI-, Indikator- und Rule-Logik

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

## 6) Fruehwarnsignale: Wann wird ein Hinweis gezeigt?

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

## 7) Artefakt-Evaluation

Dokumente koennen mit Qualitaetskriterien bewertet werden:
- Antwortqualitaet
- Quellenqualitaet
- Realismus
- Verstaendlichkeit
- Struktur
- Halluzinationshinweis + Freitext

Diese Bewertung hilft dir, die Zuverlaessigkeit von KI-Ausgaben nachzuweisen.

## 8) DSR/Studienfluss

- FB1: Allgemeine Ausgangserhebung
- Pro Planungsbereich (Kategorie): Kurzinfo, FB2 (ohne Tool), Workflow-Runs, Dokumente, FB3 (mit Tool), **FB4** (Direktvergleich ohne/mit Tool inkl. Interview-Fragen — nicht nur ein Abschlussinterview)
- Entscheidungen (`/decisions`) und **Evaluation** (`/evaluation`): Use-Case-/Szenario-Bewertung
- **FB5**: Abschlussfragen zu Integration, Phasen und Nutzung im Alltag
- Export: Daten fuer Statistik und externe Auswertung

## 9) Gute Praxis

- Dokumente erst nach Plausibilitaetscheck freigeben.
- Bei `Status: Risiko` konkrete Gegenmassnahmen festhalten.
- KPI-Trends regelmaessig aktualisieren.
- Rule-Hinweise nicht ignorieren, sondern als Entscheidungs-Trigger nutzen.

