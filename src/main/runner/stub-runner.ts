import { spawn } from 'node:child_process';
import path from 'node:path';

import type { TaskRepository } from '../db/task-repository';

const displayCommand = 'pnpm mux:stub-runner';

export interface StubRunnerResult {
  command: string;
  durationMs: number;
  exitCode: number;
}

export const runStubTask = async (input: {
  repository: TaskRepository;
  taskId: string;
}): Promise<StubRunnerResult> => {
  const startedAt = performance.now();
  input.repository.updateTaskStatus(input.taskId, 'running');
  const agentSession = input.repository.createAgentSession({
    command: displayCommand,
    taskId: input.taskId,
  });
  const terminalSession = input.repository.createTerminalSession({
    agentSessionId: agentSession.id,
    taskId: input.taskId,
    title: 'Stub terminal',
  });

  input.repository.appendTelemetryEvent({
    agentSessionId: agentSession.id,
    message: displayCommand,
    metadata: { command: displayCommand },
    taskId: input.taskId,
    terminalSessionId: terminalSession.id,
    type: 'process_started',
  });

  const scriptPath = path.join(process.cwd(), 'scripts', 'mux-stub-runner.mjs');
  const child = spawn(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/u).filter(Boolean)) {
      input.repository.appendTelemetryEvent({
        agentSessionId: agentSession.id,
        message: line,
        taskId: input.taskId,
        terminalSessionId: terminalSession.id,
        type: 'stdout_line',
      });
    }
  });

  child.stderr.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/u).filter(Boolean)) {
      input.repository.appendTelemetryEvent({
        agentSessionId: agentSession.id,
        message: line,
        taskId: input.taskId,
        terminalSessionId: terminalSession.id,
        type: 'stderr_line',
      });
    }
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolve(code ?? 1));
  });
  const durationMs = Math.round(performance.now() - startedAt);
  const status = exitCode === 0 ? 'completed' : 'failed';

  input.repository.appendTelemetryEvent({
    agentSessionId: agentSession.id,
    message: `Exited with code ${exitCode}`,
    metadata: { durationMs, exitCode },
    taskId: input.taskId,
    terminalSessionId: terminalSession.id,
    type: 'process_exited',
  });
  input.repository.completeAgentSession(agentSession.id, status);
  input.repository.disposeTerminalSession(terminalSession.id);
  input.repository.updateTaskStatus(input.taskId, status);

  return {
    command: displayCommand,
    durationMs,
    exitCode,
  };
};
