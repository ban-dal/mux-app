import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createMuxDatabase } from '../../src/main/db/database';
import { createTaskRepository } from '../../src/main/db/task-repository';

const tempDirs: string[] = [];
const databases: ReturnType<typeof createMuxDatabase>[] = [];

const createTempDbPath = () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mux-repo-'));
  tempDirs.push(directory);
  return path.join(directory, 'mux.sqlite');
};

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.connection.close();
  }

  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('task repository', () => {
  it('creates and lists tasks with persisted telemetry events', () => {
    const database = createMuxDatabase(createTempDbPath());
    databases.push(database);
    const repository = createTaskRepository(database);

    const workspace = repository.createWorkspace({
      label: 'Mux App',
      path: 'C:/work/mux-app',
    });
    const task = repository.createTask({
      prompt: 'Run MVP 0 stub flow',
      title: 'MVP 0 smoke task',
      workspaceId: workspace.id,
    });

    repository.appendTelemetryEvent({
      message: 'process started',
      taskId: task.id,
      type: 'process_started',
    });

    expect(repository.listTasks()).toMatchObject([
      {
        id: task.id,
        status: 'draft',
        title: 'MVP 0 smoke task',
        workspaceId: workspace.id,
      },
    ]);
    expect(repository.listTelemetryEvents(task.id)).toMatchObject([
      {
        message: 'process started',
        taskId: task.id,
        type: 'process_started',
      },
    ]);
  });
});
