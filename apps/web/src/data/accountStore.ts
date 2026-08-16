import { googleClientId, type GoogleUser } from "../auth/google";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const SHEETS_API = "https://sheets.googleapis.com/v4";
const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const TABS = ["CONFIG", "DAILY_METRICS", "SYNC_LOG", "RAW_INDEX"] as const;

export type AccountWorkspace = {
  accountId: string;
  folderId: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
};
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
};
type DriveList = {
  files?: Array<{
    id: string;
    name: string;
    appProperties?: Record<string, string>;
  }>;
};

async function api<T>(
  token: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    const error = new Error(
      response.status === 401
        ? "AUTH_EXPIRED"
        : `Google API ${response.status}: ${body.slice(0, 180)}`,
    );
    throw error;
  }
  return (await response.json()) as T;
}

function queryUrl(query: string, fields: string): string {
  return `${DRIVE_API}/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=20&fields=${encodeURIComponent(fields)}`;
}

async function accountKey(subject: string): Promise<string> {
  const bytes = new TextEncoder().encode(
    `whoop-mg:v1:${googleClientId()}:${subject}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function findOrCreateFolder(
  token: string,
  accountId: string,
): Promise<{ id: string; created: boolean }> {
  const query = `mimeType='${FOLDER_MIME}' and trashed=false and appProperties has { key='whoopAccountId' and value='${accountId}' }`;
  const found = await api<DriveList>(
    token,
    queryUrl(query, "files(id,name,appProperties)"),
  );
  if (found.files?.[0]) return { id: found.files[0].id, created: false };
  const created = await api<{ id: string }>(
    token,
    `${DRIVE_API}/files?fields=id`,
    {
      method: "POST",
      body: JSON.stringify({
        name: "WHOOP MG Lab",
        mimeType: FOLDER_MIME,
        appProperties: { whoopAccountId: accountId, schemaVersion: "1" },
      }),
    },
  );
  return { id: created.id, created: true };
}

async function createSpreadsheet(
  token: string,
  accountId: string,
  folderId: string,
): Promise<string> {
  const created = await api<{ spreadsheetId: string }>(
    token,
    `${SHEETS_API}/spreadsheets`,
    {
      method: "POST",
      body: JSON.stringify({
        properties: { title: "WHOOP MG Lab — Private Account" },
      }),
    },
  );
  await api(
    token,
    `${DRIVE_API}/files/${created.spreadsheetId}?addParents=${encodeURIComponent(folderId)}&fields=id`,
    {
      method: "PATCH",
      body: JSON.stringify({
        appProperties: { whoopAccountId: accountId, schemaVersion: "1" },
      }),
    },
  );
  return created.spreadsheetId;
}

async function initializeSpreadsheet(
  token: string,
  spreadsheetId: string,
  accountId: string,
): Promise<void> {
  const metadata = await api<{
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(
    token,
    `${SHEETS_API}/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
  );
  const existing = new Set(
    (metadata.sheets ?? [])
      .map((sheet) => sheet.properties?.title)
      .filter(Boolean),
  );
  const requests = TABS.filter((title) => !existing.has(title)).map(
    (title) => ({ addSheet: { properties: { title } } }),
  );
  if (requests.length)
    await api(
      token,
      `${SHEETS_API}/spreadsheets/${spreadsheetId}:batchUpdate`,
      { method: "POST", body: JSON.stringify({ requests }) },
    );
  const values = {
    valueInputOption: "RAW",
    data: [
      {
        range: "CONFIG!A1:B3",
        values: [
          ["key", "value"],
          ["account_id", accountId],
          ["created_by", "WHOOP MG Lab"],
        ],
      },
      {
        range: "DAILY_METRICS!A1:H1",
        values: [
          [
            "timestamp",
            "metric",
            "value",
            "unit",
            "source",
            "source_type",
            "quality",
            "confidence",
          ],
        ],
      },
      {
        range: "SYNC_LOG!A1:F1",
        values: [
          [
            "timestamp",
            "status",
            "last_sample",
            "collector",
            "message",
            "account_id",
          ],
        ],
      },
    ],
  };
  await api(
    token,
    `${SHEETS_API}/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    { method: "POST", body: JSON.stringify(values) },
  );
}

export async function ensureAccountWorkspace(
  token: string,
  user: GoogleUser,
): Promise<AccountWorkspace> {
  const accountId = await accountKey(user.sub);
  const folder = await findOrCreateFolder(token, accountId);
  const query = `mimeType='${SPREADSHEET_MIME}' and trashed=false and appProperties has { key='whoopAccountId' and value='${accountId}' }`;
  const found = await api<DriveList>(
    token,
    queryUrl(query, "files(id,name,appProperties)"),
  );
  const spreadsheetCreated = !found.files?.[0];
  const spreadsheetId =
    found.files?.[0]?.id ??
    (await createSpreadsheet(token, accountId, folder.id));
  if (spreadsheetCreated)
    await initializeSpreadsheet(token, spreadsheetId, accountId);
  return {
    accountId,
    folderId: folder.id,
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

async function readRange(
  token: string,
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const result = await api<{ values?: string[][] }>(
    token,
    `${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`,
  );
  return result.values ?? [];
}

export async function readAccountSnapshot(
  token: string,
  workspace: AccountWorkspace,
): Promise<AccountSnapshot> {
  const [metricRows, syncRows] = await Promise.all([
    readRange(token, workspace.spreadsheetId, "DAILY_METRICS!A1:H200"),
    readRange(token, workspace.spreadsheetId, "SYNC_LOG!A1:F100"),
  ]);
  const headers = (metricRows[0] ?? []).map((header) =>
    String(header).toLowerCase(),
  );
  const index = (name: string) => headers.indexOf(name);
  const latest = new Map<string, AccountMetric>();
  for (const row of metricRows.slice(1)) {
    const metric = String(row[index("metric")] ?? "");
    if (!metric) continue;
    const timestamp = String(row[index("timestamp")] ?? "");
    const previous = latest.get(metric);
    if (!previous || timestamp >= (previous.timestamp ?? ""))
      latest.set(metric, {
        metric,
        value: String(row[index("value")] ?? "—"),
        unit: String(row[index("unit")] ?? "") || undefined,
        source: String(row[index("source")] ?? "") || undefined,
        sourceType: String(row[index("source_type")] ?? "") || undefined,
        quality: String(row[index("quality")] ?? "") || undefined,
        timestamp,
      });
  }
  const syncHeader = (syncRows[0] ?? []).map((header) =>
    String(header).toLowerCase(),
  );
  const syncIndex = (name: string) => syncHeader.indexOf(name);
  const latestSync = syncRows.slice(1).at(-1);
  const syncStatus = String(
    latestSync?.[syncIndex("status")] ?? "",
  ).toLowerCase();
  return {
    metrics: [...latest.values()],
    lastSync: String(latestSync?.[syncIndex("timestamp")] ?? "") || null,
    collectorStatus:
      syncStatus === "complete" ? "online" : syncStatus ? "offline" : "unknown",
    dataAvailable: latest.size > 0,
  };
}
