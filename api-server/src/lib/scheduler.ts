import { db, runsTable } from "@workspace/db";
import { logger } from "./logger";
import { startRun } from "./runner";
import { getSettings } from "./settingsService";

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let nextRunAt: Date | null = null;
let currentGeneration = 0;

function computeNextRunAt(scheduleTime: string, frequencyDays: number): Date {
  const [hourStr, minStr] = scheduleTime.split(":");
  const hour = parseInt(hourStr ?? "8", 10);
  const min = parseInt(minStr ?? "0", 10);
  const safeDays = frequencyDays > 0 ? frequencyDays : 1;

  if (isNaN(hour) || isNaN(min) || hour < 0 || hour > 23 || min < 0 || min > 59) {
    logger.warn({ scheduleTime }, "Invalid scheduleTime — defaulting to 08:00");
    return computeNextRunAt("08:00", safeDays);
  }

  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, min, 0, 0);

  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + safeDays);
  }

  return candidate;
}

function scheduleNextFire(scheduleTime: string, frequencyDays: number, generation: number): void {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }

  nextRunAt = computeNextRunAt(scheduleTime, frequencyDays);
  const msUntilFire = nextRunAt.getTime() - Date.now();

  logger.info({ nextRunAt, msUntilFire }, "Scheduler: next run scheduled");

  schedulerTimer = setTimeout(async () => {
    // Guard: if applySchedule was called since this timer was created, abort
    if (generation !== currentGeneration) {
      logger.info({ generation, currentGeneration }, "Scheduler: stale callback, skipping");
      return;
    }

    logger.info("Scheduler firing — starting automated run");
    try {
      const [run] = await db
        .insert(runsTable)
        .values({ status: "running" })
        .returning();
      await startRun(run.id);
    } catch (err) {
      logger.error({ err }, "Scheduled run failed");
    }

    // After run completes, only re-schedule if still the current generation
    if (generation === currentGeneration) {
      scheduleNextFire(scheduleTime, frequencyDays, generation);
    } else {
      logger.info({ generation, currentGeneration }, "Scheduler: settings changed during run, not rescheduling");
    }
  }, msUntilFire);
}

export function getNextRunAt(): Date | null {
  return nextRunAt;
}

export async function initScheduler(): Promise<void> {
  const settings = await getSettings();
  applySchedule(settings.recurringEnabled, settings.scheduleTime, settings.scheduleFrequencyDays);
}

export function applySchedule(
  recurringEnabled: boolean,
  scheduleTime: string,
  frequencyDays: number
): void {
  // Bump generation — any in-flight callbacks with stale generation will no-op
  currentGeneration += 1;
  const generation = currentGeneration;

  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
  nextRunAt = null;

  if (!recurringEnabled) {
    logger.info("Scheduler disabled — recurring runs are off.");
    return;
  }

  scheduleNextFire(scheduleTime, frequencyDays, generation);
}
