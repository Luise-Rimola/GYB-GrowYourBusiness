type BadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

const toneStyles = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

export function Badge({ label, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
}
