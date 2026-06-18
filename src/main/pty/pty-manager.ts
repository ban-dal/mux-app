import { ipcMain, BrowserWindow } from 'electron';
import { execFileSync } from 'node:child_process';
import type { IPty } from 'node-pty';

// node-pty is a native module and must not be bundled by vite
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pty = require('node-pty') as typeof import('node-pty');

function resolveShell(): string {
  if (process.platform !== 'win32') {
    return process.env.SHELL ?? 'bash';
  }
  for (const candidate of ['pwsh.exe', 'powershell.exe']) {
    try {
      execFileSync('where', [candidate], { stdio: 'pipe' });
      return candidate;
    } catch {
      // not found, try next
    }
  }
  return 'cmd.exe';
}

export interface SpawnOptions {
  command?: string;
  args?: string[];
  cwd?: string;
}

export class PtyManager {
  private process: IPty | null = null;

  register(win: BrowserWindow): void {
    ipcMain.handle('pty:spawn', (_event, opts: SpawnOptions = {}) => {
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      const shell = opts.command ?? resolveShell();
      const args = opts.args ?? [];
      const cwd = opts.cwd ?? (process.env.USERPROFILE ?? process.env.HOME ?? process.cwd());

      this.process = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as Record<string, string>,
      });

      this.process.onData((data) => {
        if (!win.isDestroyed()) {
          win.webContents.send('pty:data', data);
        }
      });

      this.process.onExit(({ exitCode, signal }) => {
        if (!win.isDestroyed()) {
          win.webContents.send('pty:exit', { exitCode, signal });
        }
        this.process = null;
      });
    });

    ipcMain.on('pty:input', (_event, data: string) => {
      this.process?.write(data);
    });

    ipcMain.on('pty:resize', (_event, cols: number, rows: number) => {
      this.process?.resize(cols, rows);
    });
  }

  dispose(): void {
    this.process?.kill();
    this.process = null;
    ipcMain.removeAllListeners('pty:input');
    ipcMain.removeAllListeners('pty:resize');
    ipcMain.removeHandler('pty:spawn');
  }
}
