import type { StatementSync } from 'node:sqlite';
import { getDb } from './database';

let _getStmt: StatementSync | null = null;
let _setStmt: StatementSync | null = null;

function getStmt(): StatementSync {
  return (_getStmt ??= getDb().prepare('SELECT value FROM app_config WHERE key = ?'));
}

function setStmt(): StatementSync {
  return (_setStmt ??= getDb().prepare(
    'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, ?)',
  ));
}

export function getConfig(key: string): string | null {
  const row = getStmt().get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  setStmt().run(key, value, new Date().toISOString());
}
