"use client";

import type { ReactNode } from "react";

type HistoryBackLinkProps = {
  fallbackHref: string;
  className?: string;
  children: ReactNode;
};

export function HistoryBackLink({
  fallbackHref,
  className,
  children,
}: HistoryBackLinkProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = fallbackHref;
      }}
      className={className}
    >
      {children}
    </button>
  );
}
