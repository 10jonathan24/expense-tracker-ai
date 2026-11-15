"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/types/expense";
import type { Expense } from "@/types/expense";
import { ExportFilters, ExportFormat } from "@/lib/exportCore";
import { EXPORT_TEMPLATES, TemplateKey } from "@/lib/exportTemplates";
import { QuickExportSection } from "./sections/QuickExportSection";
import { TemplatesSection } from "./sections/TemplatesSection";
import { ScheduleSection } from "./sections/ScheduleSection";
import { HistorySection } from "./sections/HistorySection";
import { ConnectionsSection } from "./sections/ConnectionsSection";
import { ShareSection } from "./sections/ShareSection";

export interface ExportHubProps {
  isOpen: boolean;
  expenses: Expense[];
  onClose: () => void;
}

export type HubSection = "quick" | "templates" | "schedule" | "history" | "connections" | "share";

export interface BuilderState {
  /** "custom" once the user edits anything after applying a template. */
  template: TemplateKey | "custom";
  format: ExportFormat;
  filters: ExportFilters;
  filename: string;
  filenameTouched: boolean;
}

function defaultFilename(): string {
  return `expenses-export-${new Date().toISOString().slice(0, 10)}`;
}

function defaultBuilderState(): BuilderState {
  return {
    template: "custom",
    format: "csv",
    filters: { startDate: "", endDate: "", categories: [...CATEGORIES] },
    filename: defaultFilename(),
    filenameTouched: false,
  };
}

const NAV_ITEMS: { key: HubSection; label: string; icon: JSX.Element }[] = [
  {
    key: "quick",
    label: "Quick Export",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    ),
  },
  {
    key: "templates",
    label: "Templates",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0H5a2 2 0 01-2-2v-4m6 6h10a2 2 0 002-2v-4" />
    ),
  },
  {
    key: "schedule",
    label: "Scheduled",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    key: "history",
    label: "History",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 2.64-6.36M3 12V6m0 6h6M12 7v5l4 2" />
    ),
  },
  {
    key: "connections",
    label: "Connections",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
    ),
  },
  {
    key: "share",
    label: "Share",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342a3 3 0 100-2.684m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.632-1.316 3 3 0 00-5.632 1.316zm0 9.632a3 3 0 105.632 1.316 3 3 0 00-5.632-1.316z" />
    ),
  },
];

export function ExportHub({ isOpen, expenses, onClose }: ExportHubProps) {
  const [section, setSection] = useState<HubSection>("quick");
  const [builder, setBuilder] = useState<BuilderState>(defaultBuilderState);

  // Reset to a clean slate every time the hub is opened fresh.
  useEffect(() => {
    if (!isOpen) return;
    setSection("quick");
    setBuilder(defaultBuilderState());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function applyTemplate(key: TemplateKey) {
    const template = EXPORT_TEMPLATES[key];
    setBuilder({
      template: key,
      format: template.defaultFormat,
      filters: template.buildFilters(),
      filename: template.buildTitle(),
      filenameTouched: true,
    });
    setSection("quick");
  }

  function updateBuilder(patch: Partial<BuilderState>) {
    setBuilder((prev) => ({ ...prev, ...patch, template: "custom" }));
  }

  const activeLabel = NAV_ITEMS.find((item) => item.key === section)?.label ?? "";

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Export hub">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative m-auto flex h-[min(820px,92vh)] w-[min(1120px,96vw)] overflow-hidden rounded-2xl bg-white shadow-2xl animate-zoom-in">
        <nav className="flex w-56 shrink-0 flex-col border-r border-slate-100 bg-slate-50 p-3">
          <div className="mb-4 px-2 pt-1">
            <p className="text-sm font-semibold text-slate-900">Export Hub</p>
            <p className="text-xs text-slate-500">Downloads, templates &amp; sharing</p>
          </div>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                section === item.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                {item.icon}
              </svg>
              {item.label}
            </button>
          ))}

          <div className="mt-auto rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
            Cloud connections, scheduling, and sharing here are demo flows for this prototype — only an explicit download ever leaves your browser.
          </div>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">{activeLabel}</h2>
            <button
              onClick={onClose}
              aria-label="Close export hub"
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

          <div className="flex-1 overflow-y-auto p-6">
            {section === "quick" && (
              <QuickExportSection expenses={expenses} builder={builder} onChange={updateBuilder} />
            )}
            {section === "templates" && <TemplatesSection onUseTemplate={applyTemplate} />}
            {section === "schedule" && <ScheduleSection expenses={expenses} />}
            {section === "history" && <HistorySection />}
            {section === "connections" && <ConnectionsSection />}
            {section === "share" && <ShareSection expenses={expenses} filters={builder.filters} />}
          </div>
        </div>
      </div>
    </div>
  );
}
