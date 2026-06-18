import { getDb } from './database';

export function getConfig(key: string): string | null {
  const row = getDb()
    .prepare('SELECT value FROM app_config WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, ?)',
    )
    .run(key, value, new Date().toISOString());
}
