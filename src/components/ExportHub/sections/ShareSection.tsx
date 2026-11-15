"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, Expense } from "@/types/expense";
import { formatCurrency } from "@/lib/format";
import { ExportFilters, describeExportFilters, filterExpenses, sumAmount } from "@/lib/exportCore";
import { buildQrPayload, buildShareableLink, copyToClipboard, generateQrImage } from "@/lib/shareLink";

interface ShareSectionProps {
  expenses: Expense[];
  filters: ExportFilters;
}

export function ShareSection({ expenses, filters }: ShareSectionProps) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const matched = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const totalAmount = useMemo(() => sumAmount(matched), [matched]);
  const filterLines = useMemo(() => describeExportFilters(filters, CATEGORIES), [filters]);
  const qrPayload = useMemo(() => buildQrPayload(expenses, filters), [expenses, filters]);

  useEffect(() => {
    let cancelled = false;
    setQrImage(null);
    generateQrImage(qrPayload.dataUri).then((image) => {
      if (!cancelled) setQrImage(image);
    });
    return () => {
      cancelled = true;
    };
  }, [qrPayload.dataUri]);

  async function handleCopyLink() {
    const { dataUri } = buildShareableLink(expenses, filters);
    const ok = await copyToClipboard(dataUri);
    setCopyState(ok ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Share links and QR codes here embed the data directly — there is no server, so nothing is uploaded anywhere,
        and a link only works for as long as whoever has it keeps the text (it cannot be revoked, because nothing is hosted).
      </p>

      <section className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">What is being shared</h3>
        <p className="mt-1 text-sm text-slate-700">
          {matched.length} expense{matched.length === 1 ? "" : "s"} · {formatCurrency(totalAmount)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">{filterLines.join(" · ")} (matches Quick Export current filters)</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shareable link</h3>
          <p className="mt-1 text-xs text-slate-500">
            A full-fidelity copy of every matched row, encoded into the link text itself.
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={matched.length === 0}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Couldn't copy" : "Copy link"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">QR code</h3>
          <p className="mt-1 text-xs text-slate-500">
            {qrPayload.isSummary
              ? "This export is too large to fit in a scannable QR code, so the code below encodes a category-total summary instead — use Copy link for the full data."
              : "Scan with a phone camera to open the full export."}
          </p>
          <div className="mt-3 flex h-[152px] w-[152px] items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
            {matched.length === 0 ? (
              <span className="px-2 text-center text-xs text-slate-400">No data to encode</span>
            ) : qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImage} alt="QR code for this export" className="h-36 w-36" />
            ) : (
              <span className="text-xs text-slate-400">Generating…</span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
