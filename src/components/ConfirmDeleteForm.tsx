"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

type ConfirmDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  cancelLabel?: string;
  confirmLabel?: string;
};

export function ConfirmDeleteForm({
  action,
  confirmMessage,
  children,
  className,
  title = "Bestätigung",
  cancelLabel = "Abbrechen",
  confirmLabel = "Löschen",
}: ConfirmDeleteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showModal, setShowModal] = useState(false);
  const allowSubmitRef = useRef(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!allowSubmitRef.current) {
      e.preventDefault();
      setShowModal(true);
    }
  };

  const handleConfirm = () => {
    allowSubmitRef.current = true;
    formRef.current?.requestSubmit();
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showModal]);

  const modalContent = showModal && typeof document !== "undefined" ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{confirmMessage}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <form ref={formRef} action={action} onSubmit={handleSubmit} className={className}>
        {children}
      </form>
      {modalContent}
    </>
  );
}
