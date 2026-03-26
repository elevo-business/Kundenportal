const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'portal.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
    migrate();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      client_email TEXT,
      client_password_hash TEXT,
      client_password_salt TEXT,
      status TEXT DEFAULT 'briefing',
      status_note TEXT,
      preview_url TEXT,
      gdrive_folder_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS briefing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL REFERENCES projects(id),
      step INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, step)
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL REFERENCES projects(id),
      category TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      gdrive_file_id TEXT,
      synced INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL REFERENCES projects(id),
      item TEXT NOT NULL,
      category TEXT NOT NULL,
      required INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      UNIQUE(project_id, item)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL REFERENCES projects(id),
      author TEXT NOT NULL,
      author_name TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL REFERENCES projects(id),
      status TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function migrate() {
  const cols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);

  const migrations = [
    ['gdrive_folder_id', "ALTER TABLE projects ADD COLUMN gdrive_folder_id TEXT"],
    ['client_password_hash', "ALTER TABLE projects ADD COLUMN client_password_hash TEXT"],
    ['client_password_salt', "ALTER TABLE projects ADD COLUMN client_password_salt TEXT"],
    ['status', "ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'briefing'"],
    ['status_note', "ALTER TABLE projects ADD COLUMN status_note TEXT"],
    ['preview_url', "ALTER TABLE projects ADD COLUMN preview_url TEXT"],
  ];

  for (const [col, sql] of migrations) {
    if (!cols.includes(col)) {
      db.exec(sql);
      console.log(`Migration: ${col} added to projects`);
    }
  }

  const uploadCols = db.prepare("PRAGMA table_info(uploads)").all().map(c => c.name);
  if (!uploadCols.includes('gdrive_file_id')) {
    db.exec("ALTER TABLE uploads ADD COLUMN gdrive_file_id TEXT");
    db.exec("ALTER TABLE uploads ADD COLUMN synced INTEGER DEFAULT 0");
  }
}

// ═══ PASSWORD HASHING ═══
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
}

// ═══ HELPERS ═══
function generateToken() { return crypto.randomBytes(6).toString('hex'); }
function generateId() { return crypto.randomUUID(); }
function generateSession() { return crypto.randomBytes(32).toString('hex'); }

module.exports = { getDb, generateToken, generateId, generateSession, hashPassword, verifyPassword };
