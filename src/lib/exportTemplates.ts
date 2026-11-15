import { CATEGORIES } from "@/types/expense";
import { shiftIsoDate, startOfMonthIso, todayISO } from "@/lib/format";
import { ExportFilters, ExportFormat } from "@/lib/exportCore";

export const EXPORT_TEMPLATE_KEYS = ["taxReport", "monthlySummary", "categoryAnalysis"] as const;
export type TemplateKey = (typeof EXPORT_TEMPLATE_KEYS)[number];

export interface ExportTemplate {
  key: TemplateKey;
  label: string;
  description: string;
  defaultFormat: ExportFormat;
  grouped: boolean;
  footerNote?: string;
  buildFilters: () => ExportFilters;
  buildTitle: () => string;
}

function currentYear(): number {
  return Number(todayISO().slice(0, 4));
}

function monthYearLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export const EXPORT_TEMPLATES: Record<TemplateKey, ExportTemplate> = {
  taxReport: {
    key: "taxReport",
    label: "Tax Report",
    description: `Every expense from ${currentYear()}, grouped by category with subtotals.`,
    defaultFormat: "pdf",
    grouped: true,
    footerNote:
      "Generated for personal recordkeeping. Not tax advice — consult a tax professional before filing.",
    buildFilters: () => ({
      startDate: `${currentYear()}-01-01`,
      endDate: `${currentYear()}-12-31`,
      categories: [...CATEGORIES],
    }),
    buildTitle: () => `Tax Report — ${currentYear()}`,
  },
  monthlySummary: {
    key: "monthlySummary",
    label: "Monthly Summary",
    description: "This month's spending so far, grouped by category.",
    defaultFormat: "pdf",
    grouped: true,
    buildFilters: () => ({
      startDate: startOfMonthIso(todayISO()),
      endDate: todayISO(),
      categories: [...CATEGORIES],
    }),
    buildTitle: () => `Monthly Summary — ${monthYearLabel(todayISO())}`,
  },
  categoryAnalysis: {
    key: "categoryAnalysis",
    label: "Category Analysis",
    description: "Last 90 days, ranked by category with share of total spend.",
    defaultFormat: "pdf",
    grouped: true,
    buildFilters: () => ({
      startDate: shiftIsoDate(todayISO(), -89),
      endDate: todayISO(),
      categories: [...CATEGORIES],
    }),
    buildTitle: () => "Category Analysis — Last 90 Days",
  },
};
