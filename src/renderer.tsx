import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import type { MuxRendererApi } from './preload';
import type { Task, TaskStatus, TelemetryEvent, Workspace } from './shared/types';

declare global {
  interface Window {
    mux: MuxRendererApi;
  }
}

const columns: Array<{ label: string; status: TaskStatus }> = [
  { label: 'Draft', status: 'draft' },
  { label: 'Running', status: 'running' },
  { label: 'Completed', status: 'completed' },
  { label: 'Failed', status: 'failed' },
];

const statusLabel: Record<TaskStatus, string> = {
  completed: 'Completed',
  draft: 'Draft',
  failed: 'Failed',
  running: 'Running',
};

const App = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [eventsByTask, setEventsByTask] = useState<Record<string, TelemetryEvent[]>>({});
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('MVP 0 smoke task');
  const [prompt, setPrompt] = useState('Verify the MVP 0 feasibility spine.');
  const [isBusy, setIsBusy] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null,
    [selectedTaskId, tasks],
  );
  const selectedEvents = selectedTask ? (eventsByTask[selectedTask.id] ?? []) : [];

  const refresh = async () => {
    const state = await window.mux.listState();
    setEventsByTask(state.eventsByTask);
    setTasks(state.tasks);
    setWorkspaces(state.workspaces);
    setSelectedTaskId((current) => current ?? state.tasks[0]?.id ?? null);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const createTask = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    try {
      const task = await window.mux.createTask({ prompt, title });
      setSelectedTaskId(task.id);
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const runTask = async () => {
    if (!selectedTask) {
      return;
    }

    setIsBusy(true);
    try {
      await window.mux.runTask(selectedTask.id);
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  const writeRecord = async () => {
    if (!selectedTask) {
      return;
    }

    setIsBusy(true);
    try {
      await window.mux.writeCompletionRecord(selectedTask.id);
      await refresh();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Mux App</h1>
          <p className="workspace-path">{workspaces[0]?.path ?? 'No workspace'}</p>
        </div>

        <form className="task-form" onSubmit={(event) => void createTask(event)}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
          </label>
          <label>
            Prompt
            <textarea value={prompt} onChange={(event) => setPrompt(event.currentTarget.value)} />
          </label>
          <button disabled={isBusy || !title.trim() || !prompt.trim()} type="submit">
            New Task
          </button>
        </form>
      </aside>

      <section className="board" aria-label="Task board">
        {columns.map((column) => (
          <section className="column" key={column.status}>
            <header>
              <h2>{column.label}</h2>
              <span>{tasks.filter((task) => task.status === column.status).length}</span>
            </header>
            <div className="task-list">
              {tasks
                .filter((task) => task.status === column.status)
                .map((task) => (
                  <button
                    className={task.id === selectedTask?.id ? 'task-card is-selected' : 'task-card'}
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    type="button"
                  >
                    <strong>{task.title}</strong>
                    <span>{statusLabel[task.status]}</span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </section>

      <aside className="detail">
        {selectedTask ? (
          <>
            <div className="detail-header">
              <div>
                <p className="eyebrow">Task Detail</p>
                <h2>{selectedTask.title}</h2>
              </div>
              <span className={`status status-${selectedTask.status}`}>
                {statusLabel[selectedTask.status]}
              </span>
            </div>

            <p className="prompt">{selectedTask.prompt}</p>

            <div className="actions">
              <button
                disabled={isBusy || selectedTask.status === 'running'}
                onClick={() => void runTask()}
              >
                Run Task
              </button>
              <button
                disabled={isBusy || selectedTask.status !== 'completed'}
                onClick={() => void writeRecord()}
              >
                Write Record
              </button>
            </div>

            <section className="terminal">
              <header>
                <h3>Stub Terminal</h3>
              </header>
              <pre>
                {selectedEvents.length > 0
                  ? selectedEvents.map((event) => `[${event.type}] ${event.message}`).join('\n')
                  : 'No output'}
              </pre>
            </section>

            <section className="timeline">
              <h3>Timeline</h3>
              {selectedEvents.map((event) => (
                <article key={event.id}>
                  <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                  <strong>{event.type}</strong>
                  <p>{event.message}</p>
                </article>
              ))}
            </section>
          </>
        ) : (
          <p className="empty">No task selected</p>
        )}
      </aside>
    </main>
  );
};

createRoot(document.querySelector('#root') as HTMLElement).render(<App />);
