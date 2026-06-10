require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getDb, generateToken, generateId, generateSession, hashPassword, verifyPassword } = require('./database');
const { isDriveConfigured, createProjectFolder, syncFile, syncBriefing } = require('./gdrive');
const { isEmailConfigured, sendWelcome, sendStatusUpdate, sendFeedbackNotification } = require('./email');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'elevo2026!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hey@elevo.solutions';
const BASE_URL = process.env.BASE_URL || 'https://kundensuite.elevo.solutions';
const MAX_PROJECT_SIZE = 1024 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const SESSION_HOURS = 72;
const ADMIN_SESSION_HOURS = 12;
const BRIEFING_STEPS = 3;

app.disable('x-powered-by');
app.set('trust proxy', 1);

// ═══ SECURITY HEADERS ═══
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; " +
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══ RATE LIMITING (Brute-Force-Schutz für Logins) ═══
const rateBuckets = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const key = `${req.path}|${req.ip}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + windowMs };
      rateBuckets.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Zu viele Versuche. Bitte in ein paar Minuten erneut probieren.' });
    }
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of rateBuckets) if (now > b.reset) rateBuckets.delete(k);
}, 600000);

// Timing-sicherer Vergleich (kein Längen-/Timing-Leak)
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    crypto.timingSafeEqual(bb, bb);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

// ═══ MULTER ═══
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!/^[a-f0-9]{6,64}$/.test(req.params.token)) return cb(new Error('Ungültiger Token'));
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
  limits: { fileSize: MAX_FILE_SIZE, files: 20 },
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      'image/jpeg','image/png','image/webp','image/svg+xml','image/gif',
      'application/pdf','video/mp4','video/quicktime',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExt = ['.jpg','.jpeg','.png','.webp','.svg','.gif','.pdf','.mp4','.mov','.doc','.docx'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, allowedMime.includes(file.mimetype) && allowedExt.includes(ext));
  }
});

// ═══ AUTH MIDDLEWARE ═══
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || typeof token !== 'string') return res.status(401).json({ error: 'Nicht autorisiert' });
  const db = getDb();
  const session = db.prepare(`SELECT id FROM admin_sessions WHERE id = ? AND expires_at > datetime('now')`).get(token);
  if (!session) return res.status(401).json({ error: 'Nicht autorisiert' });
  next();
}

function clientAuth(req, res, next) {
  const db = getDb();
  const sessionId = req.headers['x-session-token'];
  if (!sessionId) return res.status(401).json({ error: 'Nicht angemeldet' });

  const session = db.prepare(`SELECT s.*, p.token FROM sessions s JOIN projects p ON s.project_id = p.id WHERE s.id = ? AND s.expires_at > datetime('now')`).get(sessionId);
  if (!session) return res.status(401).json({ error: 'Sitzung abgelaufen' });
  if (session.token !== req.params.token) return res.status(403).json({ error: 'Kein Zugriff' });

  req.projectId = session.project_id;
  next();
}

// ═══ CLEANUP: Expired sessions ═══
function cleanSessions() {
  try {
    const db = getDb();
    db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
    db.prepare(`DELETE FROM admin_sessions WHERE expires_at < datetime('now')`).run();
  } catch (e) {}
}
setInterval(cleanSessions, 3600000);

// ═══════════════════════════════════════
//  ADMIN ROUTES
// ═══════════════════════════════════════

app.post('/api/admin/login', rateLimit(8, 15 * 60000), (req, res) => {
  if (typeof req.body?.password === 'string' && safeEqual(req.body.password, ADMIN_PASSWORD)) {
    const db = getDb();
    const token = generateSession();
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_HOURS * 3600000).toISOString();
    db.prepare(`INSERT INTO admin_sessions (id, expires_at) VALUES (?, ?)`).run(token, expiresAt);
    res.json({ success: true, token, driveEnabled: isDriveConfigured(), emailEnabled: isEmailConfigured() });
  } else {
    res.status(401).json({ error: 'Falsches Passwort' });
  }
});

app.post('/api/admin/logout', adminAuth, (req, res) => {
  getDb().prepare(`DELETE FROM admin_sessions WHERE id = ?`).run(req.headers['x-admin-token']);
  res.json({ success: true });
});

// ═══ ADMIN: Create Project ═══
app.post('/api/admin/projects', adminAuth, async (req, res) => {
  const db = getDb();
  const { company_name, client_email, client_password } = req.body;

  if (!company_name || typeof company_name !== 'string' || !company_name.trim() || company_name.length > 120) {
    return res.status(400).json({ error: 'Firmenname fehlt oder ungültig' });
  }
  if (client_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  }
  if (client_password && (typeof client_password !== 'string' || client_password.length < 6 || client_password.length > 100)) {
    return res.status(400).json({ error: 'Passwort muss 6–100 Zeichen lang sein' });
  }

  const id = generateId();
  const token = generateToken();
  const password = client_password || crypto.randomBytes(4).toString('hex');
  const { hash, salt } = hashPassword(password);

  let gdriveFolderId = null;
  if (isDriveConfigured()) {
    const folder = await createProjectFolder(company_name);
    if (folder) gdriveFolderId = folder.folderId;
  }

  db.prepare(`INSERT INTO projects (id, token, company_name, client_email, client_password_hash, client_password_salt, gdrive_folder_id) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, token, company_name, client_email || null, hash, salt, gdriveFolderId);

  // Default checklist
  const items = [
    { item: 'Logo (PNG/SVG)', category: 'logo', required: 1 },
    { item: 'Team-/Portraitfotos', category: 'team', required: 0 },
    { item: 'Fotos Räumlichkeiten', category: 'space', required: 0 },
    { item: 'Fotos Produkte/Arbeit', category: 'work', required: 0 },
    { item: 'Sonstige Dateien', category: 'other', required: 0 },
    { item: 'Briefing ausgefüllt', category: 'briefing', required: 1 },
  ];
  const ins = db.prepare(`INSERT INTO checklist (project_id, item, category, required) VALUES (?, ?, ?, ?)`);
  for (const ci of items) ins.run(id, ci.item, ci.category, ci.required);

  // Status history
  db.prepare(`INSERT INTO status_history (project_id, status, note) VALUES (?, 'briefing', 'Projekt erstellt')`).run(id);

  // Welcome email
  const portalUrl = `${BASE_URL}/p/${token}`;
  if (client_email) {
    sendWelcome(client_email, company_name, portalUrl, password).catch(() => {});
  }

  res.json({ id, token, password, url: `/p/${token}`, portalUrl, gdrive: !!gdriveFolderId });
});

// ═══ ADMIN: List Projects ═══
app.get('/api/admin/projects', adminAuth, (req, res) => {
  const db = getDb();
  const projects = db.prepare(`SELECT * FROM projects ORDER BY created_at DESC`).all();

  const enriched = projects.map(p => {
    const uc = db.prepare(`SELECT COUNT(*) as c FROM uploads WHERE project_id = ?`).get(p.id).c;
    const us = db.prepare(`SELECT COALESCE(SUM(size),0) as t FROM uploads WHERE project_id = ?`).get(p.id).t;
    const bs = db.prepare(`SELECT COUNT(*) as c FROM briefing WHERE project_id = ?`).get(p.id).c;
    const fc = db.prepare(`SELECT COUNT(*) as c FROM feedback WHERE project_id = ?`).get(p.id).c;
    const cl = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(p.id);
    const done = cl.filter(c => c.completed).length;
    return {
      ...p,
      client_password_hash: undefined, client_password_salt: undefined,
      upload_count: uc, upload_size: us, briefing_steps: bs, feedback_count: fc,
      checklist_total: cl.length, checklist_completed: done,
      progress: cl.length > 0 ? Math.round((done / cl.length) * 100) : 0
    };
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
  const feedback = db.prepare(`SELECT * FROM feedback WHERE project_id = ? ORDER BY created_at DESC`).all(p.id);
  const history = db.prepare(`SELECT * FROM status_history WHERE project_id = ? ORDER BY created_at DESC`).all(p.id);

  res.json({
    ...p, client_password_hash: undefined, client_password_salt: undefined,
    uploads, briefing, checklist, feedback, status_history: history
  });
});

// ═══ ADMIN: Update Status ═══
app.put('/api/admin/projects/:id/status', adminAuth, (req, res) => {
  const db = getDb();
  const { status, note } = req.body;
  const valid = ['briefing', 'design', 'development', 'review', 'live'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Ungültiger Status' });

  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  db.prepare(`UPDATE projects SET status = ?, status_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, note || null, p.id);
  db.prepare(`INSERT INTO status_history (project_id, status, note) VALUES (?, ?, ?)`).run(p.id, status, note || null);

  // Email notification
  if (p.client_email) {
    sendStatusUpdate(p.client_email, p.company_name, status, note, `${BASE_URL}/p/${p.token}`).catch(() => {});
  }

  res.json({ success: true });
});

// ═══ ADMIN: Update Preview URL ═══
app.put('/api/admin/projects/:id/preview', adminAuth, (req, res) => {
  const db = getDb();
  const { preview_url } = req.body;
  if (preview_url && !/^https?:\/\/[^\s]+$/i.test(preview_url)) {
    return res.status(400).json({ error: 'Ungültige URL (nur http/https)' });
  }
  db.prepare(`UPDATE projects SET preview_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(preview_url || null, req.params.id);
  res.json({ success: true });
});

// ═══ ADMIN: Reset Password ═══
app.put('/api/admin/projects/:id/password', adminAuth, (req, res) => {
  const db = getDb();
  const password = req.body.password || crypto.randomBytes(4).toString('hex');
  const { hash, salt } = hashPassword(password);
  db.prepare(`UPDATE projects SET client_password_hash = ?, client_password_salt = ? WHERE id = ?`).run(hash, salt, req.params.id);
  res.json({ success: true, password });
});

// ═══ ADMIN: Delete Project ═══
app.delete('/api/admin/projects/:id', adminAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const dir = path.join(__dirname, 'uploads', p.token);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });

  db.prepare(`DELETE FROM sessions WHERE project_id = ?`).run(p.id);
  db.prepare(`DELETE FROM feedback WHERE project_id = ?`).run(p.id);
  db.prepare(`DELETE FROM status_history WHERE project_id = ?`).run(p.id);
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
  // Defense in depth: nur Dateinamen ohne Pfadanteile aus dem Projekt-Ordner servieren
  const filePath = path.join(__dirname, 'uploads', path.basename(f.token), path.basename(f.stored_name));
  res.download(filePath, f.original_name);
});

// ═══ ADMIN: Download All ═══
app.get('/api/admin/download-all/:projectId', adminAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.projectId);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const dir = path.join(__dirname, 'uploads', p.token);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Keine Dateien' });

  const { spawnSync } = require('child_process');
  const tarPath = path.join(__dirname, 'uploads', `${crypto.randomBytes(8).toString('hex')}.tar.gz`);
  const result = spawnSync('tar', ['-czf', tarPath, '-C', dir, '.']);
  if (result.status !== 0) {
    try { fs.unlinkSync(tarPath); } catch (e) {}
    return res.status(500).json({ error: 'Archiv-Fehler' });
  }
  const safeName = p.company_name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
  res.download(tarPath, `${safeName}_dateien.tar.gz`, () => { try { fs.unlinkSync(tarPath); } catch(e) {} });
});

// ═══ ADMIN: Feedback reply ═══
app.post('/api/admin/projects/:id/feedback', adminAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM projects WHERE id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Nachricht fehlt' });
  if (message.length > 5000) return res.status(413).json({ error: 'Nachricht zu lang' });

  db.prepare(`INSERT INTO feedback (project_id, author, author_name, message) VALUES (?, 'admin', 'ELEVO', ?)`).run(p.id, message.trim());
  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(p.id);
  res.json({ success: true });
});

// ═══ ADMIN: Drive Status ═══
app.get('/api/admin/drive-status', adminAuth, (req, res) => {
  res.json({ enabled: isDriveConfigured() });
});

// ═══════════════════════════════════════
//  CLIENT PORTAL ROUTES
// ═══════════════════════════════════════

// ═══ PORTAL: Login ═══
app.post('/api/portal/:token/login', rateLimit(10, 15 * 60000), (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM projects WHERE token = ?`).get(req.params.token);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const { password } = req.body;
  if (!password || typeof password !== 'string' || !p.client_password_hash || !p.client_password_salt) {
    return res.status(401).json({ error: 'Falsches Passwort' });
  }

  if (!verifyPassword(password, p.client_password_hash, p.client_password_salt)) {
    return res.status(401).json({ error: 'Falsches Passwort' });
  }

  // Create session
  const sessionId = generateSession();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600000).toISOString();
  db.prepare(`INSERT INTO sessions (id, project_id, expires_at) VALUES (?, ?, ?)`).run(sessionId, p.id, expiresAt);

  res.json({ success: true, session: sessionId, company_name: p.company_name });
});

// ═══ PORTAL: Logout ═══
app.post('/api/portal/:token/logout', clientAuth, (req, res) => {
  getDb().prepare(`DELETE FROM sessions WHERE id = ?`).run(req.headers['x-session-token']);
  res.json({ success: true });
});

// ═══ PORTAL: Check session ═══
app.get('/api/portal/:token/check', (req, res) => {
  const db = getDb();
  const sessionId = req.headers['x-session-token'];
  if (!sessionId) return res.json({ authenticated: false });

  const session = db.prepare(`SELECT s.*, p.token, p.company_name FROM sessions s JOIN projects p ON s.project_id = p.id WHERE s.id = ? AND s.expires_at > datetime('now')`).get(sessionId);
  if (!session || session.token !== req.params.token) return res.json({ authenticated: false });

  res.json({ authenticated: true, company_name: session.company_name });
});

// ═══ PORTAL: Get Project Data ═══
app.get('/api/portal/:token', clientAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, company_name, status, status_note, preview_url FROM projects WHERE token = ?`).get(req.params.token);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const briefing = db.prepare(`SELECT step, data FROM briefing WHERE project_id = ? ORDER BY step`).all(p.id);
  const uploads = db.prepare(`SELECT id, category, original_name, mime_type, size, uploaded_at FROM uploads WHERE project_id = ?`).all(p.id);
  const checklist = db.prepare(`SELECT * FROM checklist WHERE project_id = ?`).all(p.id);
  const feedback = db.prepare(`SELECT id, author, author_name, message, created_at FROM feedback WHERE project_id = ? ORDER BY created_at ASC`).all(p.id);
  const history = db.prepare(`SELECT status, note, created_at FROM status_history WHERE project_id = ? ORDER BY created_at DESC`).all(p.id);

  res.json({
    company_name: p.company_name,
    status: p.status,
    status_note: p.status_note,
    preview_url: p.preview_url,
    briefing: briefing.reduce((a, b) => { a[b.step] = JSON.parse(b.data); return a; }, {}),
    uploads, checklist, feedback, status_history: history
  });
});

// ═══ PORTAL: Save Briefing ═══
app.post('/api/portal/:token/briefing/:step', clientAuth, async (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, gdrive_folder_id, company_name FROM projects WHERE token = ?`).get(req.params.token);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const step = parseInt(req.params.step, 10);
  if (!Number.isInteger(step) || step < 1 || step > BRIEFING_STEPS) {
    return res.status(400).json({ error: 'Ungültiger Schritt' });
  }
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Ungültige Daten' });
  }
  const data = JSON.stringify(req.body);
  if (data.length > 50000) return res.status(413).json({ error: 'Eingabe zu lang' });

  db.prepare(`INSERT INTO briefing (project_id, step, data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(project_id, step) DO UPDATE SET data = ?, updated_at = CURRENT_TIMESTAMP`)
    .run(p.id, step, data, data);

  const bc = db.prepare(`SELECT COUNT(*) as c FROM briefing WHERE project_id = ? AND step <= ?`).get(p.id, BRIEFING_STEPS).c;
  if (bc >= BRIEFING_STEPS) {
    db.prepare(`UPDATE checklist SET completed = 1 WHERE project_id = ? AND category = 'briefing'`).run(p.id);
  }
  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(p.id);

  if (p.gdrive_folder_id) {
    const allBriefing = db.prepare(`SELECT step, data FROM briefing WHERE project_id = ? ORDER BY step`).all(p.id);
    const briefingObj = allBriefing.reduce((a, b) => { a[`step_${b.step}`] = JSON.parse(b.data); return a; }, {});
    syncBriefing(p.gdrive_folder_id, briefingObj, p.company_name).catch(() => {});
  }

  res.json({ success: true });
});

// ═══ PORTAL: Upload Files ═══
app.post('/api/portal/:token/upload', clientAuth, upload.array('files', 20), async (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, token, gdrive_folder_id FROM projects WHERE token = ?`).get(req.params.token);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'Keine gültigen Dateien (erlaubt: Bilder, PDF, Video, Word)' });

  const currentSize = db.prepare(`SELECT COALESCE(SUM(size),0) as t FROM uploads WHERE project_id = ?`).get(p.id).t;
  const newSize = req.files.reduce((s, f) => s + f.size, 0);
  if (currentSize + newSize > MAX_PROJECT_SIZE) {
    req.files.forEach(f => fs.unlinkSync(f.path));
    return res.status(413).json({ error: 'Speicherlimit erreicht (1 GB)' });
  }

  const validCategories = ['logo', 'team', 'space', 'work', 'other'];
  const category = validCategories.includes(req.body.category) ? req.body.category : 'other';
  const ins = db.prepare(`INSERT INTO uploads (project_id, category, original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)`);

  const uploaded = [];
  for (const file of req.files) {
    const result = ins.run(p.id, category, file.originalname, file.filename, file.mimetype, file.size);
    uploaded.push({ name: file.originalname, size: file.size, id: result.lastInsertRowid });

    if (p.gdrive_folder_id) {
      syncFile(p.gdrive_folder_id, file.path, file.originalname, file.mimetype, category)
        .then(gdriveId => {
          if (gdriveId) db.prepare(`UPDATE uploads SET gdrive_file_id = ?, synced = 1 WHERE id = ?`).run(gdriveId, result.lastInsertRowid);
        }).catch(() => {});
    }
  }

  db.prepare(`UPDATE checklist SET completed = 1 WHERE project_id = ? AND category = ?`).run(p.id, category);
  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(p.id);

  res.json({ success: true, uploaded });
});

// ═══ PORTAL: Delete Upload ═══
app.delete('/api/portal/:token/upload/:uploadId', clientAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, token FROM projects WHERE token = ?`).get(req.params.token);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const f = db.prepare(`SELECT * FROM uploads WHERE id = ? AND project_id = ?`).get(req.params.uploadId, p.id);
  if (!f) return res.status(404).json({ error: 'Nicht gefunden' });

  const fp = path.join(__dirname, 'uploads', p.token, f.stored_name);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  db.prepare(`DELETE FROM uploads WHERE id = ?`).run(f.id);

  const rem = db.prepare(`SELECT COUNT(*) as c FROM uploads WHERE project_id = ? AND category = ?`).get(p.id, f.category).c;
  if (rem === 0) db.prepare(`UPDATE checklist SET completed = 0 WHERE project_id = ? AND category = ?`).run(p.id, f.category);

  res.json({ success: true });
});

// ═══ PORTAL: Post Feedback ═══
app.post('/api/portal/:token/feedback', clientAuth, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id, company_name FROM projects WHERE token = ?`).get(req.params.token);
  if (!p) return res.status(404).json({ error: 'Nicht gefunden' });

  const { message, author_name } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Nachricht fehlt' });
  if (message.length > 5000) return res.status(413).json({ error: 'Nachricht zu lang' });
  const safeAuthor = (typeof author_name === 'string' && author_name.trim()) ? author_name.trim().slice(0, 120) : p.company_name;

  db.prepare(`INSERT INTO feedback (project_id, author, author_name, message) VALUES (?, 'client', ?, ?)`).run(p.id, safeAuthor, message.trim());
  db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(p.id);

  sendFeedbackNotification(ADMIN_EMAIL, p.company_name, author_name || p.company_name, message.trim()).catch(() => {});

  res.json({ success: true });
});

// ═══ PAGE ROUTES ═══
app.get('/p/:token', (req, res) => res.sendFile(path.join(__dirname, 'public', 'portal.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.redirect('/admin'));

// ═══ START ═══
app.listen(PORT, () => {
  console.log(`\n  ELEVO Kundensuite v4.0`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Google Drive: ${isDriveConfigured() ? '✓ AKTIV' : '— nicht konfiguriert'}`);
  console.log(`  E-Mail: ${isEmailConfigured() ? '✓ AKTIV' : '— nicht konfiguriert'}`);
  console.log();
  getDb();
});
