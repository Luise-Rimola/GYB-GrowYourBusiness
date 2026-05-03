/**
 * Ob strukturierte Inhalte vorliegen (für Fallback-Rendering ohne exportHtml).
 * `sources_used` zählt nicht als „Kerndokument“ (wird oft separat als Quellenleiste angezeigt).
 */
export function hasRenderableArtifactContent(content: Record<string, unknown> | null | undefined): boolean {
  if (!content || typeof content !== "object") return false;

  function has(v: unknown, depth = 0): boolean {
    if (depth > 12) return true;
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "number" || typeof v === "boolean") return true;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0 && v.some((x) => has(x, depth + 1));
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      const keys = Object.keys(o);
      if (keys.length === 0) return false;
      return keys.some((k) => has(o[k], depth + 1));
    }
    return false;
  }

  return Object.entries(content).some(([k, v]) => k !== "sources_used" && has(v));
}
