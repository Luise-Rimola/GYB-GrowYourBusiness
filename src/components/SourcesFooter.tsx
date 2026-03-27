"use client";

/**
 * Renders sources_used as a numbered list at the end of an artifact.
 * Parses "Title (URL)" format and makes URLs clickable.
 */
export function SourcesFooter({ sources, showTitle = true }: { sources: string[]; showTitle?: boolean }) {
  if (!sources || sources.length === 0) return null;

  const parsed = sources.map((s) => {
    const str = String(s).trim();
    // Match "Title (https://...)" or "Title (http://...)"
    const match = str.match(/^(.+?)\s*\((https?:\/\/[^)]+)\)$/);
    if (match) {
      return { title: match[1].trim(), url: match[2] };
    }
    // If starts with http, treat as URL
    if (str.startsWith("http://") || str.startsWith("https://")) {
      return { title: str, url: str };
    }
    return { title: str, url: null };
  });

  return (
    <section className={showTitle ? "mt-8 border-t border-[var(--card-border)] pt-6" : ""}>
      {showTitle && <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Quellen</h3>}
      <ol className="space-y-2 text-sm">
        {parsed.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-medium text-[var(--muted)]">[{i + 1}]</span>
            {p.url ? (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 underline"
              >
                {p.title}
              </a>
            ) : (
              <span>{p.title}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
