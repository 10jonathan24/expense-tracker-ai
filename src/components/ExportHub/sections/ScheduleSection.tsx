"use client";

import { useState } from "react";
import { Expense } from "@/types/expense";
import { EXPORT_FORMATS, EXPORT_FORMAT_LABELS, ExportFormat } from "@/lib/exportCore";
import { EXPORT_TEMPLATE_KEYS, EXPORT_TEMPLATES, TemplateKey } from "@/lib/exportTemplates";
import { DESTINATION_LABELS, ExportDestination } from "@/lib/exportHistory";
import {
  ExportSchedule,
  FREQUENCY_LABELS,
  ScheduleFrequency,
  createSchedule,
  deleteSchedule,
  getDueSchedules,
  loadSchedules,
  runSchedule,
  toggleScheduleActive,
} from "@/lib/exportSchedules";

const FREQUENCIES: ScheduleFrequency[] = ["daily", "weekly", "monthly"];
const DESTINATIONS: ExportDestination[] = ["download", "email", "googleSheets", "dropbox", "oneDrive"];

interface ScheduleSectionProps {
  expenses: Expense[];
}

function relativeFromNow(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let text: string;
  if (minutes < 60) text = `${minutes} min`;
  else if (hours < 48) text = `${hours} hr`;
  else text = `${days} day${days === 1 ? "" : "s"}`;
  return ms >= 0 ? `in ${text}` : `${text} ago`;
}

export function ScheduleSection({ expenses }: ScheduleSectionProps) {
  const [schedules, setSchedules] = useState<ExportSchedule[]>(loadSchedules);
  const [template, setTemplate] = useState<TemplateKey>(EXPORT_TEMPLATE_KEYS[0]);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [destination, setDestination] = useState<ExportDestination>("download");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly");
  const [runningId, setRunningId] = useState<string | null>(null);

  const dueIds = new Set(getDueSchedules(schedules).map((s) => s.id));

  function refresh() {
    setSchedules(loadSchedules());
  }

  function handleCreate() {
    createSchedule({ template, format, destination, frequency });
    refresh();
  }

  async function handleRun(schedule: ExportSchedule) {
    setRunningId(schedule.id);
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      await runSchedule(schedule, expenses);
    } finally {
      setRunningId(null);
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        This app has no server, so nothing runs while your browser is closed — a schedule just tracks when it is next
        due and lets you catch up with one click whenever this tab is open.
      </p>

      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">New schedule</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Template">
            <select value={template} onChange={(e) => setTemplate(e.target.value as TemplateKey)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400">
              {EXPORT_TEMPLATE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {EXPORT_TEMPLATES[key].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Format">
            <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400">
              {EXPORT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {EXPORT_FORMAT_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Destination">
            <select value={destination} onChange={(e) => setDestination(e.target.value as ExportDestination)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400">
              {DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  {DESTINATION_LABELS[d]}
                  {d !== "download" ? " (demo)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frequency">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400">
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          Add schedule
        </button>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Schedules {schedules.length > 0 && `(${schedules.length})`}
        </h3>
        {schedules.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            No scheduled exports yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {schedules.map((s) => {
              const due = dueIds.has(s.id);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {EXPORT_TEMPLATES[s.template].label}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        · {EXPORT_FORMAT_LABELS[s.format]} · {DESTINATION_LABELS[s.destination]} · {FREQUENCY_LABELS[s.frequency]}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {s.active ? (
                        due ? (
                          <span className="font-medium text-amber-600">Due now</span>
                        ) : (
                          `Next run ${relativeFromNow(s.nextRunAt)}`
                        )
                      ) : (
                        "Paused"
                      )}
                      {s.lastRunAt && ` · last ran ${relativeFromNow(s.lastRunAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRun(s)}
                      disabled={runningId !== null}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {runningId === s.id ? "Running…" : "Run now"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleScheduleActive(s.id);
                        refresh();
                      }}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {s.active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteSchedule(s.id);
                        refresh();
                      }}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
