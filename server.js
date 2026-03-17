require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, generateToken, generateId } = require('./database');
const { isDriveConfigured, createProjectFolder, syncFile, syncBriefing } = require('./gdrive');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'elevo2026!';
const MAX_PROJECT_SIZE = 1024 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', req.params.token);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, crypto.randomBytes(8).toString('hex') + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/webp','image/svg+xml','image/gif',
      'application/pdf','video/mp4','video/quicktime',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

// ═══ AUTH ═══
function adminAuth(req, res, next) {
  if (req.headers['x-admin-token'] === ADMIN_PASSWORD) return next();
  res.status(401).json({ error: 'Nicht autorisiert' });
}

// ═══ ADMIN: Login ═══
app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD, driveEnabled: isDriveConfigured() });
  } else {
    res.status(401).json({ error: 'Falsches Passwort' });
  }
});

// ═══ ADMIN: Create Project ═══
app.post('/api/admin/projects', adminAuth, async (req, res) => {
  const db = getDb();
  const { company_name, client_email } = req.body;
  const id = generateId();
  const token = generateToken();

  // Google Drive Ordner erstellen
  let gdriveFolderId = null;
  if (isDriveConfigured()) {
    const folder = await createProjectFolder(company_name);
    if (folder) gdriveFolderId = folder.folderId;
  }

  db.prepare(`INSERT INTO projects (id, token, company_name, client_email, gdrive_folder_id) VALUES (?, ?, ?, ?, ?)`)
    .run(id, token, company_name, client_email || null, gdriveFolderId);

  const defaultItems = [
    { item: 'Logo (PNG/SVG)', category: 'logo', required: 1 },
    { item: 'Team-/Portraitfotos', category: 'team', required: 0 },
    { item: 'Fotos Räumlichkeiten', category: 'space', required: 0 },
    { item: 'Fotos Produkte/Arbeit', category: 'work', required: 0 },
    { item: 'Sonstige Dateien', category: 'other', required: 0 },
    { item: 'Briefing ausgefüllt', category: 'briefing', required: 1 },
  ];

  const ins = db.prepare(`INSERT INTO checklist (project_id, item, category, required) VALUES (?, ?, ?, ?)`);
  for (const ci of defaultItems) ins.run(id, ci.item, ci.category, ci.required);

  res.json({ id, token, url: `/p/${token}`, gdrive: !!gdriveFolderId });
});

// ═══ ADMIN: List Projects ═══
app.get('/api/admin/projects', adminAuth, (req, res) => {
  const db = getDb();
  const projects = db.prepare(`SELECT * FROM projects ORDER BY created_at DESC`).all();

  const enriched = projects.map(p => {
    const uc = db.prepare(`SELECT COUNT(*) as c FROM uploads WHERE project_id = ?`).get(p.id).c;
    const us = db.prepare(`SELECT COALESCE(SUM(size),0) as t FROM uploads WHERE project_id = ?`).get(p.id).t;
    const bs = db.prepare(`SELECT COUNT(*) as c FROM briefing WHERE project_id = ?`).get(p.id).c;
    const cl = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(p.id);
    const done = cl.filter(c => c.completed).length;
    return { ...p, upload_count: uc, upload_size: us, briefing_steps: bs,
      checklist_total: cl.length, checklist_completed: done,
      progress: cl.length > 0 ? Math.round((done / cl.length) * 100) : 0 };
  });
  res.json(enriched);
});

// ═══ ADMIN: Project Detail ═══
app.get('/api/admin/projects/:id', adminAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const uploads = db.prepare(`SELECT * FROM uploads WHERE project_id = ? ORDER BY uploaded_at DESC`).all(p.id);
  const briefing = db.prepare(`SELECT * FROM briefing WHERE project_id = ? ORDER BY step`).all(p.id);
  const checklist = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(p.id);

  res.json({ ...p, uploads, briefing, checklist });
});

// ═══ ADMIN: Delete Project ═══
app.delete('/api/admin/projects/:id', adminAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const dir = path.join(__dirname, 'uploads', p.token);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });

  db.prepare(`DELETE FROM uploads WHERE project_id = ?`).run(p.id);
  db.prepare(`DELETE FROM briefing WHERE project_id = ?`).run(p.id);
  db.prepare(`DELETE FROM checklist WHERE project_id = ?`).run(p.id);
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(p.id);
  res.json({ success: true });
});

// ═══ ADMIN: Download File ═══
app.get('/api/admin/download/:projectId/:fileId', adminAuth, (req, res) => {
  const db = getDb();
  const f = db.prepare(`SELECT u.*, p.token FROM uploads u JOIN projects p ON u.project_id = p.id WHERE u.id = ? AND u.project_id = ?`)
    .get(req.params.fileId, req.params.projectId);
  if (!f) return res.status(404).json({ error: 'Nicht gefunden' });
  res.download(path.join(__dirname, 'uploads', f.token, f.stored_name), f.original_name);
});

// ═══ ADMIN: Download All ═══
app.get('/api/admin/download-all/:projectId', adminAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.projectId);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const dir = path.join(__dirname, 'uploads', p.token);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Keine Dateien' });

  const { execSync } = require('child_process');
  const tarPath = path.join(__dirname, 'uploads', `${p.company_name.replace(/[^a-zA-Z0-9]/g, '_')}.tar.gz`);
  try {
    execSync(`tar -czf "${tarPath}" -C "${dir}" .`);
    res.download(tarPath, `${p.company_name}_dateien.tar.gz`, () => fs.unlinkSync(tarPath));
  } catch (e) {
    res.status(500).json({ error: 'Archiv-Fehler' });
  }
});

// ═══ ADMIN: Drive Status ═══
app.get('/api/admin/drive-status', adminAuth, (req, res) => {
  res.json({ enabled: isDriveConfigured() });
});

// ═══ PORTAL: Get Project ═══
app.get('/api/portal/:token', (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, company_name, status FROM projects WHERE token = ?`).get(req.params.token);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });
  if (p.status !== 'active') return res.status(403).json({ error: 'Portal nicht aktiv' });

  const briefing = db.prepare(`SELECT step, data FROM briefing WHERE project_id = ? ORDER BY step`).all(p.id);
  const uploads = db.prepare(`SELECT id, category, original_name, mime_type, size, uploaded_at FROM uploads WHERE project_id = ?`).all(p.id);
  const checklist = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(p.id);

  res.json({
    company_name: p.company_name,
    briefing: briefing.reduce((a, b) => { a[b.step] = JSON.parse(b.data); return a; }, {}),
    uploads, checklist
  });
});

// ═══ PORTAL: Save Briefing ═══
app.post('/api/portal/:token/briefing/:step', async (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, status, gdrive_folder_id, company_name FROM projects WHERE token = ?`).get(req.params.token);
  if (!p || p.status !== 'active') return res.status(404).json({ error: 'Nicht gefunden' });

  const step = parseInt(req.params.step);
  const data = JSON.stringify(req.body);

  db.prepare(`INSERT INTO briefing (project_id, step, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(project_id, step) DO UPDATE SET data = ?, updated_at = CURRENT_TIMESTAMP`)
    .run(p.id, step, data, data);

  const bc = db.prepare(`SELECT COUNT(*) as c FROM briefing WHERE project_id = ?`).get(p.id).c;
  if (bc >= 5) {
    db.prepare(`UPDATE checklist SET completed = 1 WHERE project_id = ? AND category = 'briefing'`).run(p.id);
  }
  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(p.id);

  // Sync briefing to Drive
  if (p.gdrive_folder_id) {
    const allBriefing = db.prepare(`SELECT step, data FROM briefing WHERE project_id = ? ORDER BY step`).all(p.id);
    const briefingObj = allBriefing.reduce((a, b) => { a[`step_${b.step}`] = JSON.parse(b.data); return a; }, {});
    syncBriefing(p.gdrive_folder_id, briefingObj, p.company_name).catch(() => {});
  }

  res.json({ success: true });
});

// ═══ PORTAL: Upload Files ═══
app.post('/api/portal/:token/upload', upload.array('files', 20), async (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, status, token, gdrive_folder_id FROM projects WHERE token = ?`).get(req.params.token);
  if (!p || p.status !== 'active') return res.status(404).json({ error: 'Nicht gefunden' });

  const currentSize = db.prepare(`SELECT COALESCE(SUM(size),0) as t FROM uploads WHERE project_id = ?`).get(p.id).t;
  const newSize = req.files.reduce((s, f) => s + f.size, 0);
  if (currentSize + newSize > MAX_PROJECT_SIZE) {
    req.files.forEach(f => fs.unlinkSync(f.path));
    return res.status(413).json({ error: 'Speicherlimit erreicht (1 GB)' });
  }

  const category = req.body.category || 'other';
  const ins = db.prepare(`INSERT INTO uploads (project_id, category, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)`);

  const uploaded = [];
  for (const file of req.files) {
    const result = ins.run(p.id, category, file.originalname, file.filename, file.mimetype, file.size);
    uploaded.push({ name: file.originalname, size: file.size, id: result.lastInsertRowid });

    // Sync to Google Drive (async, don't block response)
    if (p.gdrive_folder_id) {
      syncFile(p.gdrive_folder_id, file.path, file.originalname, file.mimetype, category)
        .then(gdriveId => {
          if (gdriveId) {
            db.prepare(`UPDATE uploads SET gdrive_file_id = ?, synced = 1 WHERE id = ?`).run(gdriveId, result.lastInsertRowid);
          }
        }).catch(() => {});
    }
  }

  // Update checklist
  db.prepare(`UPDATE checklist SET completed = 1 WHERE project_id = ? AND category = ?`).run(p.id, category);
  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(p.id);

  res.json({ success: true, uploaded });
});

// ═══ PORTAL: Delete Upload ═══
app.delete('/api/portal/:token/upload/:uploadId', (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, token, status FROM projects WHERE token = ?`).get(req.params.token);
  if (!p || p.status !== 'active') return res.status(404).json({ error: 'Nicht gefunden' });

  const f = db.prepare(`SELECT * FROM uploads WHERE id = ? AND project_id = ?`).get(req.params.uploadId, p.id);
  if (!f) return res.status(404).json({ error: 'Nicht gefunden' });

  const fp = path.join(__dirname, 'uploads', p.token, f.stored_name);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare(`DELETE FROM uploads WHERE id = ?`).run(f.id);

  const rem = db.prepare(`SELECT COUNT(*) as c FROM uploads WHERE project_id = ? AND category = ?`).get(p.id, f.category).c;
  if (rem === 0) db.prepare(`UPDATE checklist SET completed = 0 WHERE project_id = ? AND category = ?`).run(p.id, f.category);

  res.json({ success: true });
});

// ═══ PAGE ROUTES ═══
app.get('/p/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'portal.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.redirect('/admin'));

// ═══ START ═══
app.listen(PORT, () => {
  console.log(`ELEVO Portal running on port ${PORT}`);
  console.log(`Google Drive Sync: ${isDriveConfigured() ? 'AKTIV' : 'NICHT KONFIGURIERT'}`);
  getDb();
});
