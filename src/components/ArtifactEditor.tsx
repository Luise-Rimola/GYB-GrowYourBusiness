"use client";

import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTranslations } from "@/lib/i18n";

type ArtifactEditorCopy = ReturnType<typeof getTranslations>["artifactEditor"];

const inputClass = "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm dark:bg-[var(--card)]";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mt-3 first:mt-0";

type SegmentRecord = Record<string, unknown>;

function SegmentFields({
  segment,
  onChange,
  onRemove,
  canRemove,
  te,
}: {
  segment: SegmentRecord;
  onChange: (s: SegmentRecord) => void;
  onRemove: () => void;
  canRemove: boolean;
  te: ArtifactEditorCopy;
}) {
  const update = (key: string, value: string | string[]) => {
    onChange({ ...segment, [key]: value });
  };
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(",").map((x) => x.trim()) : []);
  const join = (v: string[]) => v.join(", ");

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <label className={labelClass}>{te.segmentKey}</label>
            <input
              value={String(segment.segment_key ?? "")}
              onChange={(e) => update("segment_key", e.target.value)}
              className={inputClass}
              placeholder={te.placeholderSegmentKey}
            />
          </div>
          <div>
            <label className={labelClass}>{te.who}</label>
            <textarea
              value={String(segment.who ?? "")}
              onChange={(e) => update("who", e.target.value)}
              className={inputClass}
              rows={2}
              placeholder={te.placeholderWho}
            />
          </div>
          <div>
            <label className={labelClass}>{te.jobsToBeDone}</label>
            <textarea
              value={String(segment.jobs_to_be_done ?? "")}
              onChange={(e) => update("jobs_to_be_done", e.target.value)}
              className={inputClass}
              rows={2}
              placeholder={te.placeholderJtbd}
            />
          </div>
          <div>
            <label className={labelClass}>{te.whatTheyBuy}</label>
            <textarea
              value={String(segment.what_they_buy ?? "")}
              onChange={(e) => update("what_they_buy", e.target.value)}
              className={inputClass}
              rows={2}
              placeholder={te.placeholderBuy}
            />
          </div>
          <div>
            <label className={labelClass}>{te.decisionDrivers}</label>
            <input
              value={join(arr(segment.decision_drivers))}
              onChange={(e) => update("decision_drivers", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
              className={inputClass}
              placeholder={te.placeholderDrivers}
            />
          </div>
          <div>
            <label className={labelClass}>{te.channelFit}</label>
            <input
              value={join(arr(segment.channel_fit))}
              onChange={(e) => update("channel_fit", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
              className={inputClass}
              placeholder={te.placeholderChannel}
            />
          </div>
          <div>
            <label className={labelClass}>{te.priceSensitivity}</label>
            <input
              value={String(segment.price_sensitivity ?? "")}
              onChange={(e) => update("price_sensitivity", e.target.value)}
              className={inputClass}
              placeholder={te.placeholderPrice}
            />
          </div>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/50"
          >
            {te.remove}
          </button>
        )}
      </div>
    </div>
  );
}

function MarketEditor({
  content,
  onChange,
  te,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  te: ArtifactEditorCopy;
}) {
  const segments = (content.segments as SegmentRecord[]) ?? [];
  const competitors = (content.competitors as SegmentRecord[]) ?? [];
  const drivers = (content.demand_drivers as string[]) ?? [];
  const risks = (content.risks as string[]) ?? [];
  const sourcesUsed = (content.sources_used as string[]) ?? [];

  const updateSegment = (i: number, s: SegmentRecord) => {
    const next = [...segments];
    next[i] = s;
    onChange({ ...content, segments: next });
  };
  const addSegment = () => {
    onChange({
      ...content,
      segments: [
        ...segments,
        {
          segment_key: "",
          who: "",
          jobs_to_be_done: "",
          what_they_buy: "",
          decision_drivers: [],
          channel_fit: [],
          price_sensitivity: "",
        },
      ],
    });
  };
  const removeSegment = (i: number) => {
    onChange({ ...content, segments: segments.filter((_, j) => j !== i) });
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{te.segments}</h3>
          <button type="button" onClick={addSegment} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
            {te.addSegment}
          </button>
        </div>
        <div className="space-y-4">
          {segments.map((s, i) => (
            <SegmentFields
              key={i}
              segment={s}
              onChange={(ns) => updateSegment(i, ns)}
              onRemove={() => removeSegment(i)}
              canRemove={segments.length > 1}
              te={te}
            />
          ))}
          {segments.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--background)]/50 p-6 text-center text-sm text-[var(--muted)]">
              {te.noSegmentsYet}
            </p>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{te.demandDrivers}</h3>
        <textarea
          value={drivers.join("\n")}
          onChange={(e) => onChange({ ...content, demand_drivers: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
          className={inputClass}
          rows={3}
          placeholder={te.placeholderDemandDriverLine}
        />
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{te.risks}</h3>
        <textarea
          value={risks.join("\n")}
          onChange={(e) => onChange({ ...content, risks: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
          className={inputClass}
          rows={2}
          placeholder={te.placeholderRiskLine}
        />
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{te.sourcesUsed}</h3>
        <textarea
          value={sourcesUsed.join("\n")}
          onChange={(e) => onChange({ ...content, sources_used: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })}
          className={inputClass}
          rows={2}
          placeholder={te.placeholderSourceLine}
        />
      </section>

      {competitors.length > 0 && (
        <section>
          <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">{te.competitors}</h3>
          <p className="text-xs text-[var(--muted)]">{te.competitorsJsonHint}</p>
        </section>
      )}
    </div>
  );
}

function SwotEditor({
  content,
  onChange,
  te,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  te: ArtifactEditorCopy;
}) {
  const strengths = ((content.strengths as string[]) ?? []).join("\n");
  const weaknesses = ((content.weaknesses as string[]) ?? []).join("\n");
  const opportunities = ((content.opportunities as string[]) ?? []).join("\n");
  const threats = ((content.threats as string[]) ?? []).join("\n");

  const setArr = (key: string, val: string) => {
    onChange({ ...content, [key]: val.split("\n").map((x) => x.trim()).filter(Boolean) });
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <label className={labelClass}>{te.strengths}</label>
        <textarea
          value={strengths}
          onChange={(e) => setArr("strengths", e.target.value)}
          className={inputClass}
          rows={4}
          placeholder={te.placeholderOnePerLine}
        />
      </div>
      <div>
        <label className={labelClass}>{te.weaknesses}</label>
        <textarea
          value={weaknesses}
          onChange={(e) => setArr("weaknesses", e.target.value)}
          className={inputClass}
          rows={4}
          placeholder={te.placeholderOnePerLine}
        />
      </div>
      <div>
        <label className={labelClass}>{te.opportunities}</label>
        <textarea
          value={opportunities}
          onChange={(e) => setArr("opportunities", e.target.value)}
          className={inputClass}
          rows={4}
          placeholder={te.placeholderOnePerLine}
        />
      </div>
      <div>
        <label className={labelClass}>{te.threats}</label>
        <textarea value={threats} onChange={(e) => setArr("threats", e.target.value)} className={inputClass} rows={4} placeholder={te.placeholderOnePerLine} />
      </div>
    </div>
  );
}

function GenericEditor({
  content,
  onChange,
  te,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  te: ArtifactEditorCopy;
}) {
  const [raw, setRaw] = useState(JSON.stringify(content, null, 2));
  const [error, setError] = useState<string | null>(null);

  const applyRaw = useCallback(() => {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setError(null);
      onChange(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : te.invalidJson);
    }
  }, [raw, onChange, te.invalidJson]);

  return (
    <div className="space-y-2">
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={applyRaw}
        className={`min-h-[200px] w-full rounded-xl border p-4 font-mono text-xs ${error ? "border-rose-500" : "border-[var(--card-border)]"} bg-[var(--background)] dark:bg-[var(--card)]`}
        spellCheck={false}
      />
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function ArtifactEditor({
  artifactType,
  content,
  submitAction,
  artifactId,
  redirectTo,
}: {
  artifactType: string;
  content: Record<string, unknown>;
  submitAction: (formData: FormData) => Promise<void>;
  artifactId: string;
  redirectTo?: string;
}) {
  const { locale } = useLanguage();
  const te = getTranslations(locale).artifactEditor;

  const [edited, setEdited] = useState<Record<string, unknown>>(content);
  const [rawValue, setRawValue] = useState(JSON.stringify(content, null, 2));
  const [mode, setMode] = useState<"form" | "raw">(
    artifactType === "market" || artifactType === "market_research" || artifactType === "swot_analysis" ? "form" : "raw"
  );

  const jsonStr = JSON.stringify(edited, null, 2);

  const switchToForm = () => {
    try {
      setEdited(JSON.parse(rawValue || "{}") as Record<string, unknown>);
    } catch {
      // keep raw on parse error
    }
    setMode("form");
  };
  const switchToRaw = () => {
    setRawValue(jsonStr);
    setMode("raw");
  };

  return (
    <form action={submitAction} className="space-y-4">
      <input type="hidden" name="id" value={artifactId} />
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}
      {mode === "form" ? <input type="hidden" name="content_json" value={jsonStr} /> : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={switchToForm}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === "form" ? "bg-teal-600 text-white" : "border border-[var(--card-border)] hover:bg-teal-50 dark:hover:bg-teal-950/30"}`}
        >
          {te.formMode}
        </button>
        <button
          type="button"
          onClick={switchToRaw}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${mode === "raw" ? "bg-teal-600 text-white" : "border border-[var(--card-border)] hover:bg-teal-50 dark:hover:bg-teal-950/30"}`}
        >
          {te.rawJsonMode}
        </button>
      </div>

      {mode === "form" ? (
        <>
          {(artifactType === "market" || artifactType === "market_research") && <MarketEditor content={edited} onChange={setEdited} te={te} />}
          {artifactType === "swot_analysis" && <SwotEditor content={edited} onChange={setEdited} te={te} />}
          {!["market", "market_research", "swot_analysis"].includes(artifactType) && <GenericEditor content={edited} onChange={setEdited} te={te} />}
        </>
      ) : (
        <textarea
          name="content_json"
          value={rawValue}
          onChange={(e) => setRawValue(e.target.value)}
          className="min-h-[300px] w-full rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4 font-mono text-xs dark:bg-[var(--card)]"
          spellCheck={false}
        />
      )}

      <button type="submit" className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700">
        {te.save}
      </button>
    </form>
  );
}
