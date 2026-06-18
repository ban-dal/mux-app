export type TaskStatus = 'draft' | 'running' | 'completed' | 'failed';

export type TelemetryEventType =
  | 'process_started'
  | 'stdout_line'
  | 'stderr_line'
  | 'process_exited';

export interface Workspace {
  id: string;
  label: string;
  path: string;
  createdAt: string;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AgentSession {
  id: string;
  taskId: string;
  role: 'main';
  command: string;
  status: TaskStatus;
  startedAt: string;
  completedAt: string | null;
}

export interface TerminalSession {
  id: string;
  taskId: string;
  agentSessionId: string;
  adapter: 'stub';
  title: string;
  createdAt: string;
  disposedAt: string | null;
}

export interface TelemetryEvent {
  id: string;
  taskId: string;
  agentSessionId: string | null;
  terminalSessionId: string | null;
  type: TelemetryEventType;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CompletionRecord {
  id: string;
  taskId: string;
  filePath: string;
  summary: string;
  createdAt: string;
}

export interface CreateWorkspaceInput {
  label: string;
  path: string;
}

export interface CreateTaskInput {
  workspaceId: string;
  title: string;
  prompt: string;
}

export interface AppendTelemetryEventInput {
  taskId: string;
  agentSessionId?: string | null;
  terminalSessionId?: string | null;
  type: TelemetryEventType;
  message: string;
  metadata?: Record<string, unknown>;
}
