import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export interface MuxDatabase {
  connection: DatabaseSync;
  dbPath: string;
  schemaSql: string;
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  role TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS terminal_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  agent_session_id TEXT NOT NULL REFERENCES agent_sessions(id),
  adapter TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  disposed_at TEXT
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  agent_session_id TEXT REFERENCES agent_sessions(id),
  terminal_session_id TEXT REFERENCES terminal_sessions(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS completion_records (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  file_path TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export const createMuxDatabase = (dbPath: string): MuxDatabase => {
  mkdirSync(path.dirname(dbPath), { recursive: true });

  const connection = new DatabaseSync(dbPath);
  connection.exec('PRAGMA foreign_keys = ON;');
  connection.exec(schemaSql);

  return {
    connection,
    dbPath,
    schemaSql,
  };
};
