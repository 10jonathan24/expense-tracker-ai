"use client";

import { useState } from "react";
import { EXPORT_FORMAT_LABELS } from "@/lib/exportCore";
import { DESTINATION_LABELS, ExportHistoryEntry, clearExportHistory, loadExportHistory } from "@/lib/exportHistory";

const STATUS_STYLES: Record<ExportHistoryEntry["status"], string> = {
  completed: "bg-emerald-100 text-emerald-700",
  simulated: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<ExportHistoryEntry["status"], string> = {
  completed: "Downloaded",
  simulated: "Simulated",
  failed: "Failed",
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function HistorySection() {
  const [history, setHistory] = useState<ExportHistoryEntry[]>(loadExportHistory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Every export from this hub, real or simulated, is logged here so you can see what happened and when.
        </p>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearExportHistory();
              setHistory([]);
            }}
            className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            Clear history
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          No exports yet — anything you export from Quick Export, Templates, or Scheduled shows up here.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {history.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{entry.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatTimestamp(entry.timestamp)} · {EXPORT_FORMAT_LABELS[entry.format]} · {DESTINATION_LABELS[entry.destination]}
                  {entry.recordCount > 0 && ` · ${entry.recordCount} record${entry.recordCount === 1 ? "" : "s"}`}
                  {entry.detail && ` · ${entry.detail}`}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}>
                {STATUS_LABELS[entry.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
