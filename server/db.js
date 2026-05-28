const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const configuredPath = process.env.SQLITE_DB_PATH || './data/student_portal.db';
const dbPath = path.isAbsolute(configuredPath)
  ? configuredPath
  : path.resolve(__dirname, '..', configuredPath);
let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');
  }

  return db;
}

function initDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      disabled INTEGER NOT NULL DEFAULT 0,
      courses TEXT NOT NULL DEFAULT '[]',
      otpHash TEXT,
      otpExpires INTEGER,
      resetTokenHash TEXT,
      resetTokenExpires INTEGER,
      loginAttempts INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      email TEXT,
      action TEXT NOT NULL,
      success INTEGER NOT NULL,
      ip TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (user) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_createdAt ON activity_logs(createdAt);
  `);

  return database;
}

module.exports = {
  getDb,
  initDatabase,
  dbPath,
};
