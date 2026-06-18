# Local-First Agent Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal local-first desktop app that combines cmux-style multi-agent observability with Codex/Claude Desktop-style GUI workflows.

**Architecture:** Start with an Electron/React/TypeScript shell, a local SQLite event store, a runner abstraction, and a terminal bridge that first supports a stub terminal adapter before Ghostty-specific integration is proven. The app treats terminal output as the live execution surface and GUI state as structured task, approval, telemetry, diff, and completion-record management.

**Tech Stack:** Electron, React, TypeScript, SQLite, Node child_process, Git CLI, Ghostty integration spike, Markdown completion records.

---

## Planning Rules

- Each MVP must produce a usable vertical slice.
- Every MVP ends with a completion record using `docs/templates/mvp-completion-record.md`.
- Do not start the next MVP until the current MVP has passing verification, a written completion record, and a short "next start point".
- Prefer local files and SQLite over cloud services until MVP 7.
- Add provider abstraction only when two real runners need it.
- Add team/server concepts only after local single-user workflows are stable.

## Target File Structure

The first implementation pass should create this shape.

- `package.json`: scripts, dependencies, app metadata.
- `src/main/`: Electron main process, runner process management, local filesystem access.
- `src/main/app/`: app boot, window creation, IPC registration.
- `src/main/db/`: SQLite schema, migrations, repositories.
- `src/main/runner/`: runner adapters for stub, shell command, Codex, Claude.
- `src/main/terminal/`: terminal bridge interfaces and Ghostty spike implementation.
- `src/main/telemetry/`: event normalization, file touch detection, process event capture.
- `src/preload/`: safe IPC bridge exposed to renderer.
- `src/renderer/`: React GUI.
- `src/renderer/features/tasks/`: task board, task detail, task creation.
- `src/renderer/features/terminal/`: terminal session panels and telemetry tabs.
- `src/renderer/features/approvals/`: approval queue and decision UI.
- `src/renderer/features/records/`: completion record viewer/editor.
- `src/shared/`: shared types and schemas.
- `tests/unit/`: unit tests for domain logic and adapters.
- `tests/integration/`: process runner, db, event store tests.
- `docs/adr/`: architecture decision records.
- `docs/mvp-records/`: completed MVP records.
- `docs/templates/`: reusable templates.

## MVP 0: Feasibility Spine

### Outcome

The app can create a local task, run a dummy command, display or link a terminal session, persist events, and write a completion record.

### Scope

- Electron app skeleton.
- Local SQLite event store.
- Task create/list/detail GUI.
- Stub runner that executes a harmless command.
- Terminal bridge interface with stub implementation.
- Completion record template wired into docs.

### Excluded

- Real Codex/Claude execution.
- Real Ghostty embedding.
- Multi-agent orchestration.
- Diff UI.
- Git write actions.

### Tasks

- [ ] Create Electron + React + TypeScript project skeleton.
- [ ] Add `Task`, `AgentSession`, `TerminalSession`, `TelemetryEvent`, `CompletionRecord` shared types.
- [ ] Create SQLite schema for workspaces, tasks, agent_sessions, terminal_sessions, telemetry_events, completion_records.
- [ ] Implement repository functions for task create/list/update.
- [ ] Implement append-only telemetry event writer.
- [ ] Build task board with Draft, Running, Completed, Failed columns.
- [ ] Build task detail view showing prompt, status, event timeline, and terminal placeholder.
- [ ] Implement `StubRunner` that runs a deterministic local command.
- [ ] Connect `Run Task` button to runner through IPC.
- [ ] Persist process start, stdout line, stderr line, exit code, and duration events.
- [ ] Create terminal bridge interface with `openSession`, `attachToTask`, `disposeSession`.
- [ ] Implement stub terminal panel that displays captured stdout/stderr.
- [ ] Add `docs/mvp-records/MVP-00-feasibility-spine.md` using the template.
- [ ] Verify app can run end-to-end from new task to completion record.

### Verification

- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] Unit tests for repositories pass.
- [ ] Integration test verifies task -> runner -> events -> completion record.
- [ ] Manual smoke test creates one task and observes events in GUI.

### Completion Record Must Include

- Chosen app runtime and why.
- Actual SQLite schema.
- Terminal bridge limitation.
- First known risk around Ghostty.
- Exact command used for the stub runner.
- Next start point for MVP 1.

## MVP 1: Single Main Agent

### Outcome

The app can start one real main agent command in a workspace and preserve its execution history.

### Scope

- Workspace registration.
- Runner settings for Codex and Claude command templates.
- Main agent execution.
- Process cancellation.
- File touch detection through Git status snapshots.
- Basic approval pause state when runner requests escalation or manual input.

### Tasks

- [ ] Add workspace registration screen with local path, label, default runner.
- [ ] Persist workspace settings in SQLite.
- [ ] Add runner config screen for executable path, args template, environment variables, and default cwd.
- [ ] Implement `ShellRunner` using Node child_process.
- [ ] Implement `CodexRunner` as a configured shell runner profile.
- [ ] Implement `ClaudeRunner` as a configured shell runner profile.
- [ ] Add process cancellation and timeout handling.
- [ ] Capture stdout/stderr as telemetry events.
- [ ] Capture process exit code and signal.
- [ ] Snapshot Git status before and after execution.
- [ ] Store changed file paths in telemetry.
- [ ] Show changed files in task detail.
- [ ] Add manual completion record editor prefilled from events.
- [ ] Verify one real agent can be launched against a disposable workspace.

### Verification

- [ ] Unit tests for command template rendering.
- [ ] Unit tests for process lifecycle state transitions.
- [ ] Integration test for successful command.
- [ ] Integration test for failed command.
- [ ] Manual smoke test with one Codex or Claude command.

### Completion Record Must Include

- Runner command used.
- Workspace path.
- Files touched.
- Whether cancellation worked.
- Whether terminal session stayed readable after exit.
- Next start point for MVP 2.

## MVP 2: Subagent Telemetry

### Outcome

Main and subagent sessions are represented separately, with per-agent status, logs, terminal linkage, and failure handling.

### Scope

- Agent session hierarchy.
- Main/subagent role distinction.
- Subagent event grouping.
- Parallel process lifecycle display.
- Individual retry for failed subagent-like commands.

### Tasks

- [ ] Extend schema with `parent_agent_session_id`.
- [ ] Add agent role enum: `main`, `subagent`, `system`, `tool`.
- [ ] Add agent session list to task detail.
- [ ] Add event timeline filters by agent.
- [ ] Implement subagent detection strategy for supported runner output.
- [ ] If detection is not reliable, add explicit subagent launch API first.
- [ ] Add terminal/log tab per agent session.
- [ ] Add status rollup from agent sessions to task.
- [ ] Implement retry for failed child agent session.
- [ ] Persist retry relationship between old and new session.
- [ ] Add completion record section for subagent outcomes.

### Verification

- [ ] Unit tests for status rollup.
- [ ] Unit tests for parent/child event queries.
- [ ] Integration test with one main and two child sessions.
- [ ] Manual smoke test shows separate agent logs.

### Completion Record Must Include

- How subagents were detected or launched.
- Failure/retry behavior.
- Event schema changes.
- Known gaps in telemetry fidelity.
- Next start point for MVP 3.

## MVP 3: cmux-Style Task Board

### Outcome

The app supports multiple concurrent tasks, status filtering, task comparison, and fast recovery from blocked or failed work.

### Scope

- Multi-task board.
- Concurrent runner management.
- Queue and resource limits.
- Task comparison view.
- Blocked/failed recovery workflow.

### Tasks

- [ ] Add task filters by status, workspace, runner, date, and text.
- [ ] Add task queue with max concurrent runs.
- [ ] Add per-workspace concurrency limit.
- [ ] Add board cards showing status, duration, last event, changed files count, and approval state.
- [ ] Add task compare view for prompt, status, changed files, tests, and completion summary.
- [ ] Add failed task recovery actions: retry, duplicate task, archive, mark blocked.
- [ ] Add blocked task note field.
- [ ] Add task archive view.
- [ ] Add global running task indicator.
- [ ] Add event retention policy setting.

### Verification

- [ ] Unit tests for queue scheduling.
- [ ] Unit tests for task filters.
- [ ] Integration test for concurrent tasks.
- [ ] Manual smoke test with at least three tasks.

### Completion Record Must Include

- Concurrency defaults.
- Recovery workflow tested.
- Board states that are still awkward.
- Next start point for MVP 4.

## MVP 4: Desktop Workflow GUI

### Outcome

The non-terminal parts of the coding workflow become GUI-native: diff, approvals, specs, plans, logs, records, and settings.

### Scope

- Diff viewer.
- Approval queue.
- Plan/spec/log Markdown viewer.
- Completion record editor.
- Search and resume.
- Settings UI.

### Tasks

- [ ] Add Git diff repository function for selected workspace.
- [ ] Add file list and diff view in task detail.
- [ ] Add approval request schema with action, risk, command, cwd, created_at, resolved_at.
- [ ] Add approval queue screen.
- [ ] Add approve/reject decision flow.
- [ ] Add Markdown viewer for docs and completion records.
- [ ] Add completion record editor with save-to-file.
- [ ] Add global search over task title, prompt, completion record, changed files, and event text.
- [ ] Add resume task flow that creates a new task from a previous task context.
- [ ] Add settings screen for runners, workspaces, policies, and data location.

### Verification

- [ ] Unit tests for approval state machine.
- [ ] Unit tests for search indexing.
- [ ] Integration test for approval persistence.
- [ ] Manual smoke test for diff and completion record editing.

### Completion Record Must Include

- Approval actions supported.
- Diff implementation limitations.
- Search fields indexed.
- Resume workflow quality.
- Next start point for MVP 5.

## MVP 5: Provider and Connector Layer

### Outcome

The app can add new runner/provider/connector capabilities without rewriting core task orchestration.

### Scope

- Stable runner adapter.
- Connector registry.
- Read/write action policy.
- GitHub read surfaces first.
- Write actions behind approval.

### Tasks

- [ ] Define runner adapter contract.
- [ ] Migrate Codex/Claude/Shell runners to adapter contract.
- [ ] Define connector action contract.
- [ ] Add connector registry in main process.
- [ ] Add connector capability list in settings.
- [ ] Add GitHub read-only connector spike for PR metadata.
- [ ] Add connector events to telemetry timeline.
- [ ] Add write action approval wrapper.
- [ ] Add connector audit log.
- [ ] Document how to add a new runner and connector.

### Verification

- [ ] Contract tests for runners.
- [ ] Contract tests for connector read action.
- [ ] Approval test for connector write action.
- [ ] Manual smoke test for GitHub read data if credentials are available.

### Completion Record Must Include

- Adapter boundaries.
- First connector limitations.
- Security and approval implications.
- Next start point for MVP 6.

## MVP 6: Long-Term Memory and Replay

### Outcome

The app becomes useful over months of work: records are searchable, reusable, and replayable.

### Scope

- Full-text search.
- Task templates.
- Completion record reuse.
- Replay in a new branch/workspace.
- Failure pattern notes.

### Tasks

- [ ] Add full-text index for tasks, events, files, records.
- [ ] Add saved task templates.
- [ ] Add "create task from completion record".
- [ ] Add "replay task" workflow with branch/workspace selection.
- [ ] Add failure pattern field to completion records.
- [ ] Add reusable decisions/ADR links.
- [ ] Add export bundle for one task with events and records.
- [ ] Add import bundle for archived task context.

### Verification

- [ ] Unit tests for search ranking.
- [ ] Integration test for export/import.
- [ ] Manual smoke test replaying an old task into a new workspace.

### Completion Record Must Include

- Replay safety rules.
- Export/import format.
- Search quality issues.
- Next start point for MVP 7.

## MVP 7: Team-Ready Evolution

### Outcome

The local-first app keeps working for one person while its artifacts and schemas become ready for team sharing.

### Scope

- Shareable exports.
- Multiuser-ready schema fields.
- Optional remote runner experiment.
- Team handoff docs.

### Tasks

- [ ] Add actor fields to approval and telemetry schema without changing single-user UX.
- [ ] Add shareable HTML/Markdown task report export.
- [ ] Add redaction rules for secrets and local paths.
- [ ] Add workspace policy export/import.
- [ ] Add experimental remote runner interface behind a feature flag.
- [ ] Add team handoff guide.
- [ ] Add migration notes from local-only to shared artifacts.

### Verification

- [ ] Unit tests for redaction.
- [ ] Integration test for report export.
- [ ] Manual review of exported task report.

### Completion Record Must Include

- What became team-ready.
- What is still local-only.
- Remote runner risks.
- Recommended next product direction.

## Cross-MVP Completion Gate

Before moving from any MVP to the next:

- [ ] All committed code has a passing verification command listed.
- [ ] The MVP completion record exists under `docs/mvp-records/`.
- [ ] The record has a "다음 시작 지점" section.
- [ ] Known risks are explicit.
- [ ] The next MVP's first task is concrete enough to start in a new session.

