import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { TaskRepository } from '../db/task-repository';

export const writeMvpCompletionRecord = (input: {
  outputDirectory: string;
  repository: TaskRepository;
  taskId: string;
}) => {
  const task = input.repository.getTask(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const events = input.repository.listTelemetryEvents(input.taskId);
  const command =
    events.find((event) => event.type === 'process_started')?.metadata.command ??
    'pnpm mux:stub-runner';
  const filePath = path.join(input.outputDirectory, 'MVP-00-feasibility-spine.md');
  const summary =
    'MVP 0 feasibility spine connects task creation, stub execution, telemetry, and records.';
  const eventLines = events.map((event) => `- ${event.createdAt} ${event.type}: ${event.message}`);

  mkdirSync(input.outputDirectory, { recursive: true });
  writeFileSync(
    filePath,
    `# MVP 00 - Feasibility Spine

## MVP

MVP 0: Feasibility Spine

## 목표

${summary}

## 변경 요약

- Electron + React + TypeScript runtime을 사용한다.
- SQLite event store에 workspace, task, agent session, terminal session, telemetry event, completion record를 저장한다.
- Stub terminal bridge는 실제 Ghostty embedding 대신 stdout/stderr 캡처 내용을 GUI에 보여준다.

## 검증

- Stub runner command: \`${command}\`
- Task status: \`${task.status}\`
- Captured events: ${events.length}

## 이벤트

${eventLines.join('\n')}

## 알려진 위험

- Node \`node:sqlite\`는 현재 실험적 API 경고를 출력한다.
- Ghostty는 아직 실제 embed/attach가 아니라 stub terminal adapter로 대체되어 있다.

## 다음 시작 지점

MVP 1에서는 workspace 등록과 실제 Codex/Claude 계열 runner command 실행을 연결한다.
`,
  );

  return input.repository.createCompletionRecord({
    filePath,
    summary,
    taskId: input.taskId,
  });
};
