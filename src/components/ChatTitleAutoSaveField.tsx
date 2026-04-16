"use client";

import { useEffect, useRef, useState } from "react";
import { fetchApi } from "@/lib/apiClient";

type ChatTitleAutoSaveFieldProps = {
  threadId: string;
  initialTitle: string;
};

export function ChatTitleAutoSaveField({ threadId, initialTitle }: ChatTitleAutoSaveFieldProps) {
  const [value, setValue] = useState(initialTitle);
  const lastSavedRef = useRef(initialTitle);

  async function saveNow(nextValue: string) {
    const trimmed = nextValue.trim().slice(0, 120);
    if (!trimmed || trimmed === lastSavedRef.current) return;
    try {
      await fetchApi("/api/chat/thread-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, title: trimmed }),
        keepalive: true,
      });
      lastSavedRef.current = trimmed;
    } catch {
      // ignore temporary save errors
    }
  }

  useEffect(() => {
    return () => {
      void saveNow(value);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void saveNow(value)}
      maxLength={120}
      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Chat-Titel"
    />
  );
}
