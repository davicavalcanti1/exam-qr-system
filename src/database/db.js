import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/exam-qr.db')

let db

export function getDB() {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDB() {
  const db = getDB()

  db.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      budget_limit REAL NOT NULL DEFAULT 2000,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      cpf TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(partner_id, cpf),
      FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      exam_name TEXT NOT NULL,
      exam_type TEXT NOT NULL,
      value REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,
      uses_count INTEGER DEFAULT 0,
      max_uses INTEGER DEFAULT 3,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS qr_usage_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qr_code_id INTEGER NOT NULL,
      use_type TEXT NOT NULL,
      used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partner_id) REFERENCES partners(id)
    );
  `)

  console.log('Database initialized at', DB_PATH)
}
