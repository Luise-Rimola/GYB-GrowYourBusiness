"use client";

type Col = { name: string; type: string; constraints?: string };
type TableRow = { name: string; columns: Col[]; description?: string };

function asTableRow(raw: unknown): TableRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  if (!name) return null;
  const colsRaw = o.columns;
  const columns: Col[] = Array.isArray(colsRaw)
    ? colsRaw.flatMap((c): Col[] => {
        if (!c || typeof c !== "object") return [];
        const cc = c as Record<string, unknown>;
        const cn = String(cc.name ?? "").trim();
        const ct = String(cc.type ?? "").trim();
        if (!cn && !ct) return [];
        return [
          {
            name: cn || "—",
            type: ct || "—",
            constraints: cc.constraints != null ? String(cc.constraints) : undefined,
          },
        ];
      })
    : [];
  return {
    name,
    columns,
    description: o.description != null ? String(o.description) : undefined,
  };
}

/** Entspricht dem Prüfprotokoll: gleiche JSON-Struktur wie `app_db_schema`. */
export function AppDbSchemaReportView({ content }: { content: Record<string, unknown> }) {
  const tablesRaw = Array.isArray(content.tables) ? content.tables : [];
  const tables = tablesRaw.map(asTableRow).filter((x): x is TableRow => x !== null);
  const relationships = Array.isArray(content.relationships) ? content.relationships.map(String).filter(Boolean) : [];
  const recommendations = Array.isArray(content.recommendations) ? content.recommendations.map(String).filter(Boolean) : [];

  if (tables.length === 0 && relationships.length === 0 && recommendations.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        <em>In den gespeicherten Daten wurden keine Tabellen, Beziehungen oder Empfehlungen gefunden.</em>
      </p>
    );
  }

  return (
    <div className="space-y-10 text-sm text-[var(--foreground)]">
      {tables.length > 0 ? (
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Datenbank-Tabellen</h3>
      ) : null}
      {tables.map((tbl, ti) => (
        <section key={`${tbl.name}-${ti}`} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">Tabelle</p>
          <p className="mb-3 text-base font-semibold text-[var(--foreground)]">{tbl.name}</p>
          {tbl.description ? (
            <p className="mb-4 text-xs text-[var(--muted)]">{tbl.description}</p>
          ) : (
            <div className="mb-4" />
          )}
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            SPALTEN (COLUMNS)
          </h4>
          <ul className="space-y-4">
            {tbl.columns.map((col, ci) => (
              <li
                key={`${tbl.name}-${col.name}-${ci}`}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 p-3"
              >
                <p className="font-semibold">{col.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  <span className="font-medium text-[var(--foreground)]">TYP:</span> {col.type}
                </p>
                {col.constraints ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    <span className="font-medium text-[var(--foreground)]">Einschränkungen:</span> {col.constraints}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {tbl.columns.length === 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Keine Spalten in dieser Tabelle dokumentiert.</p>
          ) : null}
        </section>
      ))}

      {relationships.length > 0 ? (
        <section>
          <h3 className="mb-3 text-lg font-semibold">Beziehungen (Relationships)</h3>
          <ul className="list-disc space-y-1 pl-5">
            {relationships.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {recommendations.length > 0 ? (
        <section>
          <h3 className="mb-3 text-lg font-semibold">Empfehlungen</h3>
          <ul className="list-disc space-y-1 pl-5">
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
