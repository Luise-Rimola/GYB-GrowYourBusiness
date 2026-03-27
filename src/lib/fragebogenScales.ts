/** Gemeinsame Likert-Items für Fragebogen 2–4 (Labels konsistent halten). */

export const DQ_ITEMS = [
  { key: "DQ1", label: "Ich konnte eine klare Entscheidung treffen." },
  { key: "DQ2", label: "Die Entscheidung ist logisch und konsistent begründet." },
  { key: "DQ3", label: "Die Entscheidung berücksichtigt die wichtigsten Faktoren/Constraints." },
  { key: "DQ4", label: "Die Entscheidung enthält konkrete nächste Schritte (ToDos)." },
];
export const EV_ITEMS = [
  { key: "EV1", label: "Die Entscheidung basiert auf belastbaren Informationen." },
  { key: "EV2", label: "Die Quellen/Daten sind relevant für den konkreten Unternehmenskontext." },
  { key: "EV3", label: "Die Quellen/Daten sind ausreichend seriös/vertrauenswürdig." },
  { key: "EV4", label: "Ich kann die Begründung inkl. Quellen intern weitergeben (Stakeholder-ready)." },
];
export const TR_ITEMS = [
  { key: "TR1", label: "Die Herleitung ist transparent (warum genau diese Empfehlung/Entscheidung)." },
  { key: "TR2", label: "Annahmen/Unsicherheiten sind klar erkennbar." },
  { key: "TR3", label: "Der Output ist auditierbar (Schritte/Quellen/Logik rekonstruierbar)." },
];
export const CF_ITEMS = [
  { key: "CF1", label: "Ich bin sicher, dass die Entscheidung in der Praxis tragfähig ist." },
  { key: "CF2", label: "Ich vertraue dem Ergebnis dieses Durchlaufs." },
  { key: "CF3", label: "Ich sehe ein relevantes Risiko von Fehlannahmen/Halluzinationen.", reverse: true },
];
export const CL_ITEMS = [
  { key: "CL1", label: "Der Prozess war mental anstrengend.", reverse: true },
  { key: "CL2", label: "Der Prozess war effizient." },
  { key: "CL3", label: "Ich musste viel nacharbeiten/übersetzen, um es nutzbar zu machen.", reverse: true },
];
export const US_ITEMS = [
  { key: "US1", label: "Die Anwendung war einfach zu bedienen." },
  { key: "US2", label: "Ich würde dieses Vorgehen regelmäßig nutzen." },
  { key: "US3", label: "Ich benötige Schulung/Support, um es effizient zu nutzen.", reverse: true },
];
export const TAM_UTAUT_ITEMS = [
  { key: "PE1", label: "Das Tool verbessert die Qualität meiner Entscheidungen (Performance Expectancy)." },
  { key: "PE2", label: "Das Tool hilft mir, schneller zu belastbaren Entscheidungen zu kommen." },
  { key: "EE1", label: "Die Nutzung des Tools ist für mich leicht erlernbar (Effort Expectancy)." },
  { key: "EE2", label: "Der Umgang mit dem Tool ist im Alltag unkompliziert." },
  { key: "SI1", label: "Wichtige Personen in meinem Umfeld befürworten den Einsatz des Tools (Social Influence)." },
  { key: "SI2", label: "In meinem Team/Unternehmen wäre die Nutzung des Tools akzeptiert." },
  { key: "FC1", label: "Ich habe die nötigen Ressourcen/Infrastruktur für den Einsatz (Facilitating Conditions)." },
  { key: "FC2", label: "Ich hätte ausreichenden Support/Ansprechpersonen bei Problemen." },
];
export const COMP_ITEMS = [
  { key: "COMP1", label: "Insgesamt war die Entscheidungsqualität mit Tool höher als ohne Tool." },
  { key: "COMP2", label: "Insgesamt war die Belegbarkeit/Quellenbasis mit Tool höher." },
  { key: "COMP3", label: "Insgesamt war die Nachvollziehbarkeit mit Tool höher." },
  { key: "COMP4", label: "Insgesamt war der Zeitaufwand mit Tool geringer." },
  { key: "COMP5", label: "Insgesamt war die mentale Belastung mit Tool geringer." },
];
export const FIT_ITEMS = [
  { key: "FIT1", label: "Das Tool passt zu unseren typischen Entscheidungsprozessen." },
  { key: "FIT2", label: "Ich würde es im Team empfehlen." },
  { key: "FIT3", label: "Ich würde dafür Budget/Ressourcen priorisieren." },
];
export const GOV_ITEMS = [
  { key: "GOV1", label: "Datenschutz/Vertraulichkeit ist ein relevantes Risiko für den Einsatz.", reverse: true },
  { key: "GOV2", label: "Ich brauche klare Regeln/Policies, bevor ich so ein Tool nutze." },
  { key: "GOV3", label: "Die Outputs sind ausreichend auditierbar für Management/Stakeholder." },
];
