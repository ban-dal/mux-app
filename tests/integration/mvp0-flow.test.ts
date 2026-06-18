import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createMuxDatabase } from '../../src/main/db/database';
import { createTaskRepository } from '../../src/main/db/task-repository';
import { writeMvpCompletionRecord } from '../../src/main/records/completion-records';
import { runStubTask } from '../../src/main/runner/stub-runner';

const tempDirs: string[] = [];
const databases: ReturnType<typeof createMuxDatabase>[] = [];

const createTempDir = () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mux-mvp0-'));
  tempDirs.push(directory);
  return directory;
};

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.connection.close();
  }

  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('MVP 0 feasibility flow', () => {
  it('runs a stub task, persists events, and writes a completion record', async () => {
    const directory = createTempDir();
    const database = createMuxDatabase(path.join(directory, 'mux.sqlite'));
    databases.push(database);
    const repository = createTaskRepository(database);
    const workspace = repository.createWorkspace({ label: 'Disposable', path: directory });
    const task = repository.createTask({
      prompt: 'Verify the MVP 0 feasibility spine',
      title: 'MVP 0 end-to-end',
      workspaceId: workspace.id,
    });

    const result = await runStubTask({ repository, taskId: task.id });
    const events = repository.listTelemetryEvents(task.id);
    const record = writeMvpCompletionRecord({
      outputDirectory: directory,
      repository,
      taskId: task.id,
    });

    expect(result.exitCode).toBe(0);
    expect(repository.getTask(task.id)?.status).toBe('completed');
    expect(events.map((event) => event.type)).toEqual([
      'process_started',
      'stdout_line',
      'process_exited',
    ]);
    expect(record.filePath).toBe(path.join(directory, 'MVP-00-feasibility-spine.md'));
    expect(readFileSync(record.filePath, 'utf8')).toContain('pnpm mux:stub-runner');
  });
});
