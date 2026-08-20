import type { GoogleUser } from "../auth/google";

/**
 * The Pages client deliberately has no Drive or Sheets capability.
 *
 * Health data is either read from a trusted server-side adapter (the API URL
 * is injected at build time) or remains local to the local engine. The browser never gets
 * a file id, spreadsheet id, Drive URL, or a write primitive.
 */
const API_URL =
  (import.meta.env.VITE_WHOOP_API_URL as string | undefined)?.trim() ?? "";

export type AccountMetric = {
  metric: string;
  value: string;
  unit?: string;
  source?: string;
  sourceType?: string;
  quality?: string;
  timestamp?: string;
};

export type AccountSnapshot = {
  metrics: AccountMetric[];
  history: AccountMetric[];
  lastSync: string | null;
  updatedAt: string | null;
  collectorStatus: "online" | "offline" | "unknown";
  dataAvailable: boolean;
  storage: "local" | "server";
  message?: string;
};

type BackendResponse = {
  snapshot?: Omit<AccountSnapshot, "storage">;
  error?: string;
};

export function isBackendConfigured(): boolean {
  return Boolean(API_URL);
}

function localSnapshot(): AccountSnapshot {
  return {
    metrics: [],
    history: [],
    lastSync: null,
    updatedAt: null,
    collectorStatus: "unknown",
    dataAvailable: false,
    storage: "local",
    message:
      "Conecte o agente local neste dispositivo ou configure o serviço privado para sincronizar.",
  };
}

async function callBackend(
  token: string,
  user: GoogleUser,
): Promise<AccountSnapshot> {
  if (!API_URL) return localSnapshot();

  const response = await fetch(API_URL, {
    method: "POST",
    // Apps Script Web Apps do not expose a configurable OPTIONS handler. A
    // simple text request avoids a browser preflight; the body remains JSON.
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({
      action: "snapshot",
      accessToken: token,
      // The server must ignore this value for authorization. It is only a
      // diagnostic hint; the verified Google subject is the tenant key.
      clientSubjectHint: user.sub,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as BackendResponse;
  if (
    response.status === 401 ||
    body.error === "AUTH_INVALID" ||
    body.error === "AUTH_REQUIRED"
  )
    throw new Error("AUTH_EXPIRED");
  if (!response.ok || !body.snapshot)
    throw new Error(
      body.error ?? "Não foi possível carregar os dados privados.",
    );
  return {
    ...body.snapshot,
    history: body.snapshot.history ?? [],
    updatedAt: body.snapshot.updatedAt ?? body.snapshot.lastSync ?? null,
    storage: "server",
  };
}

export async function readAccountSnapshot(
  token: string,
  user: GoogleUser,
): Promise<AccountSnapshot> {
  // A local password authenticates the account record in this browser. It is
  // not a WHOOP API credential and must never be sent to the remote adapter.
  if (token.startsWith("local-token:")) return localSnapshot();
  return callBackend(token, user);
}
