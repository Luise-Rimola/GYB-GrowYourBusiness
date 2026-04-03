"use client";

import { ReactNode, useState } from "react";

type CollapsibleDetailsProps = {
  defaultOpen?: boolean;
  summaryClassName?: string;
  contentClassName?: string;
  label: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CollapsibleDetails({
  defaultOpen = false,
  summaryClassName,
  contentClassName,
  label,
  children,
  className,
}: CollapsibleDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className={className} open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={summaryClassName}>
        <span className="inline-flex items-center gap-1">
          <span
            className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▸
          </span>
          {label}
        </span>
      </summary>
      <div className={contentClassName}>{children}</div>
    </details>
  );
}
