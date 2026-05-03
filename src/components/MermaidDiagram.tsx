"use client";

import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  flowchart: { useMaxWidth: true, htmlLabels: true },
});

export function MermaidDiagram({ chart, id }: { chart: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current || !chart) return;
    const render = async () => {
      try {
        setError(null);
        const mount = ref.current;
        if (!mount) return;
        mount.innerHTML = "";
        await mermaid.parse(chart);
        const uid = `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg } = await mermaid.render(`mermaid-${uid}`, chart);
        mount.innerHTML = svg;
        if (!mount.querySelector("svg")) {
          throw new Error("Diagramm konnte nicht gerendert werden.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to render diagram");
      }
    };
    render();
  }, [chart, id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return <div ref={ref} className="mermaid-diagram flex justify-center overflow-x-auto" />;
}
