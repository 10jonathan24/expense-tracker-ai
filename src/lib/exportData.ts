import { Category, Expense } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/format";

export const EXPORT_FORMATS = ["csv", "json", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  csv: "CSV",
  json: "JSON",
  pdf: "PDF",
};

export interface ExportFilters {
  /** ISO date (yyyy-MM-dd); "" means no lower bound. */
  startDate: string;
  /** ISO date (yyyy-MM-dd); "" means no upper bound. */
  endDate: string;
  /** Expenses are included when their category is in this list. */
  categories: Category[];
}

/** Applies the export-only date/category filters, independent of the main list's filters. */
export function filterExpensesForExport(
  expenses: Expense[],
  filters: ExportFilters
): Expense[] {
  return expenses
    .filter((e) => !filters.startDate || e.date >= filters.startDate)
    .filter((e) => !filters.endDate || e.date <= filters.endDate)
    .filter((e) => filters.categories.includes(e.category))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    );
}

export function sumAmount(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

function describeDateRange(filters: ExportFilters): string {
  if (!filters.startDate && !filters.endDate) return "All dates";
  if (filters.startDate && filters.endDate) {
    return `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`;
  }
  if (filters.startDate) return `From ${formatDate(filters.startDate)}`;
  return `Through ${formatDate(filters.endDate)}`;
}

function describeCategories(filters: ExportFilters, allCategories: readonly Category[]): string {
  if (filters.categories.length === allCategories.length) return "All categories";
  if (filters.categories.length === 0) return "None selected";
  return filters.categories.join(", ");
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(expenses: Expense[]): string {
  const header = ["Date", "Category", "Description", "Amount"];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    e.description,
    e.amount.toFixed(2),
  ]);
  return [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");
}

export function buildJson(expenses: Expense[], filters: ExportFilters): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    filters: {
      startDate: filters.startDate || null,
      endDate: filters.endDate || null,
      categories: filters.categories,
    },
    summary: {
      recordCount: expenses.length,
      totalAmount: Number(sumAmount(expenses).toFixed(2)),
    },
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Builds a PDF report client-side via jsPDF + jspdf-autotable. Imported
 * dynamically so the ~450KB PDF engine is only pulled into a user's bundle
 * the first time they actually choose the PDF format.
 */
export async function buildPdf(
  expenses: Expense[],
  filters: ExportFilters,
  allCategories: readonly Category[]
): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text("Expense Report", marginX, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    `Generated ${new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })}`,
    marginX,
    60
  );
  doc.text(`Date range: ${describeDateRange(filters)}`, marginX, 74);
  doc.text(`Categories: ${describeCategories(filters, allCategories)}`, marginX, 88);

  autoTable(doc, {
    startY: 104,
    margin: { left: marginX, right: marginX },
    head: [["Date", "Category", "Description", "Amount"]],
    body: expenses.map((e) => [
      formatDate(e.date),
      e.category,
      e.description,
      formatCurrency(e.amount),
    ]),
    foot: [["", "", "Total", formatCurrency(sumAmount(expenses))]],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" }, // indigo-600
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" }, // slate-100 / slate-900
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: { 3: { halign: "right" } },
    alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
  });

  return doc.output("blob");
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Strips characters that are awkward in downloaded filenames across OSes. */
export function sanitizeFilename(base: string): string {
  const cleaned = base
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned || "expenses-export";
}

export class EmptyExportError extends Error {
  constructor() {
    super("No expenses match the selected filters.");
    this.name = "EmptyExportError";
  }
}

export interface ExportResult {
  filename: string;
  recordCount: number;
}

/** Filters, builds, and triggers the browser download for the chosen format. */
export async function exportExpenses(
  format: ExportFormat,
  expenses: Expense[],
  filters: ExportFilters,
  filenameBase: string,
  allCategories: readonly Category[]
): Promise<ExportResult> {
  const filtered = filterExpensesForExport(expenses, filters);
  if (filtered.length === 0) {
    throw new EmptyExportError();
  }

  const filename = `${sanitizeFilename(filenameBase)}.${format}`;

  if (format === "csv") {
    downloadBlob(
      filename,
      new Blob([buildCsv(filtered)], { type: "text/csv;charset=utf-8;" })
    );
  } else if (format === "json") {
    downloadBlob(
      filename,
      new Blob([buildJson(filtered, filters)], {
        type: "application/json;charset=utf-8;",
      })
    );
  } else {
    const blob = await buildPdf(filtered, filters, allCategories);
    downloadBlob(filename, blob);
  }

  return { filename, recordCount: filtered.length };
}
