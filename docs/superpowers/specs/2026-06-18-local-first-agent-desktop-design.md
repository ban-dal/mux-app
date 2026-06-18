# Local-First Agent Desktop Design

> Claude Code Desktop / Codex Desktop 계열의 AI 코딩 에이전트 GUI를 개인 로컬 머신에서 구동하기 위한 설계 기준이다.

## 목표

개인 개발자가 로컬 머신에서 claude / codex / gemini CLI를 GUI로 제어하고, 터미널 실행 결과를 실시간으로 보면서, 채팅 히스토리 · 파일/git 패널 · 테스트 브라우저 · 멀티 에이전트 대시보드를 하나의 앱에서 다룰 수 있게 한다.

## 비목표

- MVP 0-4에서는 클라우드 동기화, 팀 워크스페이스, 원격 실행 큐를 만들지 않는다.
- 외부 터미널 앱(Ghostty, iTerm 등)을 embed하거나 companion으로 제어하지 않는다. xterm.js + node-pty로 앱 내에 구현한다.
- IDE 전체를 재구현하지 않는다. 파일 편집은 기존 에디터와 git 기반 diff를 활용한다.

## 제품 판단 기준

이 앱이 잘 작동한다는 뜻:

- 앱을 열면 이전에 선택한 CLI가 바로 터미널에서 실행된다.
- 채팅 입력창에서 메시지를 보내면 CLI로 전달되고, 위 터미널에서 에이전트가 동작하는 모습을 본다.
- 왼쪽에서 프로젝트별로 과거 대화를 빠르게 찾을 수 있다.
- 오른쪽에서 파일 구조, git 변경사항, 브라우저, 에이전트 상태를 전환 없이 볼 수 있다.
- 서브에이전트가 생기면 터미널이 옆으로 분할되며 나타난다.

## 레이아웃

```
┌──────────────┬──────────────────────────────┬──────────────────┐
│   LNB        │   Terminal (xterm.js, top)   │  Right Panel     │
│              │                              │                  │
│  Project A   │  Main CLI  │ Sub-agent 1    │  Files           │
│  └ conv 1    │  (fixed)   │ Sub-agent 2    │  Changes         │
│  └ conv 2    │──────────────────────────────│  Browser         │
│  Project B   │   Chat Area (React, bottom)  │  Plans           │
│              │   [model][effort][mode][📎]  │  Agents          │
│              │   [── input ──────── send]   │                  │
├──────────────┤                              │                  │
│ Usage │ ⚙️   │                              │                  │
└──────────────┴──────────────────────────────┴──────────────────┘
```

## 아키텍처

```
[Renderer]
  xterm.js terminal  ←──── pty:data IPC ────┐
  xterm.js onData   ─────► pty:input IPC    │
  React chat UI      ←──── conversation:* IPC│
                                             │
[Main Process]                               │
  PTY Manager (node-pty)  ──────────────────┘
    └─ claude / codex / gemini subprocess
  Conversation Store (SQLite)
  Git Runner (child_process)
  Usage Reader (CLI credential files)

[Right Panel]
  File Tree       ← fs.readdir
  Git Changes     ← git status / git diff (child_process)
  BrowserView     ← Electron BrowserView (embedded browser)
  Plans Viewer    ← workspace docs/ Markdown files
  Agent Dashboard ← telemetry events from PTY Manager
```

## 핵심 기술 선택

| 역할 | 선택 | 이유 |
|---|---|---|
| Terminal emulation | xterm.js | VS Code와 동일한 스택. 검증됨 |
| PTY process | node-pty | Windows ConPTY 지원. Electron native rebuild 필요 |
| Storage | node:sqlite | local-first. no external deps |
| Embedded browser | Electron BrowserView | agent-controlled browser 표시용 |
| Git | child_process (git CLI) | no dependency, always available |

**node-pty Windows 주의사항**: electron-rebuild로 native module을 Electron 버전에 맞게 rebuild해야 한다. Windows 11 + ConPTY 조합에서 동작한다.

## 도메인 모델

### AppConfig
- selected_cli: 'claude' | 'codex' | 'gemini'
- cli_path: 실행 경로
- last_workspace_id

### Workspace
- 로컬 프로젝트 디렉토리 1개. LNB 프로젝트 그룹의 단위.
- 감지 기준: CLI 실행 cwd 또는 사용자 수동 등록.

### Conversation
- Workspace 안에서 시작한 대화 세션. PTY session과 연결됨.
- 30일 보존.

### Message
- role: 'user' | 'assistant'
- content: text (이미지는 file path 또는 base64)
- conversation_id

### AgentSession
- PTY로 실행 중인 프로세스 1개. main 또는 subagent.
- 터미널 그리드의 하나의 패널과 대응.

### TelemetryEvent
- append-only. type: process_started | stdout_chunk | process_exited | tool_call | file_changed.

## 인증 전략

- 초기: CLI가 이미 로그인한 상태 가정. `~/.claude/`, `~/.codex/` 등의 credential 파일에서 토큰을 읽어 usage API 호출.
- 이미지 전송: Claude API multipart 또는 base64 encoding.
- 추후: 앱 자체 OAuth flow로 확장 가능.

## 서브에이전트 전략

앱이 직접 sub-agent PTY를 spawn하는 방식을 선호한다.

- 메인 CLI 토큰 사용량에 영향 없음.
- 앱이 각 sub-agent의 lifecycle을 직접 추적 가능.
- 단, 메인 CLI와의 협력 방식(stdin/stdout 프로토콜)은 CLI별로 다를 수 있어 추가 spike 필요.

stdout 패턴 감지는 보조 수단으로 사용한다. 놓치는 케이스가 있어도 앱 직접 관리로 보완한다.

## 세션 사용량 표시

- Claude: `~/.claude/usage.json` 또는 API 응답 usage 필드에서 누적.
- Codex / Gemini: 각 CLI의 credential/config 경로 탐색 후 결정.
- 5시간 블록 / 1주일 기준으로 표시.
- 정확한 수치를 모를 경우 토큰 count 누적으로 대체.

## 오픈 질문 (해결됨)

| 질문 | 결정 |
|---|---|
| Ghostty embed 가능한가? | 불가. xterm.js + node-pty로 앱 내 구현 |
| 채팅 vs PTY 관계 | 채팅 입력 → PTY stdin 전달. 상하 분리 레이아웃 |
| 서브에이전트 감지 방법 | 앱 직접 spawn 우선. stdout 패턴은 보조 |
| 프로젝트 구분 단위 | 워크스페이스 디렉토리 |
| 인증 방식 | CLI auth 재사용 (나중에 앱 OAuth로 확장 가능) |
