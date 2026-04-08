import type { Locale } from "@/lib/i18n";

export type Fb1SelectOption = { value: string; label: string };

export type Fragebogen1SelectOptions = {
  A1: Fb1SelectOption[];
  A2: Fb1SelectOption[];
  A3: Fb1SelectOption[];
  A6: Fb1SelectOption[];
  B1: Fb1SelectOption[];
};

/** Gespeicherte `value`-Strings bleiben unverändert (Abwärtskompatibilität); nur `label` ist sprachabhängig. */
export function getFragebogen1SelectOptions(locale: Locale): Fragebogen1SelectOptions {
  if (locale === "de") {
    return {
      A1: [
        { value: "Founder", label: "Gründer/in" },
        { value: "C-Level", label: "Geschäftsführung / C-Level" },
        { value: "Product", label: "Produkt" },
        { value: "Marketing/Sales", label: "Marketing / Vertrieb" },
        { value: "Finance", label: "Finanzen" },
        { value: "Ops", label: "Betrieb / Operations" },
        { value: "Sonstiges", label: "Sonstiges" },
      ],
      A2: [
        { value: "Idee", label: "Idee/Konzept – noch kein laufendes Geschäft" },
        { value: "Pre-Seed", label: "Vor erster größerer Finanzierung (Aufbau, Tests, Prototyp)" },
        { value: "Seed", label: "Erste Finanzierung eingenommen, Produkt am Markt" },
        { value: "Scale-up", label: "Wachstum stark ausweiten (skalieren)" },
        { value: "KMU", label: "Etabliertes KMU (klein/mittel)" },
      ],
      A3: [
        { value: "1", label: "1 Person" },
        { value: "2-5", label: "2–5 Personen" },
        { value: "6-15", label: "6–15 Personen" },
        { value: "16-50", label: "16–50 Personen" },
        { value: ">50", label: "über 50 Personen" },
      ],
      A6: [
        { value: "täglich", label: "täglich" },
        { value: "wöchentlich", label: "wöchentlich" },
        { value: "monatlich", label: "monatlich" },
        { value: "seltener", label: "seltener" },
      ],
      B1: [
        { value: "nie", label: "nie" },
        { value: "selten", label: "selten" },
        { value: "gelegentlich", label: "gelegentlich" },
        { value: "wöchentlich", label: "wöchentlich" },
        { value: "täglich", label: "täglich" },
      ],
    };
  }

  return {
    A1: [
      { value: "Founder", label: "Founder" },
      { value: "C-Level", label: "C-Level" },
      { value: "Product", label: "Product" },
      { value: "Marketing/Sales", label: "Marketing / Sales" },
      { value: "Finance", label: "Finance" },
      { value: "Ops", label: "Operations" },
      { value: "Sonstiges", label: "Other" },
    ],
    A2: [
      { value: "Idee", label: "Idea / concept — not yet an operating business" },
      { value: "Pre-Seed", label: "Before a major funding round (build, test, prototype)" },
      { value: "Seed", label: "First funding in; product live on the market" },
      { value: "Scale-up", label: "Rapid growth / scaling up" },
      { value: "KMU", label: "Established SME" },
    ],
    A3: [
      { value: "1", label: "1" },
      { value: "2-5", label: "2–5" },
      { value: "6-15", label: "6–15" },
      { value: "16-50", label: "16–50" },
      { value: ">50", label: ">50" },
    ],
    A6: [
      { value: "täglich", label: "daily" },
      { value: "wöchentlich", label: "weekly" },
      { value: "monatlich", label: "monthly" },
      { value: "seltener", label: "less often" },
    ],
    B1: [
      { value: "nie", label: "never" },
      { value: "selten", label: "rarely" },
      { value: "gelegentlich", label: "occasionally" },
      { value: "wöchentlich", label: "weekly" },
      { value: "täglich", label: "daily" },
    ],
  };
}
