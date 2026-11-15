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

export function filterExpenses(expenses: Expense[], filters: ExportFilters): Expense[] {
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

export function describeExportFilters(
  filters: ExportFilters,
  allCategories: readonly Category[]
): string[] {
  const dateLine = !filters.startDate && !filters.endDate
    ? "All dates"
    : filters.startDate && filters.endDate
      ? `${formatDate(filters.startDate)} – ${formatDate(filters.endDate)}`
      : filters.startDate
        ? `From ${formatDate(filters.startDate)}`
        : `Through ${formatDate(filters.endDate)}`;

  const categoryLine =
    filters.categories.length === allCategories.length
      ? "All categories"
      : filters.categories.length === 0
        ? "None selected"
        : filters.categories.join(", ");

  return [`Date range: ${dateLine}`, `Categories: ${categoryLine}`];
}

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
  percentOfTotal: number;
}

/** Per-category totals, sorted highest-spend first. Used by every grouped report. */
export function computeCategoryBreakdown(expenses: Expense[]): CategoryTotal[] {
  const grandTotal = sumAmount(expenses);
  const byCategory = new Map<Category, { total: number; count: number }>();
  for (const e of expenses) {
    const entry = byCategory.get(e.category) ?? { total: 0, count: 0 };
    entry.total += e.amount;
    entry.count += 1;
    byCategory.set(e.category, entry);
  }
  return Array.from(byCategory.entries())
    .map(([category, { total, count }]) => ({
      category,
      total,
      count,
      percentOfTotal: grandTotal === 0 ? 0 : (total / grandTotal) * 100,
    }))
    .sort((a, b) => b.total - a.total);
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(expenses: Expense[], breakdown?: CategoryTotal[]): string {
  const header = ["Date", "Category", "Description", "Amount"];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    e.description,
    e.amount.toFixed(2),
  ]);
  const lines = [header, ...rows].map((row) => row.map(escapeCsvField).join(","));

  if (breakdown && breakdown.length > 0) {
    lines.push("", "Category,Total,Count,% of total");
    for (const b of breakdown) {
      lines.push(
        [b.category, b.total.toFixed(2), String(b.count), `${b.percentOfTotal.toFixed(1)}%`]
          .map(escapeCsvField)
          .join(",")
      );
    }
  }

  return lines.join("\n");
}

export function buildJson(
  expenses: Expense[],
  filters: Pick<ExportFilters, "startDate" | "endDate" | "categories">,
  breakdown?: CategoryTotal[]
): string {
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
    categoryTotals: breakdown?.map((b) => ({
      category: b.category,
      total: Number(b.total.toFixed(2)),
      count: b.count,
      percentOfTotal: Number(b.percentOfTotal.toFixed(1)),
    })),
    expenses: expenses.map((e) => ({
      date: e.date,
      category: e.category,
      description: e.description,
      amount: e.amount,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function buildGroupedPdfRows(expenses: Expense[]): (string | number | { content: string; colSpan?: number; styles?: Record<string, unknown> })[][] {
  const breakdown = computeCategoryBreakdown(expenses);
  const subtotalStyle = { fontStyle: "bold", fillColor: [241, 245, 249] };
  const body: ReturnType<typeof buildGroupedPdfRows> = [];

  for (const { category, total } of breakdown) {
    const items = expenses
      .filter((e) => e.category === category)
      .sort((a, b) => a.date.localeCompare(b.date));
    for (const e of items) {
      body.push([formatDate(e.date), e.category, e.description, formatCurrency(e.amount)]);
    }
    body.push([
      { content: `Subtotal — ${category}`, colSpan: 3, styles: subtotalStyle },
      { content: formatCurrency(total), styles: { ...subtotalStyle, halign: "right" } },
    ]);
  }

  return body;
}

export interface PdfReportOptions {
  title: string;
  subtitleLines: string[];
  /** Group rows by category with subtotals, instead of a flat date-sorted list. */
  grouped?: boolean;
  /** Small italic note printed below the table (e.g. a tax disclaimer). */
  footerNote?: string;
}

/**
 * Builds a PDF report client-side via jsPDF + jspdf-autotable. Imported
 * dynamically so the ~450KB PDF engine is only pulled into a user's bundle
 * the first time they actually choose the PDF format.
 */
export async function buildPdf(expenses: Expense[], options: PdfReportOptions): Promise<Blob> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(options.title, marginX, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  let y = 60;
  for (const line of options.subtitleLines) {
    doc.text(line, marginX, y);
    y += 14;
  }

  const body = options.grouped
    ? buildGroupedPdfRows(expenses)
    : expenses.map((e) => [formatDate(e.date), e.category, e.description, formatCurrency(e.amount)]);

  autoTable(doc, {
    startY: y + 8,
    margin: { left: marginX, right: marginX },
    head: [["Date", "Category", "Description", "Amount"]],
    body,
    foot: [
      [
        { content: "Grand total", colSpan: 3, styles: { fontStyle: "bold" } },
        { content: formatCurrency(sumAmount(expenses)), styles: { fontStyle: "bold", halign: "right" } },
      ],
    ],
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" }, // indigo-600
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }, // slate-100 / slate-900
    styles: { fontSize: 9, cellPadding: 6 },
    columnStyles: { 3: { halign: "right" } },
    alternateRowStyles: options.grouped ? undefined : { fillColor: [248, 250, 252] }, // slate-50
  });

  if (options.footerNote) {
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 8;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(options.footerNote, marginX, finalY + 22, {
      maxWidth: doc.internal.pageSize.getWidth() - marginX * 2,
    });
  }

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

export interface ExportRequest {
  format: ExportFormat;
  expenses: Expense[];
  filenameBase: string;
  filters: Pick<ExportFilters, "startDate" | "endDate" | "categories">;
  /** Adds a category-breakdown section (CSV/JSON) or switches the PDF to grouped mode. */
  includeBreakdown?: boolean;
  pdf?: PdfReportOptions;
}

export interface ExportResult {
  filename: string;
  recordCount: number;
  blob: Blob;
}

/** Filters nothing itself — `expenses` must already be the filtered set. Builds the blob only. */
export async function buildExport(request: ExportRequest): Promise<ExportResult> {
  if (request.expenses.length === 0) {
    throw new EmptyExportError();
  }

  const filename = `${sanitizeFilename(request.filenameBase)}.${request.format}`;
  const breakdown = request.includeBreakdown ? computeCategoryBreakdown(request.expenses) : undefined;

  let blob: Blob;
  if (request.format === "csv") {
    blob = new Blob([buildCsv(request.expenses, breakdown)], { type: "text/csv;charset=utf-8;" });
  } else if (request.format === "json") {
    blob = new Blob([buildJson(request.expenses, request.filters, breakdown)], {
      type: "application/json;charset=utf-8;",
    });
  } else {
    blob = await buildPdf(
      request.expenses,
      request.pdf ?? {
        title: "Expense Report",
        subtitleLines: [],
        grouped: request.includeBreakdown,
      }
    );
  }

  return { filename, recordCount: request.expenses.length, blob };
}

/** Builds and triggers the browser download in one step. */
export async function downloadExport(request: ExportRequest): Promise<{ filename: string; recordCount: number }> {
  const result = await buildExport(request);
  downloadBlob(result.filename, result.blob);
  return { filename: result.filename, recordCount: result.recordCount };
}
