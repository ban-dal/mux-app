import { ipcMain, BrowserWindow } from 'electron';
import type { IPty } from 'node-pty';

// node-pty is a native module and must not be bundled by vite
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pty = require('node-pty') as typeof import('node-pty');

export class PtyManager {
  private process: IPty | null = null;

  register(win: BrowserWindow): void {
    ipcMain.handle('pty:spawn', () => {
      if (this.process) {
        this.process.kill();
        this.process = null;
      }

      const shell = process.platform === 'win32' ? 'cmd.exe' : (process.env.SHELL ?? 'bash');

      this.process = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.USERPROFILE ?? process.env.HOME ?? process.cwd(),
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
