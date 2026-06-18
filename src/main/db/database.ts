import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { app } from 'electron';

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    const dbPath = path.join(app.getPath('userData'), 'mux.db');
    _db = new DatabaseSync(dbPath);
    initSchema(_db);
  }
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}
