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
  lastSync: string | null;
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
    lastSync: null,
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
    headers: { "Content-Type": "application/json" },
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
  return { ...body.snapshot, storage: "server" };
}

export async function readAccountSnapshot(
  token: string,
  user: GoogleUser,
): Promise<AccountSnapshot> {
  return callBackend(token, user);
}
