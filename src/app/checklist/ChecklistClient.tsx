"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ChecklistClientLabels = {
  addCategory: string;
  newCategoryPlaceholder: string;
  addCategoryButton: string;
  allDoneMessage: string;
  setAllNo: string;
  fileAttached: string;
  noFile: string;
  newStepPlaceholder: string;
  addStepButton: string;
};

type Step = {
  id: string;
  label: string;
  done: boolean;
  fileUri: string | null;
};

type Stage = {
  id: string;
  name: string;
  steps: Step[];
};

type Props = {
  companyId: string;
  stages: Stage[];
  labels: ChecklistClientLabels;
  locale: "de" | "en";
};

export function ChecklistClient({ companyId, stages, labels, locale }: Props) {
  const router = useRouter();
  const [newStageName, setNewStageName] = useState("");
  const [newStepByStage, setNewStepByStage] = useState<Record<string, string>>({});

  const DE_LABELS: Record<string, string> = {
    "Brand & Identity": "Marke & Identität",
    "Digital Presence": "Digitale Präsenz",
    "Product & Menu": "Produkt & Angebot",
    Operations: "Betrieb",
    "Legal & Admin": "Recht & Verwaltung",
    "Launch Prep": "Launch-Vorbereitung",
    Logo: "Logo",
    "Brand colors": "Markenfarben",
    "Brand guidelines": "Markenrichtlinien",
    Website: "Website",
    "Social media accounts": "Social-Media-Konten",
    "Google Business Profile": "Google-Unternehmensprofil",
    "Menu / product catalogue": "Menü / Produktkatalog",
    Pricing: "Preise",
    Packaging: "Verpackung",
    "Supplier recruiting": "Lieferanten gewinnen",
    "Inventory system": "Lagerverwaltung",
    "POS / ordering system": "Kasse / Bestellsystem",
    "Business registration": "Gewerbeanmeldung / Registrierung",
    "Tax setup": "Steuern einrichten",
    Insurance: "Versicherung",
    "Soft launch / trial": "Softlaunch / Testlauf",
    "Marketing materials": "Marketingmaterial",
    "Opening day plan": "Plan für den Launch-Tag",
  };

  const normalizeLabel = (value: string) => (locale === "de" ? DE_LABELS[value] ?? value : value);

  async function toggleStep(stepId: string, done: boolean) {
    await fetch("/api/checklist/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stepId, done }),
    });
    router.refresh();
  }

  async function setStageAllNo(stageId: string) {
    await fetch("/api/checklist/stage-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, done: false }),
    });
    router.refresh();
  }

  async function addStage() {
    const name = newStageName.trim();
    if (!name) return;
    await fetch("/api/checklist/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, name }),
    });
    setNewStageName("");
    router.refresh();
  }

  async function addStep(stageId: string) {
    const label = (newStepByStage[stageId] ?? "").trim();
    if (!label) return;
    await fetch("/api/checklist/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, label }),
    });
    setNewStepByStage((prev) => ({ ...prev, [stageId]: "" }));
    router.refresh();
  }

  const allDone = stages.every((s) => s.steps.every((t) => t.done));
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{labels.addCategory}</p>
        <div className="flex gap-2">
          <input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            placeholder={labels.newCategoryPlaceholder}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addStage}
            aria-label={labels.addCategoryButton}
            title={labels.addCategoryButton}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            +
          </button>
        </div>
      </div>

      {allDone && (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800 dark:border-teal-800 dark:bg-teal-950/20 dark:text-teal-200">
          ✓ {labels.allDoneMessage}
        </p>
      )}

      <div className="space-y-4">
        {stages.map((stage) => {
          const doneCount = stage.steps.filter((t) => t.done).length;

          return (
            <div
              key={stage.id}
              className="rounded-2xl border border-teal-200 dark:border-teal-800 bg-[var(--card)] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-[var(--foreground)]">{normalizeLabel(stage.name)}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">
                    {doneCount}/{stage.steps.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStageAllNo(stage.id)}
                    className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30"
                  >
                    {labels.setAllNo}
                  </button>
                </div>
              </div>

              <ul className="space-y-2">
                {stage.steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id, !step.done)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                        step.done
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-[var(--card-border)] hover:border-teal-400"
                      }`}
                    >
                      {step.done ? "✓" : ""}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        step.done ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"
                      }`}
                    >
                      {normalizeLabel(step.label)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  value={newStepByStage[stage.id] ?? ""}
                  onChange={(e) => setNewStepByStage((prev) => ({ ...prev, [stage.id]: e.target.value }))}
                  placeholder={labels.newStepPlaceholder}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => addStep(stage.id)}
                  aria-label={labels.addStepButton}
                  title={labels.addStepButton}
                  className="rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-950/30"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
