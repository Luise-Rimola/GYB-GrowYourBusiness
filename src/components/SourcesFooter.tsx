"use client";

/**
 * Parse one sources_used line into title + optional URL.
 * Supports: "Title (https://...)", markdown "[label](url)", and "Title ([label](url))" from LLMs.
 */
function parseSourceLine(str: string): { title: string; url: string | null } {
  const s = String(str).trim();
  if (!s) return { title: "", url: null };

  // Plain "Title (https://...)" — not markdown inside the parens
  const plain = s.match(/^(.+?)\s*\((https?:\/\/[^)]+)\)$/);
  if (plain && !/^\[/.test(plain[1]) && !plain[1].includes("](")) {
    return { title: plain[1].trim(), url: plain[2] };
  }

  // Markdown [text](url) — take last match (often the real link after a duplicate label URL)
  const mdMatches = [...s.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g)];
  if (mdMatches.length) {
    const url = mdMatches[mdMatches.length - 1][2];
    let title = s
      .replace(/\s*\(\[[^\]]*\]\([^)]+\)\)\s*$/, "")
      .replace(/\s*\[[^\]]*\]\([^)]+\)\s*$/, "")
      .trim();
    if (!title) title = mdMatches[mdMatches.length - 1][1].trim() || url;
    return { title, url };
  }

  if (s.startsWith("http://") || s.startsWith("https://")) {
    return { title: s, url: s };
  }

  // Any bare URL in the line (fallback)
  const urlMatch = s.match(/(https?:\/\/[^\s)\]]+)/);
  if (urlMatch) {
    const url = urlMatch[1];
    let title = s.slice(0, urlMatch.index).trim().replace(/\(\s*$/, "").trim();
    return { title: title || url, url };
  }

  return { title: s, url: null };
}

/**
 * Renders sources_used as a numbered list at the end of an artifact.
 * Parses "Title (URL)" and common markdown link shapes; makes URLs clickable.
 */
export function SourcesFooter({ sources, showTitle = true }: { sources: string[]; showTitle?: boolean }) {
  if (!sources || sources.length === 0) return null;

  const parsed = sources.map((s) => parseSourceLine(s));

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
