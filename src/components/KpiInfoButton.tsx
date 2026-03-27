"use client";

import { useState, useRef, useEffect } from "react";

type KpiInfoButtonProps =
  | { content: string; label: string; "aria-label": string; description?: never; formula?: never; descriptionLabel?: never; formulaLabel?: never; meaning?: never; meaningLabel?: never }
  | { content?: never; label?: never; "aria-label": string; description: string; formula: string; descriptionLabel: string; formulaLabel: string; meaning?: string; meaningLabel?: string };

export function KpiInfoButton(props: KpiInfoButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const hasContent = "content" in props
    ? props.content?.trim()
    : (props.meaning?.trim() || props.description?.trim() || props.formula?.trim());

  if (!hasContent) return null;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={props["aria-label"]}
        aria-expanded={open}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-600 transition hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300 dark:hover:bg-teal-800/50"
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-w-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          role="tooltip"
        >
          {"content" in props ? (
            <>
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">{props.label}</p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-300">{props.content}</p>
            </>
          ) : (
            <div className="space-y-2">
              {props.meaning?.trim() && (
                <div>
                  <p className="font-semibold text-zinc-700 dark:text-zinc-200">{props.meaningLabel}</p>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">{props.meaning}</p>
                </div>
              )}
              {props.description?.trim() && (
                <div>
                  <p className="font-semibold text-zinc-700 dark:text-zinc-200">{props.descriptionLabel}</p>
                  <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">{props.description}</p>
                </div>
              )}
              {props.formula?.trim() && (
                <div>
                  <p className="font-semibold text-zinc-700 dark:text-zinc-200">{props.formulaLabel}</p>
                  <p className="mt-0.5 font-mono text-zinc-600 dark:text-zinc-300">{props.formula}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
