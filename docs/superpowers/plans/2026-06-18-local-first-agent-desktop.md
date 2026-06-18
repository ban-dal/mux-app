# Local-First Agent Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted Claude Code Desktop / Codex Desktop — a personal desktop app that lets you run AI coding CLI agents (claude, codex, gemini) through a GUI, with a terminal for execution, structured chat UI, chat history, file/git panel, tests, and multi-agent observability.

**Architecture:**
- Electron main process spawns CLI agents via node-pty (PTY).
- Renderer: xterm.js (top half, live terminal output) + React chat UI (bottom half, structured input/history).
- SQLite stores chat history, workspace metadata, telemetry events.
- Right panel: file tree, git diff, embedded browser (BrowserView), plans/tasks, multi-agent dashboard.

**Tech Stack:** Electron, React, TypeScript, node-pty, xterm.js, SQLite.

---

## Layout Overview

```
┌──────────────┬──────────────────────────────┬──────────────────┐
│   LNB        │   Terminal (xterm.js, top)   │  Right Panel     │
│              │──────────────────────────────│  ─ File tree     │
│  Project A   │   Chat Area (React, bottom)  │  ─ Git changes   │
│  └ conv 1    │   [model][effort][mode][📎]  │  ─ Browser       │
│  └ conv 2    │   [─────────────── send ──]  │  ─ Plans/tasks   │
│  Project B   │                              │  ─ Multi-agent   │
│              │                              │                  │
├──────────────┤                              │                  │
│ Usage │ ⚙️   │                              │                  │
└──────────────┴──────────────────────────────┴──────────────────┘
```

Sub-agent terminal split (when sub-agents appear):
```
│   Main Terminal (left, fixed)  │  Sub-agent 1  │  Sub-agent 2  │
```

---

## Planning Rules

- Each MVP must prove something previously uncertain — do not build what is already known to work.
- MVP 0 must prove the hardest technical risk: node-pty + xterm.js on Windows Electron.
- Every MVP ends with a completion record using `docs/templates/mvp-completion-record.md`.
- Do not start the next MVP until the current MVP has passing verification, a written completion record, and a "다음 시작 지점".
- Prefer local SQLite over cloud until multi-agent dashboard.
- Add provider abstraction only when two real runners need it.

---

## MVP 0: PTY Terminal Spike

### Outcome

An xterm.js terminal inside the Electron app runs a real process via node-pty on Windows. This is the single highest-risk technical dependency for the entire product.

### Why First

Everything else — chat history, file panel, git diff, multi-agent — is well-understood UI work. The only unknown is whether node-pty can be native-rebuilt for this Electron version on Windows and whether PTY ↔ IPC ↔ xterm.js streams reliably. If this fails, the product concept fails.

### Scope

- Install node-pty, xterm.js.
- electron-rebuild configuration for node-pty native module.
- IPC channels: `pty:data` (main→renderer), `pty:input` (renderer→main), `pty:resize` (renderer→main), `pty:exit` (main→renderer).
- Minimal terminal panel in renderer using xterm.js (FitAddon for resize).
- Hardcoded "Open Terminal" button that spawns cmd.exe via node-pty.
- PTY process exit detection and UI state update.

### Excluded

- Task management, SQLite, workspaces, CLI selection, chat area, LNB.

### Tasks

- [ ] Install `node-pty`, `xterm`, `@xterm/addon-fit` packages.
- [ ] Configure electron-rebuild (or `@electron-forge/plugin-auto-unpack-natives`) for node-pty.
- [ ] Verify `pnpm build` passes with node-pty native module included.
- [ ] Add IPC channels in main and expose via contextBridge in preload.
- [ ] Implement PTY manager in main: spawn shell, pipe output to renderer, receive input.
- [ ] Add xterm.js Terminal component in renderer with FitAddon.
- [ ] Wire xterm `onData` → `pty:input` IPC.
- [ ] Wire `pty:data` IPC → xterm `write`.
- [ ] Wire xterm `onResize` → `pty:resize` IPC.
- [ ] Add "Open Terminal" button; handle `pty:exit` to mark terminal closed.

### Verification

- [ ] `pnpm build` passes with node-pty in native modules.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes.
- [ ] Manual: open terminal panel, type `dir`, see output.
- [ ] Manual: type `exit`, terminal panel shows as closed.
- [ ] Manual: type `claude --version` or `codex --version`, see output.

### Completion Record Must Include

- node-pty version + Electron version verified.
- Exact electron-rebuild command/config.
- Whether ConPTY (Windows) worked without issues.
- xterm.js addons used.
- IPC channel names and data format.
- Next start point for MVP 1.

---

## MVP 1: CLI Selection + Basic Shell Launch

### Outcome

First-run screen shows CLI selection (claude / codex / gemini) with basic session info. On subsequent launches, the previously selected CLI opens immediately in the terminal. Chat input at the bottom sends text to PTY stdin.

### Scope

- First-run CLI selection screen.
- Persist selection in SQLite (or app config).
- Main 3-column layout: LNB placeholder | center (terminal top + chat bottom) | right placeholder.
- Launch selected CLI in PTY on app open.
- Chat input sends to PTY stdin.
- Detect CLI availability (check PATH for `claude`, `codex`, `gemini`).

### Tasks

- [ ] Create SQLite db and `app_config` table (selected_cli, version, created_at).
- [ ] Build CLI selection screen: show claude / codex / gemini options with availability status.
- [ ] On selection, persist choice and navigate to main view.
- [ ] Build 3-column main layout (LNB 240px | center flex | right 320px).
- [ ] Center top: xterm.js terminal panel (reuse MVP 0 PTY manager).
- [ ] Center bottom: minimal chat input bar (textarea + send button).
- [ ] On app launch with saved CLI: spawn that CLI via PTY.
- [ ] Send button sends chat input text to PTY stdin.
- [ ] "Change CLI" option in settings placeholder.

### Verification

- [ ] First run: selection screen appears.
- [ ] Select claude: main view opens, terminal shows `claude` starting.
- [ ] Type message in chat input, press send: message forwarded to PTY.
- [ ] Relaunch app: previously selected CLI launches automatically.

### Completion Record Must Include

- CLI detection strategy (PATH check).
- PTY spawn command for each CLI.
- Config persistence location.
- Next start point for MVP 2.

---

## MVP 2: LNB — Chat History + Project Grouping

### Outcome

Left navigation shows chat conversations grouped by workspace (directory), stored for 30 days in SQLite. Users can start new conversations, switch between them, and see history.

### Scope

- Workspace detection from CLI cwd or user-configured paths.
- Conversation sessions: create, list, select, delete.
- SQLite schema: `workspaces`, `conversations`, `messages`.
- LNB: project sections with conversation list, new conversation button.
- Footer: usage placeholder + settings button.
- 30-day retention policy (delete older entries on startup).

### Tasks

- [ ] SQLite schema: `workspaces (id, path, label, created_at)`, `conversations (id, workspace_id, title, started_at, last_active_at)`, `messages (id, conversation_id, role, content, created_at)`.
- [ ] Detect workspace from CLI cwd; allow manual workspace add.
- [ ] LNB component: workspace sections, conversation list items, new chat button.
- [ ] Create new conversation → opens fresh PTY session.
- [ ] Select existing conversation → restore terminal session or show history.
- [ ] Store messages (user input + CLI output chunks) in SQLite.
- [ ] 30-day cleanup on app startup.
- [ ] Footer: empty session usage area + settings icon.
- [ ] LNB collapse/expand toggle.

### Verification

- [ ] Start conversation, send messages, restart app: history visible in LNB.
- [ ] Multiple workspaces appear as separate groups.
- [ ] 30-day cleanup: insert old record manually, verify it is deleted on startup.
- [ ] New conversation creates a fresh session.

### Completion Record Must Include

- Workspace detection method.
- Message storage format (full text vs chunks).
- Conversation title strategy (auto-generated or first message).
- Next start point for MVP 3.

---

## MVP 3: Right Panel — Files & Git

### Outcome

Right panel shows file tree for the current workspace, git diff of changed files, current branch, and commit/push actions.

### Scope

- File tree viewer (workspace root, collapsible directories).
- Git status panel (changed files with +/- indicators).
- Git diff viewer for selected file.
- Current branch display.
- Commit message input + commit button.
- Push button.
- Right panel tabs: Files | Changes.

### Tasks

- [ ] Right panel tab structure: Files | Changes | (placeholder tabs for later).
- [ ] File tree: read workspace directory, display tree with icons.
- [ ] File tree: click file → open in system editor (shell open).
- [ ] Git status: run `git status --porcelain` in workspace, parse output.
- [ ] Changes tab: list modified/added/deleted files with status indicators.
- [ ] Click changed file → show inline diff (run `git diff <file>`, render as colored lines).
- [ ] Current branch: run `git rev-parse --abbrev-ref HEAD`, display in Changes header.
- [ ] Commit panel: textarea for commit message + commit button (`git add -A && git commit`).
- [ ] Push button (`git push`), show result.
- [ ] Dashboard popover trigger in chat area: show branch, diff file count, commit status.

### Verification

- [ ] Open workspace with git changes: Changes tab shows modified files.
- [ ] Click changed file: diff displayed inline.
- [ ] Commit: git log shows new commit.
- [ ] Push: success/error message shown.

### Completion Record Must Include

- Git command execution method (child_process vs node-git).
- Diff rendering approach.
- File tree performance on large directories.
- Next start point for MVP 4.

---

## MVP 4: Session Usage + Chat UI Polish

### Outcome

Session usage (5h / 1-week) is displayed in the footer and above the chat input. Chat area shows structured message history with model, effort, and mode selectors.

### Scope

- Read CLI auth tokens (from `~/.claude/` or equivalent) to call usage API.
- Parse and display usage: tokens used, cost estimate, reset time.
- Chat area: styled message bubbles (user + assistant), scroll history.
- Chat toolbar: model selector, effort level (low/med/high), work mode, file attachment.
- Session usage indicator above chat input.

### Tasks

- [ ] Detect CLI credential file location for each CLI type.
- [ ] Call available usage API or parse usage from CLI config/logs.
- [ ] Store usage snapshots in SQLite; update on each conversation.
- [ ] Footer: display current usage vs limit with progress bar.
- [ ] Chat area: render message history as styled bubbles.
- [ ] Chat toolbar: model selector dropdown, effort selector, mode selector.
- [ ] File attachment button: pick file, include path in message.
- [ ] Usage panel above chat input: 5h usage / 1-week usage.
- [ ] CLI selection screen: show usage per CLI on selection cards.

### Verification

- [ ] Footer shows usage after sending at least one message.
- [ ] Chat history renders correctly with user/assistant distinction.
- [ ] Model and effort selectors visibly affect the CLI command arguments.

### Completion Record Must Include

- Usage API or file parsing method per CLI.
- What data is available vs estimated.
- Auth token read safety considerations.
- Next start point for MVP 5.

---

## MVP 5: Sub-Agent Terminal Grid

### Outcome

When sub-agents are spawned (either detected from main CLI stdout or app-managed), additional terminal panels appear to the right of the main terminal in a grid layout.

### Scope

- Sub-agent detection strategy: strong stdout pattern matching against known Claude Code / Codex sub-agent output markers.
- Alternatively (preferred if feasible): app spawns sub-agents directly via its own API calls — no effect on main model token usage, no PTY overhead.
- Terminal grid: main terminal fixed on left, sub-agent terminals in right columns (max 2 visible, scrollable).
- Per-session: label, status indicator (running/done/failed), kill button.
- Sub-agent list in chat area dashboard popover.

### Tasks

- [ ] Define sub-agent detection: parse stdout for known patterns OR implement app-managed spawn API.
- [ ] If stdout detection: implement pattern matcher, test against real Claude Code output.
- [ ] If app-managed: define sub-agent spawn IPC, spawn new PTY session per sub-agent.
- [ ] Terminal grid layout: CSS grid, main 1fr left + sub-agents right columns.
- [ ] Sub-agent panel header: label + status dot + kill (×) button.
- [ ] Sub-agent list in dashboard popover.
- [ ] Multi-agent tab in right panel (placeholder for MVP 6 dashboard).

### Verification

- [ ] Trigger a sub-agent (manually or via CLI): second terminal appears.
- [ ] Kill sub-agent: panel closes.
- [ ] Multiple sub-agents: grid extends correctly.

### Completion Record Must Include

- Sub-agent detection method chosen and its reliability.
- Whether app-managed spawn affected main model token usage.
- Grid performance with 2+ sessions.
- Next start point for MVP 6.

---

## MVP 6: Right Panel — Browser + Plans + Multi-Agent Dashboard

### Outcome

Right panel is fully featured: embedded browser for live test observation, plan/task/skill viewer, and multi-agent UI dashboard inspired by sonol-multi-agent.

### Scope

- Right panel tabs: Files | Changes | Browser | Plans | Agents.
- Embedded browser (Electron BrowserView or `<webview>`): display agent-controlled browser session.
- Plans tab: display plan/task Markdown files from workspace docs.
- Skills/tools tab: log of tools used in current session.
- Agents tab: multi-agent dashboard — status, token usage, timeline per agent.
  - Reference: https://github.com/volition79/sonol-multi-agent

### Tasks

- [ ] Right panel tab system: Files | Changes | Browser | Plans | Agents.
- [ ] Browser tab: embed Electron BrowserView, navigate to agent browser URL (from `agent-browser:dashboard` or localhost dev server).
- [ ] BrowserView resize to fit right panel.
- [ ] Plans tab: scan workspace `docs/` for Markdown files, display tree + viewer.
- [ ] Skills/tools tab: parse telemetry events for tool_call type, display timeline.
- [ ] Agents tab: agent session list with status, start time, token count, event count.
- [ ] Agent timeline: collapsible event list per agent.
- [ ] Agent detail: last stdout line, exit code, duration.

### Verification

- [ ] Browser tab: navigate to localhost:3000 (if running), page renders inside right panel.
- [ ] Plans tab: Markdown files from workspace docs appear.
- [ ] Agents tab: all spawned agents visible with status.

### Completion Record Must Include

- BrowserView vs webview decision and tradeoffs.
- Plans discovery strategy.
- Multi-agent dashboard data sources.
- Remaining right panel gaps.
- Next start point for MVP 7.

---

## MVP 7: Stability + Polish

### Outcome

The app is reliable enough for daily use: crash recovery, keyboard shortcuts, notification on task completion, and onboarding flow.

### Scope

- PTY session recovery on renderer crash.
- App-level error boundaries.
- Keyboard shortcuts (new chat, toggle LNB, toggle right panel, send).
- OS notification on agent task completion.
- Onboarding: first-run guide for CLI setup.
- Export conversation as Markdown.

---

## Cross-MVP Completion Gate

Before moving from any MVP to the next:

- [ ] All committed code has a passing verification command listed.
- [ ] The MVP completion record exists under `docs/mvp-records/`.
- [ ] The record has a "다음 시작 지점" section.
- [ ] Known risks are explicit.
- [ ] The next MVP's first task is concrete enough to start in a new session.
