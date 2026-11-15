import { v4 as uuidv4 } from "uuid";
import { ExportFormat } from "@/lib/exportCore";

const HISTORY_KEY = "expense-tracker:export-history";
const HISTORY_LIMIT = 50;

export type ExportDestination = "download" | "email" | "googleSheets" | "dropbox" | "oneDrive";

export const DESTINATION_LABELS: Record<ExportDestination, string> = {
  download: "Downloaded",
  email: "Emailed",
  googleSheets: "Google Sheets",
  dropbox: "Dropbox",
  oneDrive: "OneDrive",
};

/**
 * "completed" = a real download actually happened. "simulated" = a demo
 * destination logged what *would* have been delivered (nothing left the
 * browser). "failed" = the export didn't run (e.g. no matching records).
 */
export type ExportStatus = "completed" | "simulated" | "failed";

export interface ExportHistoryEntry {
  id: string;
  timestamp: string; // ISO
  label: string;
  format: ExportFormat;
  destination: ExportDestination;
  recordCount: number;
  status: ExportStatus;
  detail?: string;
}

export function loadExportHistory(): ExportHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExportHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveExportHistory(entries: ExportHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded, etc).
  }
}

export function appendExportHistory(
  entry: Omit<ExportHistoryEntry, "id" | "timestamp">
): ExportHistoryEntry {
  const full: ExportHistoryEntry = {
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };
  saveExportHistory([full, ...loadExportHistory()].slice(0, HISTORY_LIMIT));
  return full;
}

export function clearExportHistory(): void {
  saveExportHistory([]);
}
