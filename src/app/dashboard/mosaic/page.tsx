export default function MosaicDashboardPage() {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Demo-Ansicht (Premium)</p>
          <p className="mt-1">
            Dieses Dashboard ist eine externe Demo. Die produktive Version ist als Premium-Feature enthalten
            und wird individuell in eure App implementiert.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)] shadow-sm">
          <iframe
            src="https://flux-dashboard.pages.dev/?theme=emerald"
            title="Flux Dashboard Demo"
            className="h-[82vh] w-full"
          />
        </div>
      </div>
    </div>
  );
}
