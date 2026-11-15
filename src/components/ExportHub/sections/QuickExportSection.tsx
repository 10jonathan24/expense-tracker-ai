"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_STYLES, Category, Expense } from "@/types/expense";
import { formatCurrency, formatDate, shiftIsoDate, startOfMonthIso, todayISO } from "@/lib/format";
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  EmptyExportError,
  ExportFormat,
  describeExportFilters,
  downloadExport,
  filterExpenses,
  sumAmount,
} from "@/lib/exportCore";
import { ConnectionService, loadConnections } from "@/lib/exportConnections";
import { ExportDestination, DESTINATION_LABELS, appendExportHistory } from "@/lib/exportHistory";
import { BuilderState } from "../ExportHub";

interface QuickExportSectionProps {
  expenses: Expense[];
  builder: BuilderState;
  onChange: (patch: Partial<BuilderState>) => void;
}

const PREVIEW_ROW_LIMIT = 8;

const DATE_PRESETS: { label: string; range: () => { startDate: string; endDate: string } }[] = [
  { label: "All time", range: () => ({ startDate: "", endDate: "" }) },
  { label: "This month", range: () => ({ startDate: startOfMonthIso(todayISO()), endDate: todayISO() }) },
  { label: "Last 30 days", range: () => ({ startDate: shiftIsoDate(todayISO(), -29), endDate: todayISO() }) },
  { label: "Last 90 days", range: () => ({ startDate: shiftIsoDate(todayISO(), -89), endDate: todayISO() }) },
];

const CLOUD_DESTINATIONS: { destination: ExportDestination; service: ConnectionService; label: string }[] = [
  { destination: "googleSheets", service: "googleSheets", label: "Google Sheets" },
  { destination: "dropbox", service: "dropbox", label: "Dropbox" },
  { destination: "oneDrive", service: "oneDrive", label: "OneDrive" },
];

export function QuickExportSection({ expenses, builder, onChange }: QuickExportSectionProps) {
  const { format, filters, filename, filenameTouched } = builder;
  const [isExporting, setIsExporting] = useState<ExportDestination | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [banner, setBanner] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const connections = loadConnections();

  const matched = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const totalAmount = useMemo(() => sumAmount(matched), [matched]);
  const previewRows = matched.slice(0, PREVIEW_ROW_LIMIT);
  const hiddenCount = matched.length - previewRows.length;

  function setFilters(patch: Partial<BuilderState["filters"]>) {
    setBanner(null);
    onChange({ filters: { ...filters, ...patch } });
  }

  function toggleCategory(category: Category) {
    const next = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    setFilters({ categories: next });
  }

  function setFormat(next: ExportFormat) {
    setBanner(null);
    onChange({ format: next });
  }

  async function runExport(destination: ExportDestination, detail?: string) {
    setBanner(null);
    setIsExporting(destination);
    // Yield a tick so the spinner paints before the (possibly blocking) work runs.
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      if (destination === "download") {
        const result = await downloadExport({
          format,
          expenses: matched,
          filenameBase: filename,
          filters,
          pdf: { title: "Expense Report", subtitleLines: describeExportFilters(filters, CATEGORIES) },
        });
        appendExportHistory({
          label: "Quick export",
          format,
          destination,
          recordCount: result.recordCount,
          status: "completed",
          detail: result.filename,
        });
        setBanner({ kind: "success", message: `Downloaded ${result.filename} (${result.recordCount} expenses).` });
      } else {
        // Demo destination: nothing is actually delivered (see Connections tab).
        if (matched.length === 0) throw new EmptyExportError();
        await new Promise((resolve) => setTimeout(resolve, 500)); // feel of real network delivery
        appendExportHistory({
          label: "Quick export",
          format,
          destination,
          recordCount: matched.length,
          status: "simulated",
          detail,
        });
        setBanner({
          kind: "success",
          message: `Demo: ${matched.length} expenses would be sent via ${DESTINATION_LABELS[destination]}${detail ? ` (${detail})` : ""}. Nothing was actually sent.`,
        });
        setEmailOpen(false);
      }
    } catch (err) {
      setBanner({
        kind: "error",
        message: err instanceof EmptyExportError ? err.message : "Export failed. Please try again.",
      });
    } finally {
      setIsExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Format</h3>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:w-96">
          {EXPORT_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={`rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                format === f
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {EXPORT_FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date range</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setFilters(preset.range())}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:w-96">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ endDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</h3>
          <div className="flex gap-2 text-xs font-medium">
            <button type="button" onClick={() => setFilters({ categories: [...CATEGORIES] })} className="text-indigo-600 hover:text-indigo-500">
              Select all
            </button>
            <span className="text-slate-300">·</span>
            <button type="button" onClick={() => setFilters({ categories: [] })} className="text-indigo-600 hover:text-indigo-500">
              Clear
            </button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:w-[30rem]">
          {CATEGORIES.map((c) => {
            const checked = filters.categories.includes(c);
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                  checked ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => toggleCategory(c)} className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40" />
                <span className={`h-2 w-2 rounded-full ${CATEGORY_STYLES[c].dot}`} />
                <span className="text-slate-700">{c}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">File name</label>
        <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-400 sm:w-96">
          <input
            type="text"
            value={filename}
            onChange={(e) => onChange({ filename: e.target.value, filenameTouched: true })}
            className="w-full rounded-l-lg bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
          />
          <span className="shrink-0 rounded-r-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">.{format}</span>
        </div>
        {!filenameTouched && (
          <p className="mt-1 text-xs text-slate-400">Auto-generated — edit it, or it will keep following the date.</p>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</h3>
          <span className="text-xs text-slate-500">
            {matched.length} record{matched.length === 1 ? "" : "s"} · {formatCurrency(totalAmount)}
          </span>
        </div>
        {matched.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            No expenses match these filters.
          </div>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-3 py-2 text-slate-600">{e.category}</td>
                    <td className="px-3 py-2 text-slate-800 truncate max-w-[16rem]">{e.description}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-900">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hiddenCount > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-center text-xs text-slate-500">
                + {hiddenCount} more row{hiddenCount === 1 ? "" : "s"}
              </div>
            )}
          </div>
        )}
      </section>

      {banner && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            banner.kind === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {banner.message}
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Export via</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runExport("download")}
            disabled={isExporting !== null || matched.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting === "download" && <Spinner />}
            Download
          </button>

          <button
            type="button"
            onClick={() => setEmailOpen((v) => !v)}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Email <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Demo</span>
          </button>

          {CLOUD_DESTINATIONS.map(({ destination, service, label }) => {
            const connected = connections[service].connected;
            return (
              <button
                key={destination}
                type="button"
                title={connected ? undefined : `Connect ${label} in the Connections tab first`}
                onClick={() => connected && runExport(destination, connections[service].accountLabel)}
                disabled={isExporting !== null || !connected}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting === destination && <Spinner />}
                {label}
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                  {connected ? "Demo" : "Not connected"}
                </span>
              </button>
            );
          })}
        </div>

        {emailOpen && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="name@example.com"
              className="min-w-[14rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={() => runExport("email", emailAddress || "(no address entered)")}
              disabled={isExporting !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting === "email" && <Spinner />}
              Send (demo)
            </button>
            <p className="w-full text-xs text-slate-400">This demo does not send a real email — it only logs what would have been sent.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
