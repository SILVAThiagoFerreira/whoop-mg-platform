/**
 * WHOOP MG private data adapter.
 *
 * Deploy as a Web App running as the owner. The Pages client sends identity
 * scope only; this script validates the short-lived Google token and accesses
 * owner-owned Drive/Sheets on the server. No file id, URL, or Drive scope is
 * ever returned to the browser.
 */
const WHOOP_CONFIG = {
  oauthClientId: PropertiesService.getScriptProperties().getProperty('WHOOP_OAUTH_CLIENT_ID') || '',
  rootFolderId: PropertiesService.getScriptProperties().getProperty('WHOOP_ROOT_FOLDER_ID') || '',
  accountPrefix: 'WHOOP MG account — ',
};

function doGet() {
  return json_({ ok: true, service: 'WHOOP MG private adapter', mode: 'authenticated-read-only' });
}

function doPost(event) {
  try {
    const payload = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    const identity = verifyIdentity_(String(payload.accessToken || ''));
    if (payload.action === 'snapshot') return json_({ ok: true, snapshot: snapshot_(identity.sub) });
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
  return {
    metrics: metrics,
    lastSync: sync.lastSync,
    collectorStatus: sync.status === 'complete' ? 'online' : sync.status ? 'offline' : 'unknown',
    dataAvailable: metrics.length > 0,
  };
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
  first.getRange(1, 1, 1, 8).setValues([['timestamp', 'metric', 'value', 'unit', 'source', 'source_type', 'quality', 'confidence']]);
  book.insertSheet('SYNC_LOG').getRange(1, 1, 1, 6).setValues([['timestamp', 'status', 'last_sample', 'collector', 'message', 'account_id']]);
  book.insertSheet('CONFIG').getRange(1, 1, 1, 2).setValues([['key', 'value']]);
}

function readMetrics_(spreadsheetId) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('DAILY_METRICS');
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getRange(1, 1, Math.min(sheet.getLastRow(), 201), 8).getDisplayValues();
  const latest = {};
  rows.slice(1).forEach(function (row) {
    if (!row[1]) return;
    if (!latest[row[1]] || row[0] >= latest[row[1]].timestamp) {
      latest[row[1]] = { metric: row[1], value: row[2] || '—', unit: row[3] || undefined, source: row[4] || undefined, sourceType: row[5] || undefined, quality: row[6] || undefined, timestamp: row[0] || undefined };
    }
  });
  return Object.keys(latest).map(function (key) { return latest[key]; });
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
