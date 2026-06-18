import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { PtyManager } from './main/pty/pty-manager';
import { getDb } from './main/db/database';
import { getConfig, setConfig } from './main/db/config-repository';
import { detectClis } from './main/cli/cli-detector';

if (started) {
  app.quit();
}

let ptyManager: PtyManager | null = null;

function registerAppIpc(): void {
  ipcMain.handle('app:detect-clis', () => detectClis());

  ipcMain.handle('app:get-config', (_event, key: string) => getConfig(key));

  ipcMain.handle('app:set-config', (_event, key: string, value: string) => {
    setConfig(key, value);
  });
}

const createWindow = () => {
  // init DB early so config is available before renderer loads
  getDb();

  const mainWindow = new BrowserWindow({
    height: 820,
    minHeight: 600,
    minWidth: 1000,
    title: 'Mux',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  ptyManager = new PtyManager();
  ptyManager.register(mainWindow);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('closed', () => {
    ptyManager?.dispose();
    ptyManager = null;
  });
};

app.on('ready', () => {
  registerAppIpc();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
