const CONNECTIONS_KEY = "expense-tracker:export-connections";

export type ConnectionService = "googleSheets" | "dropbox" | "oneDrive";

export interface ConnectionMeta {
  service: ConnectionService;
  label: string;
  badgeClass: string; // Tailwind background class for the service's icon badge
  description: string;
}

export const CONNECTION_SERVICES: ConnectionMeta[] = [
  {
    service: "googleSheets",
    label: "Google Sheets",
    badgeClass: "bg-emerald-500",
    description: "Push each export straight into a spreadsheet instead of downloading a file.",
  },
  {
    service: "dropbox",
    label: "Dropbox",
    badgeClass: "bg-blue-500",
    description: "Auto-save exports into a Dropbox folder.",
  },
  {
    service: "oneDrive",
    label: "OneDrive",
    badgeClass: "bg-sky-500",
    description: "Auto-save exports into OneDrive.",
  },
];

export interface ConnectionState {
  connected: boolean;
  accountLabel?: string;
  connectedAt?: string;
}

export type ConnectionsMap = Record<ConnectionService, ConnectionState>;

const DEFAULT_STATE: ConnectionsMap = {
  googleSheets: { connected: false },
  dropbox: { connected: false },
  oneDrive: { connected: false },
};

export function loadConnections(): ConnectionsMap {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(CONNECTIONS_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveConnections(state: ConnectionsMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private browsing, quota exceeded, etc).
  }
}

/** Demo connect flow — no real account is ever contacted; see ConnectionsSection. */
export function connectService(service: ConnectionService, accountLabel: string): ConnectionsMap {
  const next: ConnectionsMap = {
    ...loadConnections(),
    [service]: { connected: true, accountLabel, connectedAt: new Date().toISOString() },
  };
  saveConnections(next);
  return next;
}

export function disconnectService(service: ConnectionService): ConnectionsMap {
  const next: ConnectionsMap = { ...loadConnections(), [service]: { connected: false } };
  saveConnections(next);
  return next;
}
