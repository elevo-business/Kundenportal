/**
 * ELEVO — Google Drive Sync
 * 
 * Automatisch Kunden-Uploads nach Google Drive pushen.
 * Jeder Kunde bekommt einen eigenen Ordner.
 * 
 * Setup:
 * 1. Google Cloud Console → Neues Projekt
 * 2. Google Drive API aktivieren
 * 3. Service Account erstellen
 * 4. JSON Key downloaden → als gdrive-credentials.json speichern
 * 5. In Google Drive: Zielordner erstellen, Service Account E-Mail als Editor einladen
 * 6. GDRIVE_PARENT_FOLDER_ID in .env setzen
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

let driveClient = null;

function isDriveConfigured() {
  return !!(
    process.env.GDRIVE_PARENT_FOLDER_ID &&
    fs.existsSync(path.join(__dirname, 'gdrive-credentials.json'))
  );
}

function getDriveClient() {
  if (driveClient) return driveClient;
  if (!isDriveConfigured()) return null;

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'gdrive-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    driveClient = google.drive({ version: 'v3', auth });
    console.log('Google Drive sync aktiv.');
    return driveClient;
  } catch (e) {
    console.error('Google Drive Auth Fehler:', e.message);
    return null;
  }
}

/**
 * Erstellt einen Ordner für ein Kundenprojekt
 */
async function createProjectFolder(companyName) {
  const drive = getDriveClient();
  if (!drive) return null;

  try {
    const res = await drive.files.create({
      requestBody: {
        name: `ELEVO — ${companyName}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [process.env.GDRIVE_PARENT_FOLDER_ID],
      },
      fields: 'id, webViewLink',
    });

    // Unterordner erstellen
    const subfolders = ['Logo', 'Team', 'Räumlichkeiten', 'Projekte', 'Sonstiges', 'Briefing'];
    for (const name of subfolders) {
      await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [res.data.id],
        },
      });
    }

    console.log(`Drive-Ordner erstellt: ${companyName} (${res.data.id})`);
    return { folderId: res.data.id, link: res.data.webViewLink };
  } catch (e) {
    console.error('Drive Ordner-Fehler:', e.message);
    return null;
  }
}

/**
 * Lädt eine Datei in den Kundenordner hoch
 */
async function syncFile(projectFolderId, filePath, fileName, mimeType, category) {
  const drive = getDriveClient();
  if (!drive || !projectFolderId) return null;

  const categoryMap = {
    logo: 'Logo',
    team: 'Team',
    space: 'Räumlichkeiten',
    work: 'Projekte',
    other: 'Sonstiges',
  };

  try {
    // Finde den Unterordner
    const subfolderName = categoryMap[category] || 'Sonstiges';
    const folderRes = await drive.files.list({
      q: `'${projectFolderId}' in parents and name='${subfolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    const parentId = folderRes.data.files.length > 0
      ? folderRes.data.files[0].id
      : projectFolderId;

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
      },
      media: {
        mimeType: mimeType || 'application/octet-stream',
        body: fs.createReadStream(filePath),
      },
      fields: 'id',
    });

    console.log(`Synced: ${fileName} → Drive (${res.data.id})`);
    return res.data.id;
  } catch (e) {
    console.error(`Drive Sync-Fehler (${fileName}):`, e.message);
    return null;
  }
}

/**
 * Speichert Briefing als JSON-Datei im Drive
 */
async function syncBriefing(projectFolderId, briefingData, companyName) {
  const drive = getDriveClient();
  if (!drive || !projectFolderId) return;

  try {
    const folderRes = await drive.files.list({
      q: `'${projectFolderId}' in parents and name='Briefing' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });

    const parentId = folderRes.data.files.length > 0
      ? folderRes.data.files[0].id
      : projectFolderId;

    // Prüfe ob Briefing-Datei existiert
    const existing = await drive.files.list({
      q: `'${parentId}' in parents and name='briefing.json' and trashed=false`,
      fields: 'files(id)',
    });

    const content = JSON.stringify(briefingData, null, 2);

    if (existing.data.files.length > 0) {
      // Update
      await drive.files.update({
        fileId: existing.data.files[0].id,
        media: {
          mimeType: 'application/json',
          body: require('stream').Readable.from([content]),
        },
      });
    } else {
      // Create
      await drive.files.create({
        requestBody: {
          name: 'briefing.json',
          parents: [parentId],
        },
        media: {
          mimeType: 'application/json',
          body: require('stream').Readable.from([content]),
        },
      });
    }
  } catch (e) {
    console.error('Briefing Sync-Fehler:', e.message);
  }
}

module.exports = { isDriveConfigured, createProjectFolder, syncFile, syncBriefing };
