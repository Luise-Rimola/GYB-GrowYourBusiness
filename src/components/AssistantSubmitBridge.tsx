"use client";

import { useEffect } from "react";

type SubmitMessage = {
  type: "assistant-submit";
  token: string;
};

type AckMessage = {
  type: "assistant-submit-ack";
  token: string;
};

/**
 * Bridge im iframe: löst beim Parent (Workflow-Assistent) ein requestSubmit() für das FB-Formular aus.
 */
export function AssistantSubmitBridge() {
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as Partial<SubmitMessage> | null;
      if (!data || data.type !== "assistant-submit") return;

      const token = String(data.token ?? "");
      const form = document.querySelector('form[data-assistant-form="1"]') as HTMLFormElement | null;
      if (!form) return;

      try {
        if (typeof (form as any).requestSubmit === "function") {
          (form as any).requestSubmit();
        } else {
          form.submit();
        }
      } finally {
        const ack: AckMessage = { type: "assistant-submit-ack", token };
        try {
          window.parent.postMessage(ack, "*");
        } catch {
          // ignore
        }
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}

