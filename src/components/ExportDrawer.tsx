"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, CATEGORY_STYLES, Category, Expense } from "@/types/expense";
import { formatCurrency, formatDate, shiftIsoDate, startOfMonthIso, todayISO } from "@/lib/format";
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  EmptyExportError,
  ExportFilters,
  ExportFormat,
  exportExpenses,
  filterExpensesForExport,
  sumAmount,
} from "@/lib/exportData";

interface ExportDrawerProps {
  isOpen: boolean;
  expenses: Expense[];
  onClose: () => void;
}

const PREVIEW_ROW_LIMIT = 8;

const DATE_PRESETS: { label: string; range: () => { startDate: string; endDate: string } }[] = [
  { label: "All time", range: () => ({ startDate: "", endDate: "" }) },
  {
    label: "This month",
    range: () => ({ startDate: startOfMonthIso(todayISO()), endDate: todayISO() }),
  },
  {
    label: "Last 30 days",
    range: () => ({ startDate: shiftIsoDate(todayISO(), -29), endDate: todayISO() }),
  },
  {
    label: "Last 90 days",
    range: () => ({ startDate: shiftIsoDate(todayISO(), -89), endDate: todayISO() }),
  },
];

const FORMAT_DETAILS: Record<ExportFormat, { description: string; icon: JSX.Element }> = {
  csv: {
    description: "Spreadsheet-friendly, opens in Excel or Sheets.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3v18M3 9h18M3 15h18"
      />
    ),
  },
  json: {
    description: "Structured data, ideal for scripts or other tools.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 3.5c-2 0-2.5 1-2.5 2.5v2c0 1-.5 2-2 2.5 1.5.5 2 1.5 2 2.5v2c0 1.5.5 2.5 2.5 2.5M14.5 3.5c2 0 2.5 1 2.5 2.5v2c0 1 .5 2 2 2.5-1.5.5-2 1.5-2 2.5v2c0 1.5-.5 2.5-2.5 2.5"
      />
    ),
  },
  pdf: {
    description: "Formatted report, ready to print or share.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm7 0v4h4M9 13h6M9 16.5h4"
      />
    ),
  },
};

function defaultFilename(): string {
  return `expenses-export-${todayISO()}`;
}

export function ExportDrawer({ isOpen, expenses, onClose }: ExportDrawerProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...CATEGORIES]);
  const [filename, setFilename] = useState(() => defaultFilename());
  const [filenameTouched, setFilenameTouched] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset to sensible defaults every time the drawer is opened fresh (not on
  // re-renders while it's already open, so filters survive an export).
  useEffect(() => {
    if (!isOpen) return;
    setFormat("csv");
    setStartDate("");
    setEndDate("");
    setSelectedCategories([...CATEGORIES]);
    setFilename(defaultFilename());
    setFilenameTouched(false);
    setIsExporting(false);
    setError(null);
    setSuccessMessage(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isExporting) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isExporting, onClose]);

  const exportFilters: ExportFilters = useMemo(
    () => ({ startDate, endDate, categories: selectedCategories }),
    [startDate, endDate, selectedCategories]
  );

  // A success banner from a previous export goes stale once the user changes
  // what they're about to export; clear it rather than leaving it hanging
  // around for a different filter/format combination.
  useEffect(() => {
    setSuccessMessage(null);
  }, [exportFilters, format]);

  const matched = useMemo(
    () => filterExpensesForExport(expenses, exportFilters),
    [expenses, exportFilters]
  );

  const totalAmount = useMemo(() => sumAmount(matched), [matched]);
  const previewRows = matched.slice(0, PREVIEW_ROW_LIMIT);
  const hiddenCount = matched.length - previewRows.length;

  if (!isOpen) return null;

  function toggleCategory(category: Category) {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }

  function applyPreset(range: { startDate: string; endDate: string }) {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function handleFormatChange(next: ExportFormat) {
    setFormat(next);
    if (!filenameTouched) {
      setFilename(defaultFilename());
    }
  }

  async function handleExport() {
    setError(null);
    setSuccessMessage(null);
    setIsExporting(true);
    // Yield one tick so the spinner paints before the (possibly blocking) export work runs.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const result = await exportExpenses(format, expenses, exportFilters, filename, CATEGORIES);
      setSuccessMessage(
        `Exported ${result.recordCount} expense${result.recordCount === 1 ? "" : "s"} to ${result.filename}.`
      );
      // Stay open so the user can adjust filters and export again. Refresh the
      // filename suggestion (unless they've customized it) so a follow-up
      // export doesn't silently reuse the same name.
      if (!filenameTouched) {
        setFilename(defaultFilename());
      }
    } catch (err) {
      if (err instanceof EmptyExportError) {
        setError(err.message);
      } else {
        setError("Export failed. Please try again.");
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Export expenses">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        onClick={() => !isExporting && onClose()}
      />

      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-slide-in-right">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Export expenses</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Choose a format, narrow down what to include, and preview it before downloading.
            </p>
          </div>
          <button
            onClick={() => !isExporting && onClose()}
            aria-label="Close export panel"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Format */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Format</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {EXPORT_FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFormatChange(f)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-center transition-colors ${
                    format === f
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                  >
                    {FORMAT_DETAILS[f].icon}
                  </svg>
                  <span className="text-sm font-medium">{EXPORT_FORMAT_LABELS[f]}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{FORMAT_DETAILS[format].description}</p>
          </section>

          {/* Date range */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date range</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.range())}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
                />
              </div>
            </div>
          </section>

          {/* Categories */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</h3>
              <div className="flex gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSelectedCategories([...CATEGORIES])}
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  Select all
                </button>
                <span className="text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-indigo-600 hover:text-indigo-500"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => {
                const checked = selectedCategories.includes(c);
                return (
                  <label
                    key={c}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                      checked ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(c)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/40"
                    />
                    <span className={`h-2 w-2 rounded-full ${CATEGORY_STYLES[c].dot}`} />
                    <span className="text-slate-700">{c}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Filename */}
          <section>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              File name
            </label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-indigo-500/40 focus-within:border-indigo-400">
              <input
                type="text"
                value={filename}
                onChange={(e) => {
                  setFilename(e.target.value);
                  setFilenameTouched(true);
                }}
                className="w-full rounded-l-lg bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
              />
              <span className="shrink-0 rounded-r-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                .{format}
              </span>
            </div>
          </section>

          {/* Preview */}
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
                        <td className="px-3 py-2 text-slate-800 truncate max-w-[12rem]">{e.description}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">
                          {formatCurrency(e.amount)}
                        </td>
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

          {successMessage && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">Ready to export</span>
            <span className="font-medium text-slate-900">
              {matched.length} expense{matched.length === 1 ? "" : "s"} · {formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || matched.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {isExporting ? "Exporting…" : `Export ${EXPORT_FORMAT_LABELS[format]}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
