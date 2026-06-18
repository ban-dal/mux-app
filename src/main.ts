import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { PtyManager } from './main/pty/pty-manager';

if (started) {
  app.quit();
}

let ptyManager: PtyManager | null = null;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    height: 820,
    minHeight: 600,
    minWidth: 900,
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

app.on('ready', createWindow);

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
