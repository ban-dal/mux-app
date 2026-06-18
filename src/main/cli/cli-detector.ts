import { execFileSync } from 'node:child_process';

export type CliId = 'claude' | 'codex' | 'gemini';

export interface CliInfo {
  id: CliId;
  label: string;
  command: string;
  available: boolean;
  path: string | null;
}

const CLI_DEFS: Pick<CliInfo, 'id' | 'label' | 'command'>[] = [
  { id: 'claude', label: 'Claude Code', command: 'claude' },
  { id: 'codex', label: 'Codex', command: 'codex' },
  { id: 'gemini', label: 'Gemini CLI', command: 'gemini' },
];

function findExecutable(command: string): string | null {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = execFileSync(finder, [command], { encoding: 'utf8', stdio: 'pipe' });
    return result.trim().split('\n')[0].trim() || null;
  } catch {
    return null;
  }
}

export function detectClis(): CliInfo[] {
  return CLI_DEFS.map(({ id, label, command }) => {
    const found = findExecutable(command);
    return { id, label, command, available: found !== null, path: found };
  });
}
