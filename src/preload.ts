import { contextBridge, ipcRenderer } from 'electron';

import type { CompletionRecord, Task, TelemetryEvent, Workspace } from './shared/types';

export interface MuxRendererApi {
  createTask(input: { prompt: string; title: string }): Promise<Task>;
  listState(): Promise<{
    eventsByTask: Record<string, TelemetryEvent[]>;
    tasks: Task[];
    workspaces: Workspace[];
  }>;
  runTask(taskId: string): Promise<{ command: string; durationMs: number; exitCode: number }>;
  writeCompletionRecord(taskId: string): Promise<CompletionRecord>;
}

const muxApi: MuxRendererApi = {
  createTask: (input) => ipcRenderer.invoke('mux:create-task', input) as Promise<Task>,
  listState: () => ipcRenderer.invoke('mux:list-state') as ReturnType<MuxRendererApi['listState']>,
  runTask: (taskId) =>
    ipcRenderer.invoke('mux:run-task', taskId) as ReturnType<MuxRendererApi['runTask']>,
  writeCompletionRecord: (taskId) =>
    ipcRenderer.invoke('mux:write-completion-record', taskId) as ReturnType<
      MuxRendererApi['writeCompletionRecord']
    >,
};

contextBridge.exposeInMainWorld('mux', muxApi);
