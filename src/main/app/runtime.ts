import { app, ipcMain } from 'electron';
import path from 'node:path';

import { createMuxDatabase } from '../db/database';
import { createTaskRepository } from '../db/task-repository';
import { writeMvpCompletionRecord } from '../records/completion-records';
import { runStubTask } from '../runner/stub-runner';

export const createAppRuntime = () => {
  const dbPath = path.join(app.getPath('userData'), 'mux.sqlite');
  const repository = createTaskRepository(createMuxDatabase(dbPath));

  const ensureDefaultWorkspace = () => {
    const [workspace] = repository.listWorkspaces();
    return (
      workspace ??
      repository.createWorkspace({
        label: 'Mux App',
        path: process.cwd(),
      })
    );
  };

  const registerIpc = () => {
    ipcMain.handle('mux:list-state', () => ({
      eventsByTask: Object.fromEntries(
        repository.listTasks().map((task) => [task.id, repository.listTelemetryEvents(task.id)]),
      ),
      tasks: repository.listTasks(),
      workspaces: repository.listWorkspaces(),
    }));

    ipcMain.handle('mux:create-task', (_event, input: { prompt: string; title: string }) => {
      const workspace = ensureDefaultWorkspace();
      return repository.createTask({
        prompt: input.prompt,
        title: input.title,
        workspaceId: workspace.id,
      });
    });

    ipcMain.handle('mux:run-task', async (_event, taskId: string) =>
      runStubTask({ repository, taskId }),
    );

    ipcMain.handle('mux:write-completion-record', (_event, taskId: string) =>
      writeMvpCompletionRecord({
        outputDirectory: path.join(process.cwd(), 'docs', 'mvp-records'),
        repository,
        taskId,
      }),
    );
  };

  return {
    ensureDefaultWorkspace,
    registerIpc,
    repository,
  };
};
