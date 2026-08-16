function doGet() { return json_({ ok: true, service: 'WHOOP MG Lab', mode: 'read-only-by-default' }); }
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }

