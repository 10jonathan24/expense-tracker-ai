import { Expense } from "@/types/expense";
import { ExportFilters, buildCsv, computeCategoryBreakdown, filterExpenses, sumAmount } from "@/lib/exportCore";

/**
 * Everything here runs entirely in the browser: no network request, no
 * third-party API, no server. The "link" is the data itself, base64-encoded
 * into a data: URI — opening it just re-decodes the bytes locally. That also
 * means it stops working the moment the recipient doesn't have the link
 * text anymore (nothing is hosted anywhere to revoke or expire).
 */

function toCsvDataUri(csv: string): string {
  const bytes = new TextEncoder().encode(csv);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `data:text/csv;charset=utf-8;base64,${btoa(binary)}`;
}

export interface ShareableLink {
  dataUri: string;
  recordCount: number;
}

/** Always full-fidelity (every matching row) — fine for "Copy link", which isn't size-constrained. */
export function buildShareableLink(expenses: Expense[], filters: ExportFilters): ShareableLink {
  const filtered = filterExpenses(expenses, filters);
  return { dataUri: toCsvDataUri(buildCsv(filtered)), recordCount: filtered.length };
}

// Comfortable upper bound for a QR code that still scans reliably at a
// normal display size. Full exports usually blow past this, so QR falls
// back to a compact summary rather than failing or rendering an unscannable
// mess of modules.
const QR_SAFE_URI_LENGTH = 900;

export interface QrPayload {
  dataUri: string;
  recordCount: number;
  /** True when the full export didn't fit and this QR encodes a category summary instead. */
  isSummary: boolean;
}

export function buildQrPayload(expenses: Expense[], filters: ExportFilters): QrPayload {
  const filtered = filterExpenses(expenses, filters);
  const fullUri = toCsvDataUri(buildCsv(filtered));
  if (fullUri.length <= QR_SAFE_URI_LENGTH) {
    return { dataUri: fullUri, recordCount: filtered.length, isSummary: false };
  }

  const breakdown = computeCategoryBreakdown(filtered);
  const summaryCsv = [
    "Category,Total,Count,% of total",
    ...breakdown.map(
      (b) => `${b.category},${b.total.toFixed(2)},${b.count},${b.percentOfTotal.toFixed(1)}%`
    ),
    "",
    `Grand total,${sumAmount(filtered).toFixed(2)},${filtered.length},100%`,
  ].join("\n");

  return { dataUri: toCsvDataUri(summaryCsv), recordCount: filtered.length, isSummary: true };
}

/** Pulls in the `qrcode` package dynamically so it isn't in the main bundle until Share is opened. */
export async function generateQrImage(text: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 240,
    color: { dark: "#1e293b", light: "#ffffff" },
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
