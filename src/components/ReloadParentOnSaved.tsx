"use client";

import { useEffect } from "react";

export function ReloadParentOnSaved({ saved }: { saved?: string }) {
  useEffect(() => {
    if (saved === "1") {
      if (window.parent !== window) {
        window.parent.postMessage(
          { type: "assistant-reload" },
          window.location.origin
        );
      } else {
        window.location.reload();
      }
    }
  }, [saved]);

  return null;
}