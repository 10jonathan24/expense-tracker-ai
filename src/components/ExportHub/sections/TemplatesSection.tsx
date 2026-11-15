"use client";

import { EXPORT_TEMPLATE_KEYS, EXPORT_TEMPLATES, TemplateKey } from "@/lib/exportTemplates";

interface TemplatesSectionProps {
  onUseTemplate: (key: TemplateKey) => void;
}

const TEMPLATE_ICONS: Record<TemplateKey, JSX.Element> = {
  taxReport: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h4M7 3h10a1 1 0 011 1v16l-3-2-3 2-3-2-3 2V4a1 1 0 011-1z" />
  ),
  monthlySummary: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
  ),
  categoryAnalysis: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9 9 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
  ),
};

export function TemplatesSection({ onUseTemplate }: TemplatesSectionProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Pre-configured reports for common situations — pick one to pre-fill Quick Export, which you can still tweak before sending it anywhere.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_TEMPLATE_KEYS.map((key) => {
          const template = EXPORT_TEMPLATES[key];
          return (
            <div key={key} className="flex flex-col rounded-xl border border-slate-200 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  {TEMPLATE_ICONS[key]}
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{template.label}</h3>
              <p className="mt-1 flex-1 text-xs text-slate-500">{template.description}</p>
              {template.footerNote && (
                <p className="mt-2 text-[11px] italic text-slate-400">{template.footerNote}</p>
              )}
              <button
                type="button"
                onClick={() => onUseTemplate(key)}
                className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Use template
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
