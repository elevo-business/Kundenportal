require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, generateToken, generateId } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'elevo2026!';
const MAX_PROJECT_SIZE = 1024 * 1024 * 1024; // 1 GB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', req.params.token);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(8).toString('hex') + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif',
      'application/pdf', 'video/mp4', 'video/quicktime',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Dateityp nicht erlaubt.'));
    }
  }
});

// ═══════════════════════════════════════
// ADMIN AUTH MIDDLEWARE
// ═══════════════════════════════════════
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token === ADMIN_PASSWORD) {
    return next();
  }
  res.status(401).json({ error: 'Nicht autorisiert' });
}

// ═══════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════

// Login check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Falsches Passwort' });
  }
});

// Create project
app.post('/api/admin/projects', adminAuth, (req, res) => {
  const db = getDb();
  const { company_name, client_email } = req.body;
  const id = generateId();
  const token = generateToken();

  db.prepare(`INSERT INTO projects (id, token, company_name, client_email) VALUES (?, ?, ?, ?)`)
    .run(id, token, company_name, client_email || null);

  // Create default checklist
  const defaultItems = [
    { item: 'Logo (PNG/SVG)', category: 'logo', required: 1 },
    { item: 'Team-/Portraitfotos', category: 'team', required: 0 },
    { item: 'Fotos Räumlichkeiten', category: 'space', required: 0 },
    { item: 'Fotos Produkte/Arbeit', category: 'work', required: 0 },
    { item: 'Sonstige Dateien', category: 'other', required: 0 },
    { item: 'Briefing ausgefüllt', category: 'briefing', required: 1 },
  ];

  const insertChecklist = db.prepare(
    `INSERT INTO checklist (project_id, item, category, required) VALUES (?, ?, ?, ?)`
  );

  for (const ci of defaultItems) {
    insertChecklist.run(id, ci.item, ci.category, ci.required);
  }

  res.json({ id, token, url: `/p/${token}` });
});

// List all projects
app.get('/api/admin/projects', adminAuth, (req, res) => {
  const db = getDb();
  const projects = db.prepare(`SELECT * FROM projects ORDER BY created_at DESC`).all();

  // Enrich with stats
  const enriched = projects.map(p => {
    const uploadCount = db.prepare(`SELECT COUNT(*) as count FROM uploads WHERE project_id = ?`).get(p.id).count;
    const uploadSize = db.prepare(`SELECT COALESCE(SUM(size), 0) as total FROM uploads WHERE project_id = ?`).get(p.id).total;
    const briefingSteps = db.prepare(`SELECT COUNT(*) as count FROM briefing WHERE project_id = ?`).get(p.id).count;
    const checklist = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(p.id);
    const completedItems = checklist.filter(c => c.completed).length;

    return {
      ...p,
      upload_count: uploadCount,
      upload_size: uploadSize,
      briefing_steps: briefingSteps,
      checklist_total: checklist.length,
      checklist_completed: completedItems,
      progress: checklist.length > 0 ? Math.round((completedItems / checklist.length) * 100) : 0
    };
  });

  res.json(enriched);
});

// Get project detail
app.get('/api/admin/projects/:id', adminAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const uploads = db.prepare(`SELECT * FROM uploads WHERE project_id = ? ORDER BY uploaded_at DESC`).all(project.id);
  const briefing = db.prepare(`SELECT * FROM briefing WHERE project_id = ? ORDER BY step`).all(project.id);
  const checklist = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(project.id);

  res.json({ ...project, uploads, briefing, checklist });
});

// Delete project
app.delete('/api/admin/projects/:id', adminAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  // Delete files
  const uploadDir = path.join(__dirname, 'uploads', project.token);
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true });
  }

  db.prepare(`DELETE FROM uploads WHERE project_id = ?`).run(project.id);
  db.prepare(`DELETE FROM briefing WHERE project_id = ?`).run(project.id);
  db.prepare(`DELETE FROM checklist WHERE project_id = ?`).run(project.id);
  db.prepare(`DELETE FROM projects WHERE id = ?`).run(project.id);

  res.json({ success: true });
});

// Download file
app.get('/api/admin/download/:projectId/:fileId', adminAuth, (req, res) => {
  const db = getDb();
  const file = db.prepare(`SELECT u.*, p.token FROM uploads u JOIN projects p ON u.project_id = p.id WHERE u.id = ? AND u.project_id = ?`)
    .get(req.params.fileId, req.params.projectId);
  if (!file) return res.status(404).json({ error: 'Datei nicht gefunden' });

  const filePath = path.join(__dirname, 'uploads', file.token, file.stored_name);
  res.download(filePath, file.original_name);
});

// Download all files as zip (simplified — sends individual)
app.get('/api/admin/download-all/:projectId', adminAuth, (req, res) => {
  const db = getDb();
  const project = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const uploadDir = path.join(__dirname, 'uploads', project.token);
  if (!fs.existsSync(uploadDir)) return res.status(404).json({ error: 'Keine Dateien' });

  // Use tar for simplicity
  const { execSync } = require('child_process');
  const tarPath = path.join(__dirname, 'uploads', `${project.company_name.replace(/\s/g, '_')}_files.tar.gz`);

  try {
    execSync(`tar -czf "${tarPath}" -C "${uploadDir}" .`);
    res.download(tarPath, `${project.company_name}_dateien.tar.gz`, () => {
      fs.unlinkSync(tarPath);
    });
  } catch (e) {
    res.status(500).json({ error: 'Fehler beim Erstellen des Archivs' });
  }
});

// ═══════════════════════════════════════
// CLIENT PORTAL ROUTES
// ═══════════════════════════════════════

// Get project by token (public)
app.get('/api/portal/:token', (req, res) => {
  const db = getDb();
  const project = db.prepare(`SELECT id, company_name, status FROM projects WHERE token = ?`).get(req.params.token);
  if (!project) return res.status(404).json({ error: 'Projekt nicht gefunden' });
  if (project.status !== 'active') return res.status(403).json({ error: 'Portal nicht mehr aktiv' });

  const briefing = db.prepare(`SELECT step, data FROM briefing WHERE project_id = ? ORDER BY step`).all(project.id);
  const uploads = db.prepare(`SELECT id, category, original_name, mime_type, size, uploaded_at FROM uploads WHERE project_id = ?`).all(project.id);
  const checklist = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(project.id);

  res.json({
    company_name: project.company_name,
    briefing: briefing.reduce((acc, b) => { acc[b.step] = JSON.parse(b.data); return acc; }, {}),
    uploads,
    checklist
  });
});

// Save briefing step
app.post('/api/portal/:token/briefing/:step', (req, res) => {
  const db = getDb();
  const project = db.prepare(`SELECT id, status FROM projects WHERE token = ?`).get(req.params.token);
  if (!project || project.status !== 'active') return res.status(404).json({ error: 'Projekt nicht gefunden' });

  const step = parseInt(req.params.step);
  const data = JSON.stringify(req.body);

  db.prepare(`
    INSERT INTO briefing (project_id, step, data, updated_at) 
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(project_id, step) DO UPDATE SET data = ?, updated_at = CURRENT_TIMESTAMP
  `).run(project.id, step, data, data);

  // Update checklist if all briefing steps saved
  const briefingCount = db.prepare(`SELECT COUNT(*) as count FROM briefing WHERE project_id = ?`).get(project.id).count;
  if (briefingCount >= 5) {
    db.prepare(`UPDATE checklist SET completed = 1 WHERE project_id = ? AND category = 'briefing'`).run(project.id);
  }

  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(project.id);

  res.json({ success: true });
});

// Upload files
app.post('/api/portal/:token/upload', upload.array('files', 20), (req, res) => {
  const db = getDb();
  const project = db.prepare(`SELECT id, status FROM projects WHERE token = ?`).get(req.params.token);
  if (!project || project.status !== 'active') return res.status(404).json({ error: 'Projekt nicht gefunden' });

  // Check total size
  const currentSize = db.prepare(`SELECT COALESCE(SUM(size), 0) as total FROM uploads WHERE project_id = ?`).get(project.id).total;
  const newSize = req.files.reduce((sum, f) => sum + f.size, 0);
  if (currentSize + newSize > MAX_PROJECT_SIZE) {
    // Delete uploaded files
    req.files.forEach(f => fs.unlinkSync(f.path));
    return res.status(413).json({ error: 'Speicherlimit erreicht (1 GB)' });
  }

  const category = req.body.category || 'other';
  const insertUpload = db.prepare(
    `INSERT INTO uploads (project_id, category, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)`
  );

  const uploaded = [];
  for (const file of req.files) {
    insertUpload.run(project.id, category, file.originalname, file.filename, file.mimetype, file.size);
    uploaded.push({ name: file.originalname, size: file.size });
  }

  // Update checklist
  const categoryMap = { logo: 'logo', team: 'team', space: 'space', work: 'work', other: 'other' };
  if (categoryMap[category]) {
    db.prepare(`UPDATE checklist SET completed = 1 WHERE project_id = ? AND category = ?`).run(project.id, category);
  }

  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(project.id);

  res.json({ success: true, uploaded });
});

// Delete single upload
app.delete('/api/portal/:token/upload/:uploadId', (req, res) => {
  const db = getDb();
  const project = db.prepare(`SELECT id, token, status FROM projects WHERE token = ?`).get(req.params.token);
  if (!project || project.status !== 'active') return res.status(404).json({ error: 'Nicht gefunden' });

  const file = db.prepare(`SELECT * FROM uploads WHERE id = ? AND project_id = ?`).get(req.params.uploadId, project.id);
  if (!file) return res.status(404).json({ error: 'Datei nicht gefunden' });

  const filePath = path.join(__dirname, 'uploads', project.token, file.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare(`DELETE FROM uploads WHERE id = ?`).run(file.id);

  // Check if category still has files, if not un-complete checklist
  const remaining = db.prepare(`SELECT COUNT(*) as count FROM uploads WHERE project_id = ? AND category = ?`).get(project.id, file.category).count;
  if (remaining === 0) {
    db.prepare(`UPDATE checklist SET completed = 0 WHERE project_id = ? AND category = ?`).run(project.id, file.category);
  }

  res.json({ success: true });
});

// ═══════════════════════════════════════
// PAGE ROUTES
// ═══════════════════════════════════════
app.get('/p/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'portal.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ═══════════════════════════════════════
// START
// ═══════════════════════════════════════
app.listen(PORT, () => {
  console.log(`ELEVO Portal running on port ${PORT}`);
  getDb(); // Initialize DB
});
