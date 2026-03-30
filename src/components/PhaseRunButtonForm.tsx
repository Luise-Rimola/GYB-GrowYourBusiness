"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PhaseRunButtonFormProps = {
  formId: string;
  phaseId: string;
  buttonLabel: string;
  workflows: { key: string; name: string }[];
};

export function PhaseRunButtonForm({ formId, phaseId, buttonLabel, workflows }: PhaseRunButtonFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [openManualModal, setOpenManualModal] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpenMenu(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function runAutomatically() {
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("phase_id", phaseId);
    const checked = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        `input[form="${formId}"][name="workflow_keys"]:checked`
      )
    );
    for (const input of checked) formData.append("workflow_keys", input.value);

    try {
      const res = await fetch("/api/dashboard/start-phase-runs", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        const text =
          data?.error === "llm_missing"
            ? "Bitte hinterlege eine LLM API in den Einstellungen oder führe die Schritte manuell durch."
            : data?.error ?? "Prozesse konnten nicht gestartet werden.";
        setMessage({ tone: "error", text });
        setLoading(false);
        return;
      }
      setMessage({ tone: "ok", text: "Prozesse wurden erfolgreich gestartet." });
    } catch {
      setMessage({ tone: "error", text: "Prozesse konnten nicht gestartet werden." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={rootRef} className="relative flex flex-col items-end gap-1">
      <div>
        <button
          type="submit"
          disabled={loading}
          onClick={(e) => {
            e.preventDefault();
            setOpenMenu((v) => !v);
          }}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Läuft…" : buttonLabel}
        </button>
        {openMenu && !loading && (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-[220px] rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-2 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setOpenMenu(false);
                void runAutomatically();
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-[var(--background)]"
            >
              Automatisch ausführen
            </button>
            <button
              type="button"
              onClick={() => {
                setOpenMenu(false);
                setOpenManualModal(true);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-[var(--background)]"
            >
              Manueller Assistent
            </button>
          </div>
        )}
      </div>
      {message ? (
        <p className={`text-[11px] ${message.tone === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</p>
      ) : null}
      {openManualModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenManualModal(false);
          }}
        >
          <div className="w-full max-w-xl rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Manueller Assistent – diese Phase</h3>
              <button
                type="button"
                onClick={() => setOpenManualModal(false)}
                className="rounded-lg border border-[var(--card-border)] px-2 py-1 text-xs"
              >
                Schließen
              </button>
            </div>
            <div className="space-y-3 px-4 py-3">
              <p className="text-xs text-[var(--muted)]">
                Diese Prozesse gehören zur ausgewählten Phase:
              </p>
              <div className="space-y-2">
                {workflows.map((wf, i) => (
                  <div key={wf.key} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm">
                    {i + 1}. {wf.name}
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <Link
                  href={`/assistant/workflows?phase=${phaseId}`}
                  className="inline-block rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Assistent für diese Phase öffnen
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
