function listSheets() { const book = SpreadsheetApp.openById(WHOOP_CONFIG.spreadsheetId); return book.getSheets().map(s => ({ name: s.getName(), rows: s.getLastRow(), columns: s.getLastColumn() })); }
function appendSummary(rows) { throw new Error('WRITE_DISABLED: enable only after authenticated deployment and SYSTEM_TEST review'); }

