"use client";

import { useFormStatus } from "react-dom";
import { SUBMIT_BUTTON_PENDING_CLASS } from "@/lib/submitButtonStyle";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Submit-Button innerhalb eines &lt;form&gt; mit Server Action: zeigt gedrückten Zustand während pending.
 */
export function PendingSubmitButton({ children, className = "" }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 hover:enabled:shadow disabled:opacity-100 ${pending ? SUBMIT_BUTTON_PENDING_CLASS : ""} ${className}`}
    >
      {children}
    </button>
  );
}
