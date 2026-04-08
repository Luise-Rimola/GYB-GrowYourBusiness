/**
 * Gemeinsame Likert-Items für Fragebogen 2–4.
 * Anzeige-Texte kommen aus i18n (`study.fbScale{KEY}`), abhängig von der Locale.
 */

export type ScaleItemMeta = { key: string; reverse?: boolean };

/** Label für ein Item aus dem `study`-Übersetzungsobjekt (Server/Client). */
export function scaleLabelFromStudy(t: Record<string, string>, itemKey: string): string {
  const v = t[`fbScale${itemKey}`];
  return typeof v === "string" && v.length > 0 ? v : itemKey;
}

export const DQ_ITEMS: ScaleItemMeta[] = [
  { key: "DQ1" },
  { key: "DQ2" },
  { key: "DQ3" },
  { key: "DQ4" },
];
export const EV_ITEMS: ScaleItemMeta[] = [
  { key: "EV1" },
  { key: "EV2" },
  { key: "EV3" },
  { key: "EV4" },
];
export const TR_ITEMS: ScaleItemMeta[] = [
  { key: "TR1" },
  { key: "TR2" },
  { key: "TR3" },
];
export const CF_ITEMS: ScaleItemMeta[] = [
  { key: "CF1" },
  { key: "CF2" },
  { key: "CF3", reverse: true },
];
export const CL_ITEMS: ScaleItemMeta[] = [
  { key: "CL1", reverse: true },
  { key: "CL2" },
  { key: "CL3", reverse: true },
];
export const US_ITEMS: ScaleItemMeta[] = [
  { key: "US1" },
  { key: "US2" },
  { key: "US3", reverse: true },
];
export const TAM_UTAUT_ITEMS: ScaleItemMeta[] = [
  { key: "PE1" },
  { key: "PE2" },
  { key: "EE1" },
  { key: "EE2" },
  { key: "SI1" },
  { key: "SI2" },
  { key: "FC1" },
  { key: "FC2" },
];
export const COMP_ITEMS: ScaleItemMeta[] = [
  { key: "COMP1" },
  { key: "COMP2" },
  { key: "COMP3" },
  { key: "COMP4" },
  { key: "COMP5" },
];
export const FIT_ITEMS: ScaleItemMeta[] = [
  { key: "FIT1" },
  { key: "FIT2" },
  { key: "FIT3" },
];
export const GOV_ITEMS: ScaleItemMeta[] = [
  { key: "GOV1", reverse: true },
  { key: "GOV2" },
  { key: "GOV3" },
];

/** Keys mit Text in `study.fbScale{KEY}` (Export / Abfragen). */
export const ALL_LIKERT_SCALE_KEYS = new Set<string>([
  ...DQ_ITEMS.map((i) => i.key),
  ...EV_ITEMS.map((i) => i.key),
  ...TR_ITEMS.map((i) => i.key),
  ...CF_ITEMS.map((i) => i.key),
  ...CL_ITEMS.map((i) => i.key),
  ...US_ITEMS.map((i) => i.key),
  ...TAM_UTAUT_ITEMS.map((i) => i.key),
  ...COMP_ITEMS.map((i) => i.key),
  ...FIT_ITEMS.map((i) => i.key),
  ...GOV_ITEMS.map((i) => i.key),
]);
