import { contextBridge, ipcRenderer } from 'electron';

export interface PtyApi {
  spawn: () => Promise<void>;
  sendInput: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  onData: (callback: (data: string) => void) => () => void;
  onExit: (callback: (info: { exitCode: number; signal: number }) => void) => () => void;
}

const ptyApi: PtyApi = {
  spawn: () => ipcRenderer.invoke('pty:spawn'),
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

contextBridge.exposeInMainWorld('pty', ptyApi);
