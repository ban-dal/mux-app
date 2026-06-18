import { contextBridge, ipcRenderer } from 'electron';
import type { CliInfo } from './main/cli/cli-detector';
import type { SpawnOptions } from './main/pty/pty-manager';

export interface PtyApi {
  spawn: (opts?: SpawnOptions) => Promise<void>;
  sendInput: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  onData: (callback: (data: string) => void) => () => void;
  onExit: (callback: (info: { exitCode: number; signal: number }) => void) => () => void;
}

export interface AppApi {
  detectClis: () => Promise<CliInfo[]>;
  getConfig: (key: string) => Promise<string | null>;
  setConfig: (key: string, value: string) => Promise<void>;
}

const ptyApi: PtyApi = {
  spawn: (opts) => ipcRenderer.invoke('pty:spawn', opts),
  sendInput: (data) => ipcRenderer.send('pty:input', data),
  resize: (cols, rows) => ipcRenderer.send('pty:resize', cols, rows),
  onData: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('pty:data', handler);
    return () => ipcRenderer.removeListener('pty:data', handler);
  },
  onExit: (callback) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      info: { exitCode: number; signal: number },
    ) => callback(info);
    ipcRenderer.on('pty:exit', handler);
    return () => ipcRenderer.removeListener('pty:exit', handler);
  },
};

const appApi: AppApi = {
  detectClis: () => ipcRenderer.invoke('app:detect-clis'),
  getConfig: (key) => ipcRenderer.invoke('app:get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('app:set-config', key, value),
};

contextBridge.exposeInMainWorld('pty', ptyApi);
contextBridge.exposeInMainWorld('muxApp', appApi);
