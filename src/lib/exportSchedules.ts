import { v4 as uuidv4 } from "uuid";
import { Expense } from "@/types/expense";
import { EXPORT_TEMPLATES, TemplateKey } from "@/lib/exportTemplates";
import { ExportFormat, downloadExport, filterExpenses } from "@/lib/exportCore";
import { ExportDestination, appendExportHistory } from "@/lib/exportHistory";

const SCHEDULES_KEY = "expense-tracker:export-schedules";

export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export interface ExportSchedule {
  id: string;
  template: TemplateKey;
  format: ExportFormat;
  destination: ExportDestination;
  frequency: ScheduleFrequency;
  active: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt: string;
}

export function loadSchedules(): ExportSchedule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SCHEDULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExportSchedule[]) : [];
  } catch {
    return [];
  }
}

function saveSchedules(schedules: ExportSchedule[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded, etc).
  }
}

export function computeNextRun(frequency: ScheduleFrequency, from: Date = new Date()): string {
  const next = new Date(from);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

export function createSchedule(input: {
  template: TemplateKey;
  format: ExportFormat;
  destination: ExportDestination;
  frequency: ScheduleFrequency;
}): ExportSchedule {
  const schedule: ExportSchedule = {
    ...input,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    active: true,
    nextRunAt: computeNextRun(input.frequency),
  };
  saveSchedules([schedule, ...loadSchedules()]);
  return schedule;
}

export function deleteSchedule(id: string): void {
  saveSchedules(loadSchedules().filter((s) => s.id !== id));
}

export function toggleScheduleActive(id: string): void {
  saveSchedules(loadSchedules().map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
}

/**
 * Schedules that are active and past due. The app has no server/cron, so
 * nothing runs in the background — this just tells the UI what to surface
 * ("3 exports are due") so the user can run them with one click.
 */
export function getDueSchedules(schedules: ExportSchedule[] = loadSchedules()): ExportSchedule[] {
  const now = Date.now();
  return schedules.filter((s) => s.active && new Date(s.nextRunAt).getTime() <= now);
}

/**
 * Runs one schedule right now (must be called from a click handler — a real
 * file download needs a user gesture in most browsers). "download" actually
 * downloads a file; every other destination is a demo and only logs what
 * would have been delivered. Always advances nextRunAt, due or not, so a
 * manual "Run now" doesn't cause it to fire again moments later.
 */
export async function runSchedule(schedule: ExportSchedule, expenses: Expense[]): Promise<ExportSchedule> {
  const template = EXPORT_TEMPLATES[schedule.template];
  const filters = template.buildFilters();
  const filtered = filterExpenses(expenses, filters);
  const label = template.buildTitle();

  if (filtered.length === 0) {
    appendExportHistory({
      label,
      format: schedule.format,
      destination: schedule.destination,
      recordCount: 0,
      status: "failed",
      detail: "No expenses matched this template's date range.",
    });
  } else if (schedule.destination === "download") {
    try {
      const result = await downloadExport({
        format: schedule.format,
        expenses: filtered,
        filenameBase: label,
        filters,
        includeBreakdown: template.grouped,
        pdf: {
          title: label,
          subtitleLines: [`Scheduled ${FREQUENCY_LABELS[schedule.frequency].toLowerCase()} export`],
          grouped: template.grouped,
          footerNote: template.footerNote,
        },
      });
      appendExportHistory({
        label,
        format: schedule.format,
        destination: "download",
        recordCount: result.recordCount,
        status: "completed",
        detail: result.filename,
      });
    } catch {
      appendExportHistory({
        label,
        format: schedule.format,
        destination: "download",
        recordCount: filtered.length,
        status: "failed",
        detail: "The file could not be generated.",
      });
    }
  } else {
    // Demo destination — see ConnectionsSection; nothing is actually delivered.
    appendExportHistory({
      label,
      format: schedule.format,
      destination: schedule.destination,
      recordCount: filtered.length,
      status: "simulated",
      detail: "Demo integration — not actually delivered.",
    });
  }

  const updated: ExportSchedule = {
    ...schedule,
    lastRunAt: new Date().toISOString(),
    nextRunAt: computeNextRun(schedule.frequency),
  };
  saveSchedules(loadSchedules().map((s) => (s.id === schedule.id ? updated : s)));
  return updated;
}
