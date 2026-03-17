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
      status TEXT DEFAULT 'active',
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
  `);
}

function migrate() {
  const cols = db.prepare("PRAGMA table_info(projects)").all().map(c => c.name);
  if (!cols.includes('gdrive_folder_id')) {
    db.exec("ALTER TABLE projects ADD COLUMN gdrive_folder_id TEXT");
    console.log('Migration: gdrive_folder_id added to projects');
  }

  const uploadCols = db.prepare("PRAGMA table_info(uploads)").all().map(c => c.name);
  if (!uploadCols.includes('gdrive_file_id')) {
    db.exec("ALTER TABLE uploads ADD COLUMN gdrive_file_id TEXT");
    db.exec("ALTER TABLE uploads ADD COLUMN synced INTEGER DEFAULT 0");
    console.log('Migration: gdrive columns added to uploads');
  }
}

function generateToken() { return crypto.randomBytes(6).toString('hex'); }
function generateId() { return crypto.randomUUID(); }

module.exports = { getDb, generateToken, generateId };
