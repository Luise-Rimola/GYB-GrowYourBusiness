/**
 * Background-Jobs für das Phasen-"Ausführen".
 *
 * Hintergrund: Der alte Loop lief vollständig im Browser-Tab — sobald der
 * User navigierte oder die Seite neu lud, brach die Queue ab. Damit ein
 * einmal gestarteter Batch unabhängig vom Browser-Lifecycle fertig läuft,
 * speichern wir den Fortschritt in `PhaseRunJob` und lassen den Worker
 * direkt im Node-Prozess des Next-Servers laufen.
 *
 * Der Worker ruft `executeRunStepForCompany` direkt auf (kein HTTP-Hop,
 * keine Cookies). Workflows einer Phase laufen nacheinander in der
 * Phasen-Reihenfolge (`PLANNING_PHASES`), damit Kontextabhängigkeiten
 * stimmen und die Fortschritts-Anzeige (`currentWorkflowKey`) nicht von
 * parallelen Workflows überschrieben wird. Schritte innerhalb eines
 * Workflows bleiben ohnehin sequentiell (`mergeRunStepsIntoContext`).
 */

import { prisma } from "@/lib/prisma";
import { PLANNING_PHASES } from "@/lib/planningFramework";
import { workflowSteps, MANUAL_STEP_KEYS } from "@/lib/workflowSteps";
import { ContextPackService } from "@/services/contextPack";
import { WorkflowService } from "@/services/workflows";
import { executeRunStepForCompany } from "@/lib/runStepExecution";

export type PhaseRunMode = "continue" | "run_all";

export type PhaseRunStepEntry = {
  workflowKey: string;
  runId: string;
  stepKey: string;
  label: string;
};

/** Heartbeat-Fenster: Jobs ohne Lebenszeichen in diesem Fenster gelten als tot. */
const HEARTBEAT_STALE_MS = 10 * 60 * 1000;

/** Running-Set verhindert Doppelstarts desselben Jobs innerhalb eines Prozesses. */
const runningJobs = new Set<string>();

/** Locale pro Job (für den Background-Worker ohne Request-Kontext). */
const jobLocales = new Map<string, "de" | "en">();

type PhaseRunJobRecord = {
  id: string;
  companyId: string;
  phaseId: string;
  mode: string;
  status: string;
  totalSteps: number;
  completedSteps: number;
  stepsJson: unknown;
  currentWorkflowKey: string | null;
  currentStepKey: string | null;
  currentLabel: string | null;
  lastMessage: string | null;
  errorMessage: string | null;
  cancelRequested: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  heartbeatAt: Date | null;
  createdAt: Date;
};

function requirePhaseRunJobDelegate(): any {
  const delegate = (prisma as unknown as { phaseRunJob?: any }).phaseRunJob;
  if (!delegate) {
    throw new Error("PhaseRunJob delegate unavailable on Prisma client");
  }
  return delegate;
}

/**
 * Sortiert die vom Client übergebenen Keys in die kanonische Reihenfolge
 * der Planungsphase (Dashboard-Reihenfolge). Verhindert z. B., dass ein neu
 * hinzugefügter Workflow nur deshalb zuerst läuft, weil Checkbox-DOM oder
 * Set-Reihenfolge anders war.
 */
export function sortWorkflowKeysByPhaseOrder(phaseId: string, keys: string[]): string[] {
  const phase = PLANNING_PHASES.find((p) => p.id === phaseId);
  if (!phase) return keys;
  const order = phase.workflowKeys.filter((k) => k !== "WF_BUSINESS_FORM");
  const indexOf = (k: string) => {
    const i = order.indexOf(k);
    return i === -1 ? 10_000 + keys.indexOf(k) : i;
  };
  return [...keys].sort((a, b) => {
    const da = indexOf(a);
    const db = indexOf(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });
}

export async function buildPhaseRunQueue(params: {
  companyId: string;
  workflowKeys: string[];
  mode: PhaseRunMode;
  phaseId?: string;
}): Promise<PhaseRunStepEntry[]> {
  const { companyId, mode, phaseId } = params;
  let workflowKeys = params.workflowKeys;
  if (phaseId) {
    workflowKeys = sortWorkflowKeysByPhaseOrder(phaseId, workflowKeys);
  }
  const steps: PhaseRunStepEntry[] = [];
  if (workflowKeys.length === 0) return steps;

  for (const wf of workflowKeys) {
    const wfSteps = workflowSteps[wf] ?? [];
    const stepsToConsider = wfSteps.filter((s) => !MANUAL_STEP_KEYS.has(s.stepKey));
    if (stepsToConsider.length === 0) continue;

    // Continue-Modus: Workflow gilt als erledigt, wenn über ALLE Runs hinweg
    // jeder erwartete Auto-Step mindestens einmal schema-validiert ist.
    // Wichtig: Diese Prüfung muss VOR der Auswahl eines draft/incomplete-Runs
    // passieren. Sonst kann ein alter Entwurfs-Run fälschlich Vorrang haben
    // und bereits fertige Workflows erneut in die Queue ziehen.
    if (mode === "continue") {
      const validated = await prisma.runStep.findMany({
        where: {
          run: { companyId, workflowKey: wf },
          schemaValidationPassed: true,
        },
        select: { stepKey: true },
      });
      const validatedKeys = new Set(validated.map((s) => s.stepKey));
      const allDone = stepsToConsider.every((s) => validatedKeys.has(s.stepKey));
      if (allDone) continue;
    }

    let run = await prisma.run.findFirst({
      where: { companyId, workflowKey: wf, status: { in: ["draft", "running", "incomplete"] } },
      include: { steps: true },
      orderBy: { createdAt: "desc" },
    });

    if (!run) {
      if (mode === "continue") {
        const completeRun = await prisma.run.findFirst({
          where: { companyId, workflowKey: wf, status: { in: ["complete", "approved"] } },
        });
        if (completeRun) continue;
      }
      const contextPack = await ContextPackService.build(companyId, wf);
      const newRun = await WorkflowService.createRun(companyId, wf, contextPack);
      const created = await prisma.run.findUnique({ where: { id: newRun.id }, include: { steps: true } });
      if (!created) continue;
      run = created;
    }
    if (!run) continue;

    const stepsList = [...(run.steps ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latestByKey = new Map<string, (typeof stepsList)[number]>();
    for (const s of stepsList) {
      if (!latestByKey.has(s.stepKey)) latestByKey.set(s.stepKey, s);
    }
    const completedKeys = new Set(
      [...latestByKey.values()].filter((s) => s.schemaValidationPassed).map((s) => s.stepKey)
    );

    for (const sc of stepsToConsider) {
      if (mode === "run_all" || !completedKeys.has(sc.stepKey)) {
        steps.push({ workflowKey: wf, runId: run.id, stepKey: sc.stepKey, label: sc.label });
      }
    }
  }
  return steps;
}

/**
 * Legt einen Job an und startet den Worker sofort (fire-and-forget).
 * Kann sowohl aus API-Routen als auch aus Server-Actions aufgerufen werden.
 */
export async function startPhaseRunJob(params: {
  companyId: string;
  phaseId: string;
  workflowKeys: string[];
  mode: PhaseRunMode;
  locale?: "de" | "en";
}): Promise<
  | { kind: "empty" }
  | { kind: "already_running"; jobId: string }
  | { kind: "started"; jobId: string; totalSteps: number }
> {
  const { companyId, phaseId, mode, locale } = params;
  const phaseRunJob = requirePhaseRunJobDelegate();

  const existing = await phaseRunJob.findFirst({
    where: { companyId, phaseId, status: { in: ["queued", "running"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { kind: "already_running", jobId: existing.id };

  const queue = await buildPhaseRunQueue({
    companyId,
    workflowKeys: params.workflowKeys,
    mode,
    phaseId: params.phaseId,
  });
  if (queue.length === 0) return { kind: "empty" };

  const job = await phaseRunJob.create({
    data: {
      companyId,
      phaseId,
      mode,
      status: "queued",
      totalSteps: queue.length,
      completedSteps: 0,
      stepsJson: queue as unknown as object,
    },
  });

  if (locale) jobLocales.set(job.id, locale);
  spawnPhaseRunWorker(job.id);

  return { kind: "started", jobId: job.id, totalSteps: job.totalSteps };
}

function isTerminalPhaseRunStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

async function waitForPhaseRunJobToFinish(jobId: string): Promise<void> {
  const phaseRunJob = requirePhaseRunJobDelegate();
  // Polling ist hier ausreichend: wir brauchen nur eine robuste Reihenfolge
  // "Phase A fertig -> starte Phase B", keine Echtzeit-Subsekundenupdates.
  for (;;) {
    const fresh = (await phaseRunJob.findUnique({
      where: { id: jobId },
      select: {
        status: true,
        heartbeatAt: true,
        startedAt: true,
        createdAt: true,
        errorMessage: true,
      },
    })) as {
      status: string;
      heartbeatAt: Date | null;
      startedAt: Date | null;
      createdAt: Date;
      errorMessage: string | null;
    } | null;
    if (!fresh) return;
    if (isTerminalPhaseRunStatus(fresh.status)) return;
    const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);
    const lastSign = fresh.heartbeatAt ?? fresh.startedAt ?? fresh.createdAt;
    if ((fresh.status === "queued" || fresh.status === "running") && lastSign < staleBefore) {
      await phaseRunJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          errorMessage:
            fresh.errorMessage ??
            "Kein Lebenszeichen vom Worker — Sequenz setzt mit nächster Phase fort.",
          finishedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * Startet Phasen strikt global nacheinander:
 * Phase 1 komplett -> Phase 2 komplett -> ...
 */
export async function startPhaseRunsInGlobalSequence(params: {
  companyId: string;
  phaseEntries: Array<{ phaseId: string; workflowKeys: string[] }>;
  mode: PhaseRunMode;
  locale?: "de" | "en";
}): Promise<void> {
  const { companyId, phaseEntries, mode, locale } = params;
  for (const entry of phaseEntries) {
    const workflowKeys = entry.workflowKeys.filter((k) => k !== "WF_BUSINESS_FORM");
    if (workflowKeys.length === 0) continue;

    const started = await startPhaseRunJob({
      companyId,
      phaseId: entry.phaseId,
      workflowKeys,
      mode,
      locale,
    });
    if (started.kind === "empty") continue;
    await waitForPhaseRunJobToFinish(started.jobId);
  }
}

function clearJobBookkeeping(jobId: string): void {
  runningJobs.delete(jobId);
  jobLocales.delete(jobId);
}

/** Startet den Worker asynchron (ohne await). */
export function spawnPhaseRunWorker(jobId: string): void {
  if (runningJobs.has(jobId)) return;
  runningJobs.add(jobId);
  void runPhaseRunWorker(jobId).catch((err) => {
    console.error(`[phaseRunWorker][${jobId}] unexpected worker crash`, err);
  });
}

async function runPhaseRunWorker(jobId: string): Promise<void> {
  try {
    const phaseRunJob = requirePhaseRunJobDelegate();
    const job = (await phaseRunJob.findUnique({ where: { id: jobId } })) as PhaseRunJobRecord | null;
    if (!job) {
      clearJobBookkeeping(jobId);
      return;
    }
    if (job.status !== "queued" && job.status !== "running") {
      clearJobBookkeeping(jobId);
      return;
    }

    const allSteps = Array.isArray(job.stepsJson)
      ? (job.stepsJson as unknown as PhaseRunStepEntry[])
      : [];
    const totalSteps = allSteps.length;
    const locale = jobLocales.get(jobId);
    const companyId = job.companyId;

    await phaseRunJob.update({
      where: { id: jobId },
      data: {
        status: "running",
        startedAt: job.startedAt ?? new Date(),
        heartbeatAt: new Date(),
        totalSteps,
      },
    });

    // Gruppe nach workflowKey (stabile Reihenfolge bewahren).
    const workflowGroups = new Map<string, PhaseRunStepEntry[]>();
    for (const entry of allSteps) {
      const list = workflowGroups.get(entry.workflowKey) ?? [];
      list.push(entry);
      workflowGroups.set(entry.workflowKey, list);
    }
    const workflowQueue = [...workflowGroups.values()];

    const state = {
      cancelled: false,
      failed: false as boolean | string,
      completedSteps: job.completedSteps,
    };
    const queuedRunIds = Array.from(new Set(allSteps.map((s) => s.runId).filter(Boolean)));

    async function markQueuedRunsIncomplete(reason: string): Promise<void> {
      if (queuedRunIds.length === 0) return;
      void reason;
      await prisma.run.updateMany({
        where: {
          id: { in: queuedRunIds },
          status: "running",
        },
        data: {
          status: "incomplete",
          finishedAt: new Date(),
        },
      });
    }

    async function checkCancel(): Promise<boolean> {
      const fresh = await phaseRunJob.findUnique({
        where: { id: jobId },
        select: { cancelRequested: true },
      });
      return Boolean(fresh?.cancelRequested);
    }

    async function runOneWorkflow(entries: PhaseRunStepEntry[]): Promise<void> {
      for (const entry of entries) {
        if (state.cancelled || state.failed) return;
        if (await checkCancel()) {
          state.cancelled = true;
          return;
        }

        await phaseRunJob.update({
          where: { id: jobId },
          data: {
            currentWorkflowKey: entry.workflowKey,
            currentStepKey: entry.stepKey,
            currentLabel: entry.label,
            heartbeatAt: new Date(),
          },
        });

        // Transiente Netzwerkfehler ("fetch failed", ECONNRESET, socket hang up,
        // UND_ERR_*, DNS-Aussetzer …) bringen sonst den ganzen Job zum Stehen.
        // Wir retryen den einzelnen Schritt mit kurzem Backoff, bevor wir die
        // Queue abbrechen.
        const TRANSIENT_RE =
          /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|ENOTFOUND|UND_ERR_SOCKET|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT|socket hang up|other side closed|network/i;
        const isTransient = (err: unknown, depth = 0): boolean => {
          if (!err || depth > 4) return false;
          const e = err as { message?: unknown; code?: unknown; cause?: unknown; name?: unknown };
          const bag = [e.message, e.code, e.name]
            .map((v) => (typeof v === "string" ? v : ""))
            .join(" | ");
          if (bag && TRANSIENT_RE.test(bag)) return true;
          return isTransient(e.cause, depth + 1);
        };

        let attempt = 0;
        for (;;) {
          attempt += 1;
          try {
            await executeRunStepForCompany({
              companyId,
              runId: entry.runId,
              stepKey: entry.stepKey,
              locale,
            });
            break;
          } catch (stepErr) {
            if (await checkCancel()) {
              state.cancelled = true;
              return;
            }
            const transient = isTransient(stepErr);
            const msg = stepErr instanceof Error ? stepErr.message : String(stepErr);
            // Strikt sequentiell: am selben Prompt bleiben, bis eine valide Antwort
            // vorliegt (oder der Nutzer abbricht). Kein automatisches Weiterlaufen
            // zum nächsten Prompt bei Fehler.
            const wait = transient
              ? Math.min(90_000, 2_000 * Math.min(attempt, 20))
              : Math.min(90_000, 10_000 * Math.min(attempt, 12));
            await phaseRunJob
              .update({
                where: { id: jobId },
                data: {
                  heartbeatAt: new Date(),
                  lastMessage: `Warte auf Antwort für ${entry.label} (Versuch ${attempt})`,
                  errorMessage: `${entry.workflowKey} / ${entry.label}: ${msg}`,
                },
              })
              .catch(() => null);
            console.warn(
              `[phaseRunWorker][${jobId}] step failure on ${entry.workflowKey}/${entry.stepKey} attempt ${attempt} — retrying in ${wait}ms`,
              msg,
            );
            await new Promise((r) => setTimeout(r, wait));
            await phaseRunJob
              .update({ where: { id: jobId }, data: { heartbeatAt: new Date() } })
              .catch(() => null);
            continue;
          }
        }

        state.completedSteps += 1;
        await phaseRunJob.update({
          where: { id: jobId },
          data: {
            completedSteps: state.completedSteps,
            heartbeatAt: new Date(),
          },
        });
      }
    }

    // Workflows strikt nacheinander (Phasen-Reihenfolge), nie parallel —
    // sonst überschreiben sich die Worker gegenseitig bei `currentWorkflowKey`
    // und der Nutzer sieht z. B. „AI Search“ obwohl „Marketing Strategie“
    // noch offen und eigentlich zuerst dran ist.
    for (const group of workflowQueue) {
      if (state.cancelled || state.failed) break;
      if (await checkCancel()) {
        state.cancelled = true;
        break;
      }
      await runOneWorkflow(group);
    }

    if (state.cancelled) {
      await markQueuedRunsIncomplete("Phase batch cancelled before all queued steps completed.");
      await phaseRunJob.update({
        where: { id: jobId },
        data: {
          status: "cancelled",
          finishedAt: new Date(),
          heartbeatAt: new Date(),
          lastMessage: "Abgebrochen durch Benutzer.",
        },
      });
      clearJobBookkeeping(jobId);
      return;
    }
    if (state.failed) {
      await markQueuedRunsIncomplete("Phase batch failed before all queued steps completed.");
      await phaseRunJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          errorMessage: typeof state.failed === "string" ? state.failed : "Worker-Fehler.",
          finishedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });
      clearJobBookkeeping(jobId);
      return;
    }

    await phaseRunJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        finishedAt: new Date(),
        heartbeatAt: new Date(),
        currentWorkflowKey: null,
        currentStepKey: null,
        currentLabel: null,
        lastMessage: "KI-Analyse abgeschlossen.",
      },
    });
  } catch (err) {
    console.error(`[phaseRunWorker][${jobId}] fatal`, err);
    try {
      const phaseRunJob = requirePhaseRunJobDelegate();
      await phaseRunJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Worker-Fehler.",
          finishedAt: new Date(),
          heartbeatAt: new Date(),
        },
      });
    } catch (persistErr) {
      console.error(`[phaseRunWorker][${jobId}] status persist failed`, persistErr);
    }
  } finally {
    clearJobBookkeeping(jobId);
  }
}

/**
 * Gibt den aktuellsten Job für die Phase zurück (laufend > zuletzt fertig).
 * Markiert "tote" Jobs (kein Heartbeat in HEARTBEAT_STALE_MS) automatisch als failed.
 */
export async function findLatestJobForPhase(params: {
  companyId: string;
  phaseId: string;
}): Promise<PhaseRunJobRecord | null> {
  const { companyId, phaseId } = params;
  const phaseRunJob = requirePhaseRunJobDelegate();

  const active = (await phaseRunJob.findFirst({
    where: { companyId, phaseId, status: { in: ["queued", "running"] } },
    orderBy: { createdAt: "desc" },
  })) as PhaseRunJobRecord | null;
  if (active) {
    const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);
    const lastSign = active.heartbeatAt ?? active.startedAt ?? active.createdAt;
    if (lastSign < staleBefore && !runningJobs.has(active.id)) {
      return phaseRunJob.update({
        where: { id: active.id },
        data: {
          status: "failed",
          errorMessage:
            active.errorMessage ?? "Kein Lebenszeichen vom Worker — Server-Neustart? Bitte erneut ausführen.",
          finishedAt: new Date(),
        },
      });
    }
    return active;
  }

  return phaseRunJob.findFirst({
    where: { companyId, phaseId },
    orderBy: { createdAt: "desc" },
  });
}
