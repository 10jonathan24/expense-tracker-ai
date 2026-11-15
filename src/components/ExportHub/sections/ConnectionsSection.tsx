"use client";

import { useState } from "react";
import {
  CONNECTION_SERVICES,
  ConnectionService,
  ConnectionsMap,
  connectService,
  disconnectService,
  loadConnections,
} from "@/lib/exportConnections";

const DEMO_ACCOUNT = "demo@example.com";

function formatConnectedAt(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ConnectionsSection() {
  const [connections, setConnections] = useState<ConnectionsMap>(loadConnections);
  const [consentFor, setConsentFor] = useState<ConnectionService | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function handleConfirmConnect(service: ConnectionService) {
    setConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 600)); // feel of a real OAuth round-trip
    setConnections(connectService(service, DEMO_ACCOUNT));
    setConnecting(false);
    setConsentFor(null);
  }

  function handleDisconnect(service: ConnectionService) {
    setConnections(disconnectService(service));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        These are demo flows for exploring what account-connected exports would feel like — no real Google, Dropbox,
        or Microsoft account is ever contacted, and nothing is asked for beyond clicking a button below.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {CONNECTION_SERVICES.map((meta) => {
          const state = connections[meta.service];
          const isConsenting = consentFor === meta.service;
          return (
            <div key={meta.service} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${meta.badgeClass}`}>
                  {meta.label[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>
                </div>
              </div>

              <div className="mt-3">
                {state.connected ? (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <div className="text-xs text-emerald-700">
                      <p className="font-medium">Connected as {state.accountLabel}</p>
                      <p className="text-emerald-600/80">Since {formatConnectedAt(state.connectedAt)} · demo only</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(meta.service)}
                      className="shrink-0 rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : isConsenting ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-700">Expense Tracker would like to:</p>
                    <ul className="mt-1.5 space-y-1 text-xs text-slate-500">
                      <li>• View your {meta.label} account name</li>
                      <li>• Create new files on your behalf</li>
                    </ul>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Demo only — continuing just stores a fake &quot;{DEMO_ACCOUNT}&quot; connection in this browser.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmConnect(meta.service)}
                        disabled={connecting}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        {connecting ? "Connecting…" : `Continue as ${DEMO_ACCOUNT}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConsentFor(null)}
                        disabled={connecting}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConsentFor(meta.service)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Connect <span className="text-slate-400">(demo)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
