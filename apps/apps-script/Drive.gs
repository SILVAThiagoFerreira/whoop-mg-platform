function listProjectFiles() { const folder = DriveApp.getFolderById(WHOOP_CONFIG.driveFolderId); const files = folder.getFiles(); const result = []; while (files.hasNext()) { const f = files.next(); result.push({ id: f.getId(), name: f.getName(), mimeType: f.getMimeType(), updated: f.getLastUpdated().toISOString() }); } return result; }

