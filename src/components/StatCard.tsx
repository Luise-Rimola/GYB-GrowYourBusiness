import Link from "next/link";

type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
  href?: string;
};

export function StatCard({ title, value, hint, href }: StatCardProps) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </>
  );
  const className = "group block rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-lg shadow-zinc-200/50 transition hover:shadow-xl hover:shadow-teal-500/5 dark:shadow-zinc-950/50 dark:hover:shadow-teal-500/5";
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
