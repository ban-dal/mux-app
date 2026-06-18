import { ipcMain, BrowserWindow } from 'electron';
import { execFileSync } from 'node:child_process';
import type { IPty, IDisposable } from 'node-pty';

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
  private dataDisposable: IDisposable | null = null;
  private exitDisposable: IDisposable | null = null;
  private inputHandler: ((_event: Electron.IpcMainEvent, data: string) => void) | null = null;
  private resizeHandler: ((_event: Electron.IpcMainEvent, cols: number, rows: number) => void) | null = null;

  register(win: BrowserWindow): void {
    ipcMain.handle('pty:spawn', (_event, opts: SpawnOptions = {}) => {
      this.dataDisposable?.dispose();
      this.exitDisposable?.dispose();
      this.dataDisposable = null;
      this.exitDisposable = null;

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

      this.dataDisposable = this.process.onData((data) => {
        if (!win.isDestroyed()) {
          win.webContents.send('pty:data', data);
        }
      });

      this.exitDisposable = this.process.onExit(({ exitCode, signal }) => {
        if (!win.isDestroyed()) {
          win.webContents.send('pty:exit', { exitCode, signal });
        }
        this.process = null;
      });
    });

    this.inputHandler = (_event, data: string) => {
      this.process?.write(data);
    };
    this.resizeHandler = (_event, cols: number, rows: number) => {
      this.process?.resize(cols, rows);
    };

    ipcMain.on('pty:input', this.inputHandler);
    ipcMain.on('pty:resize', this.resizeHandler);
  }

  dispose(): void {
    this.dataDisposable?.dispose();
    this.exitDisposable?.dispose();
    this.dataDisposable = null;
    this.exitDisposable = null;

    this.process?.kill();
    this.process = null;

    if (this.inputHandler) {
      ipcMain.removeListener('pty:input', this.inputHandler);
      this.inputHandler = null;
    }
    if (this.resizeHandler) {
      ipcMain.removeListener('pty:resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    ipcMain.removeHandler('pty:spawn');
  }
}
