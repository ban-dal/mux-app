import crypto from 'node:crypto';

import type {
  AgentSession,
  AppendTelemetryEventInput,
  CompletionRecord,
  CreateTaskInput,
  CreateWorkspaceInput,
  Task,
  TaskStatus,
  TelemetryEvent,
  TerminalSession,
  Workspace,
} from '../../shared/types';
import type { MuxDatabase } from './database';

const now = () => new Date().toISOString();
const createId = () => crypto.randomUUID();

const mapWorkspace = (row: Record<string, unknown>): Workspace => ({
  createdAt: String(row.created_at),
  id: String(row.id),
  label: String(row.label),
  path: String(row.path),
});

const mapTask = (row: Record<string, unknown>): Task => ({
  completedAt: row.completed_at === null ? null : String(row.completed_at),
  createdAt: String(row.created_at),
  id: String(row.id),
  prompt: String(row.prompt),
  startedAt: row.started_at === null ? null : String(row.started_at),
  status: String(row.status) as TaskStatus,
  title: String(row.title),
  updatedAt: String(row.updated_at),
  workspaceId: String(row.workspace_id),
});

const mapTelemetryEvent = (row: Record<string, unknown>): TelemetryEvent => ({
  agentSessionId: row.agent_session_id === null ? null : String(row.agent_session_id),
  createdAt: String(row.created_at),
  id: String(row.id),
  message: String(row.message),
  metadata: JSON.parse(String(row.metadata_json)) as Record<string, unknown>,
  taskId: String(row.task_id),
  terminalSessionId: row.terminal_session_id === null ? null : String(row.terminal_session_id),
  type: String(row.type) as TelemetryEvent['type'],
});

export interface TaskRepository {
  createWorkspace(input: CreateWorkspaceInput): Workspace;
  listWorkspaces(): Workspace[];
  createTask(input: CreateTaskInput): Task;
  listTasks(): Task[];
  getTask(taskId: string): Task | null;
  updateTaskStatus(taskId: string, status: TaskStatus): Task;
  createAgentSession(input: { command: string; taskId: string }): AgentSession;
  completeAgentSession(agentSessionId: string, status: TaskStatus): void;
  createTerminalSession(input: {
    agentSessionId: string;
    taskId: string;
    title: string;
  }): TerminalSession;
  disposeTerminalSession(terminalSessionId: string): void;
  appendTelemetryEvent(input: AppendTelemetryEventInput): TelemetryEvent;
  listTelemetryEvents(taskId: string): TelemetryEvent[];
  createCompletionRecord(input: {
    filePath: string;
    summary: string;
    taskId: string;
  }): CompletionRecord;
}

export const createTaskRepository = (database: MuxDatabase): TaskRepository => {
  const { connection } = database;

  return {
    createWorkspace(input) {
      const workspace: Workspace = {
        createdAt: now(),
        id: createId(),
        label: input.label,
        path: input.path,
      };

      connection
        .prepare('INSERT INTO workspaces (id, label, path, created_at) VALUES (?, ?, ?, ?)')
        .run(workspace.id, workspace.label, workspace.path, workspace.createdAt);

      return workspace;
    },

    listWorkspaces() {
      return connection
        .prepare('SELECT * FROM workspaces ORDER BY created_at ASC')
        .all()
        .map((row) => mapWorkspace(row));
    },

    createTask(input) {
      const timestamp = now();
      const task: Task = {
        completedAt: null,
        createdAt: timestamp,
        id: createId(),
        prompt: input.prompt,
        startedAt: null,
        status: 'draft',
        title: input.title,
        updatedAt: timestamp,
        workspaceId: input.workspaceId,
      };

      connection
        .prepare(
          `INSERT INTO tasks
            (id, workspace_id, title, prompt, status, created_at, updated_at, started_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          task.id,
          task.workspaceId,
          task.title,
          task.prompt,
          task.status,
          task.createdAt,
          task.updatedAt,
          task.startedAt,
          task.completedAt,
        );

      return task;
    },

    listTasks() {
      return connection
        .prepare('SELECT * FROM tasks ORDER BY created_at DESC')
        .all()
        .map((row) => mapTask(row));
    },

    getTask(taskId) {
      const row = connection.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      return row ? mapTask(row) : null;
    },

    updateTaskStatus(taskId, status) {
      const timestamp = now();
      const startedAt = status === 'running' ? timestamp : undefined;
      const completedAt = status === 'completed' || status === 'failed' ? timestamp : undefined;

      connection
        .prepare(
          `UPDATE tasks
           SET status = ?,
               updated_at = ?,
               started_at = COALESCE(?, started_at),
               completed_at = COALESCE(?, completed_at)
           WHERE id = ?`,
        )
        .run(status, timestamp, startedAt ?? null, completedAt ?? null, taskId);

      const task = this.getTask(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      return task;
    },

    createAgentSession(input) {
      const session: AgentSession = {
        command: input.command,
        completedAt: null,
        id: createId(),
        role: 'main',
        startedAt: now(),
        status: 'running',
        taskId: input.taskId,
      };

      connection
        .prepare(
          `INSERT INTO agent_sessions
            (id, task_id, role, command, status, started_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          session.id,
          session.taskId,
          session.role,
          session.command,
          session.status,
          session.startedAt,
          session.completedAt,
        );

      return session;
    },

    completeAgentSession(agentSessionId, status) {
      connection
        .prepare('UPDATE agent_sessions SET status = ?, completed_at = ? WHERE id = ?')
        .run(status, now(), agentSessionId);
    },

    createTerminalSession(input) {
      const session: TerminalSession = {
        adapter: 'stub',
        agentSessionId: input.agentSessionId,
        createdAt: now(),
        disposedAt: null,
        id: createId(),
        taskId: input.taskId,
        title: input.title,
      };

      connection
        .prepare(
          `INSERT INTO terminal_sessions
            (id, task_id, agent_session_id, adapter, title, created_at, disposed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          session.id,
          session.taskId,
          session.agentSessionId,
          session.adapter,
          session.title,
          session.createdAt,
          session.disposedAt,
        );

      return session;
    },

    disposeTerminalSession(terminalSessionId) {
      connection
        .prepare('UPDATE terminal_sessions SET disposed_at = ? WHERE id = ?')
        .run(now(), terminalSessionId);
    },

    appendTelemetryEvent(input) {
      const event: TelemetryEvent = {
        agentSessionId: input.agentSessionId ?? null,
        createdAt: now(),
        id: createId(),
        message: input.message,
        metadata: input.metadata ?? {},
        taskId: input.taskId,
        terminalSessionId: input.terminalSessionId ?? null,
        type: input.type,
      };

      connection
        .prepare(
          `INSERT INTO telemetry_events
            (id, task_id, agent_session_id, terminal_session_id, type, message, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          event.id,
          event.taskId,
          event.agentSessionId,
          event.terminalSessionId,
          event.type,
          event.message,
          JSON.stringify(event.metadata),
          event.createdAt,
        );

      return event;
    },

    listTelemetryEvents(taskId) {
      return connection
        .prepare('SELECT * FROM telemetry_events WHERE task_id = ? ORDER BY created_at ASC')
        .all(taskId)
        .map((row) => mapTelemetryEvent(row));
    },

    createCompletionRecord(input) {
      const record: CompletionRecord = {
        createdAt: now(),
        filePath: input.filePath,
        id: createId(),
        summary: input.summary,
        taskId: input.taskId,
      };

      connection
        .prepare(
          `INSERT INTO completion_records (id, task_id, file_path, summary, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(record.id, record.taskId, record.filePath, record.summary, record.createdAt);

      return record;
    },
  };
};
