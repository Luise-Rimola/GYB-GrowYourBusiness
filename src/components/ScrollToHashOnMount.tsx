"use client";

import { useEffect } from "react";

/** Scrollt zu `#id`, wenn die URL genau diesen Hash hat (z. B. Einstellungen → LLM). */
export function ScrollToHashOnMount({
  id,
  behavior = "smooth",
}: {
  id: string;
  behavior?: ScrollBehavior;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== `#${id}`) return;
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
    });
  }, [id, behavior]);
  return null;
}
