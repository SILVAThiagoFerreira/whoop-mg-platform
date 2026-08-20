/**
 * WHOOP MG private data adapter.
 *
 * Deploy as a Web App running as the owner. The Pages client sends identity
 * scope only; this script validates the short-lived Google token and accesses
 * owner-owned Drive/Sheets on the server. No file id, URL, or Drive scope is
 * ever returned to the browser. The only write is the authenticated,
 * validated `ingest` action used by the native iPhone collector; it appends
 * observations and is idempotent by eventId.
 */
const WHOOP_CONFIG = {
  oauthClientId: PropertiesService.getScriptProperties().getProperty('WHOOP_OAUTH_CLIENT_ID') || '',
  rootFolderId: PropertiesService.getScriptProperties().getProperty('WHOOP_ROOT_FOLDER_ID') || '',
  accountPrefix: 'WHOOP MG account — ',
};

function doGet() {
  return json_({ ok: true, service: 'WHOOP MG private adapter', mode: 'authenticated-snapshot-and-ingest' });
}

function doPost(event) {
  try {
    const payload = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    const identity = verifyIdentity_(String(payload.accessToken || ''));
    if (payload.action === 'snapshot') return json_({ ok: true, snapshot: snapshot_(identity.sub) });
    if (payload.action === 'ingest') return json_({ ok: true, ingest: ingest_(identity.sub, payload) });
    return json_({ ok: false, error: 'ACTION_NOT_ALLOWED' });
  } catch (error) {
    const message = error && error.message ? error.message : 'REQUEST_REJECTED';
    const status = message === 'AUTH_REQUIRED' || message === 'AUTH_INVALID' ? 401 : 400;
    return json_({ ok: false, status: status, error: message });
  }
}

function verifyIdentity_(accessToken) {
  if (!accessToken || accessToken.length > 4096) throw new Error('AUTH_REQUIRED');
  if (!WHOOP_CONFIG.oauthClientId || !WHOOP_CONFIG.rootFolderId) throw new Error('SERVER_NOT_CONFIGURED');
  const response = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(accessToken),
    { muteHttpExceptions: true, method: 'get' },
  );
  if (response.getResponseCode() !== 200) throw new Error('AUTH_INVALID');
  const token = JSON.parse(response.getContentText());
  const subject = String(token.sub || token.user_id || '');
  const audience = String(token.aud || '');
  const scopes = String(token.scope || '').split(' ');
  if (!subject || audience !== WHOOP_CONFIG.oauthClientId || scopes.indexOf('openid') === -1) throw new Error('AUTH_INVALID');
  return { sub: subject };
}

function snapshot_(subject) {
  const workspace = workspaceFor_(subject);
  const metrics = readMetrics_(workspace.spreadsheetId);
  const sync = readSync_(workspace.spreadsheetId);
  const history = readHistory_(workspace.spreadsheetId);
  const updatedAt = history.reduce(function (latest, row) {
    return !latest || String(row.timestamp || '') > latest ? String(row.timestamp || '') : latest;
  }, sync.lastSync || null);
  const confidence = record.confidence === '' || record.confidence == null ? '' : Number(record.confidence);
  if (confidence !== '' && (!isFinite(confidence) || confidence < 0 || confidence > 1)) throw new Error('CONFIDENCE_INVALID');
  return {
    metrics: metrics,
    history: history,
    lastSync: sync.lastSync,
    collectorStatus: sync.status === 'complete' ? 'online' : sync.status ? 'offline' : 'unknown',
    updatedAt: updatedAt,
    dataAvailable: metrics.length > 0,
    source: 'Google Drive / Google Sheets private workspace',
  };
}

function ingest_(subject, payload) {
  const records = payload && Array.isArray(payload.records) ? payload.records : [];
  if (!records.length || records.length > 250) throw new Error('INGEST_BATCH_INVALID');
  const workspace = workspaceFor_(subject);
  const sheet = SpreadsheetApp.openById(workspace.spreadsheetId).getSheetByName('DAILY_METRICS');
  if (!sheet) throw new Error('DATA_SHEET_MISSING');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = existingEventKeys_(sheet);
    const rows = [];
    records.forEach(function (record) {
      const normalized = normalizeRecord_(record);
      const key = normalized.eventId || [normalized.timestamp, normalized.metric, normalized.value].join(':');
      if (!existing[key]) {
        existing[key] = true;
        rows.push([normalized.timestamp, normalized.metric, normalized.value, normalized.unit, normalized.source, normalized.sourceType, normalized.quality, normalized.confidence, normalized.eventId]);
      }
    });
    if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
    const syncSheet = SpreadsheetApp.openById(workspace.spreadsheetId).getSheetByName('SYNC_LOG');
    if (syncSheet) syncSheet.appendRow([new Date().toISOString(), 'complete', rows.length ? rows[rows.length - 1][0] : '', 'iphone', rows.length + ' record(s) accepted', digest_(subject).slice(0, 16)]);
    return { accepted: rows.length, duplicates: records.length - rows.length, status: 'complete' };
  } finally {
    lock.releaseLock();
  }
}

function normalizeRecord_(record) {
  if (!record || typeof record !== 'object') throw new Error('RECORD_INVALID');
  const metric = String(record.metric || '').trim().toLowerCase();
  const value = Number(record.value);
  const timestamp = String(record.timestamp || '').trim();
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(metric) || !isFinite(value) || !timestamp || isNaN(new Date(timestamp).getTime())) throw new Error('RECORD_INVALID');
  const sourceType = String(record.sourceType || record.source_type || 'MEASURED').toUpperCase();
  const allowedTypes = { RAW: true, MEASURED: true, DERIVED: true, ESTIMATED: true, UNKNOWN: true };
  if (!allowedTypes[sourceType]) throw new Error('SOURCE_TYPE_INVALID');
  const quality = String(record.quality || 'UNKNOWN').toUpperCase().slice(0, 32);
  return {
    timestamp: new Date(timestamp).toISOString(),
    metric: metric,
    value: value,
    unit: String(record.unit || '').slice(0, 16),
    source: String(record.source || 'iphone').slice(0, 64),
    sourceType: sourceType,
    quality: quality,
    confidence: confidence,
    eventId: String(record.eventId || record.event_id || '').slice(0, 120),
  };
}

function existingEventKeys_(sheet) {
  if (sheet.getLastRow() < 2) return {};
  const values = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, 5000), 9).getDisplayValues();
  const keys = {};
  values.forEach(function (row) {
    const eventId = String(row[8] || '');
    if (eventId) keys[eventId] = true;
    keys[[row[0], row[1], row[2]].join(':')] = true;
  });
  return keys;
}

function workspaceFor_(subject) {
  const accountId = digest_(subject);
  const props = PropertiesService.getScriptProperties();
  const key = 'WHOOP_ACCOUNT_' + accountId;
  const existing = props.getProperty(key);
  if (existing) return JSON.parse(existing);
  const root = DriveApp.getFolderById(WHOOP_CONFIG.rootFolderId);
  const folder = root.createFolder(WHOOP_CONFIG.accountPrefix + accountId.slice(0, 12));
  const spreadsheet = SpreadsheetApp.create('WHOOP MG private metrics — ' + accountId.slice(0, 12));
  DriveApp.getFileById(spreadsheet.getId()).moveTo(folder);
  initializeSpreadsheet_(spreadsheet);
  const workspace = { folderId: folder.getId(), spreadsheetId: spreadsheet.getId() };
  props.setProperty(key, JSON.stringify(workspace));
  return workspace;
}

function initializeSpreadsheet_(book) {
  const first = book.getSheets()[0];
  first.setName('DAILY_METRICS');
  first.getRange(1, 1, 1, 9).setValues([['timestamp', 'metric', 'value', 'unit', 'source', 'source_type', 'quality', 'confidence', 'event_id']]);
  book.insertSheet('SYNC_LOG').getRange(1, 1, 1, 6).setValues([['timestamp', 'status', 'last_sample', 'collector', 'message', 'account_id']]);
  book.insertSheet('CONFIG').getRange(1, 1, 1, 2).setValues([['key', 'value']]);
}

function readMetrics_(spreadsheetId) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('DAILY_METRICS');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 5001), 9).getDisplayValues();
  const latest = {};
  rows.slice(1).forEach(function (row) {
    if (!row[1]) return;
    if (!latest[row[1]] || row[0] >= latest[row[1]].timestamp) {
      latest[row[1]] = { metric: row[1], value: row[2] || '—', unit: row[3] || undefined, source: row[4] || undefined, sourceType: row[5] || undefined, quality: row[6] || undefined, timestamp: row[0] || undefined };
    }
  });
  return Object.keys(latest).map(function (key) { return latest[key]; });
}

function readHistory_(spreadsheetId) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('DAILY_METRICS');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(2, 1, Math.min(sheet.getLastRow() - 1, 5000), 9).getDisplayValues();
  return rows.filter(function (row) { return row[0] && row[1] && row[2] !== ''; }).slice(-1500).map(function (row) {
    return { metric: row[1], value: row[2], unit: row[3] || undefined, source: row[4] || undefined, sourceType: row[5] || undefined, quality: row[6] || undefined, timestamp: row[0] || undefined };
  });
}

function readSync_(spreadsheetId) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('SYNC_LOG');
  if (!sheet || sheet.getLastRow() < 2) return { status: '', lastSync: null };
  const row = sheet.getRange(sheet.getLastRow(), 1, 1, 6).getDisplayValues()[0];
  return { status: String(row[1] || '').toLowerCase(), lastSync: row[0] || null };
}

function digest_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'whoop-mg:v2:' + value)
    .map(function (byte) { return (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'); })
    .join('');
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
