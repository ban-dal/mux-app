# MVP 00 - Feasibility Spine

## 기본 정보

- MVP: MVP 0 - Feasibility Spine
- 완료일: 2026-06-18
- 관련 plan: `docs/superpowers/plans/2026-06-18-local-first-agent-desktop.md`

## 목표

GUI에서 task를 만들고 stub command를 실행한 뒤, stdout/stderr와 process lifecycle event를 SQLite에 저장하고 completion record까지 남기는 최소 세로 흐름을 검증한다.

## 변경 요약

- Electron Forge + Vite 기반 앱에 React renderer를 연결했다.
- `Task`, `AgentSession`, `TerminalSession`, `TelemetryEvent`, `CompletionRecord` shared type을 추가했다.
- Node `node:sqlite` 기반 local SQLite schema와 repository를 추가했다.
- Draft, Running, Completed, Failed column을 가진 task board와 task detail view를 만들었다.
- `Run Task` IPC가 deterministic stub runner를 실행하고 telemetry event를 저장하도록 연결했다.
- Stub terminal panel이 저장된 stdout/stderr/process event를 표시한다.
- MVP 0 repository 단위 테스트와 task -> runner -> events -> completion record 통합 테스트를 추가했다.

## 선택한 앱 런타임

Electron + React + TypeScript를 선택했다. Node process orchestration, local filesystem, SQLite, future CLI runner 통합을 main process에서 바로 다룰 수 있고, renderer에서는 task board와 detail GUI를 빠르게 만들 수 있기 때문이다.

## 실제 SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  role TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS terminal_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  agent_session_id TEXT NOT NULL REFERENCES agent_sessions(id),
  adapter TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  disposed_at TEXT
);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  agent_session_id TEXT REFERENCES agent_sessions(id),
  terminal_session_id TEXT REFERENCES terminal_sessions(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS completion_records (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  file_path TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

## Stub Runner

- Exact command represented in telemetry and records: `pnpm mux:stub-runner`
- 실제 실행은 main process에서 `node scripts/mux-stub-runner.mjs`를 spawn한다.
- 저장 이벤트: `process_started`, `stdout_line`, `stderr_line`, `process_exited`
- exit code 0이면 task와 agent session을 `completed`로 갱신한다.

## Terminal Bridge Limitation

`TerminalBridge` interface는 `openSession`, `attachToTask`, `disposeSession`을 가진다. MVP 0 구현은 Ghostty와 연결하지 않고 stub terminal panel에서 captured output을 표시한다.

## First Known Ghostty Risk

Ghostty를 Electron 내부에 직접 embed할 수 있을지 아직 검증하지 않았다. MVP 1 이후에는 companion terminal control, pane/tab mapping, scrollback export 중 어떤 방식이 안정적인지 별도 spike가 필요하다.

## 검증

- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: pass, 2 files / 2 tests
- `pnpm build`: pass

`pnpm test` 실행 시 Node `node:sqlite`의 experimental warning이 출력된다. 테스트와 빌드는 실패하지 않는다.

## 남은 위험

- GUI 수동 smoke test는 자동화하지 못했다. Electron 창에서 New Task -> Run Task -> Write Record를 직접 확인해야 한다.
- SQLite API가 Node 24 기준 experimental warning을 출력한다.
- completion record 생성은 task별 Markdown 작성까지 가능하지만, GUI에서 record path를 보여주는 뷰는 아직 없다.

## 다음 시작 지점

MVP 1은 workspace registration 화면부터 시작한다. 이어서 runner settings, shell runner, Codex/Claude command profile, cancellation, git status snapshot을 붙이면 된다.
