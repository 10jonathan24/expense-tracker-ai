"use client";

import { CATEGORIES } from "@/types/expense";
import { shiftIsoDate, startOfMonthIso, todayISO } from "@/lib/format";

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

export interface FilterState {
  search: string;
  category: string; // "" means all
  startDate: string;
  endDate: string;
  sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  category: "",
  startDate: "",
  endDate: "",
  sort: "date-desc",
};

interface ExpenseFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function ExpenseFilters({ filters, onChange }: ExpenseFiltersProps) {
  const hasActiveFilters =
    filters.search !== "" ||
    filters.category !== "" ||
    filters.startDate !== "" ||
    filters.endDate !== "";

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function applyDatePreset(range: { startDate: string; endDate: string }) {
    onChange({ ...filters, startDate: range.startDate, endDate: range.endDate });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder="Search descriptions..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            From
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            To
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-xs font-medium text-slate-500">Quick range:</span>
        {DATE_PRESETS.map((preset) => {
          const range = preset.range();
          const isActive = filters.startDate === range.startDate && filters.endDate === range.endDate;
          return (
            <button
              key={preset.label}
              onClick={() => applyDatePreset(range)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <label className="mr-2 text-xs font-medium text-slate-500">
            Sort by
          </label>
          <select
            value={filters.sort}
            onChange={(e) =>
              update("sort", e.target.value as FilterState["sort"])
            }
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
          >
            <option value="date-desc">Date (newest first)</option>
            <option value="date-asc">Date (oldest first)</option>
            <option value="amount-desc">Amount (high to low)</option>
            <option value="amount-asc">Amount (low to high)</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
