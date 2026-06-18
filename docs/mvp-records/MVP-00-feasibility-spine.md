# MVP 00 - PTY Terminal Spike

## 기본 정보

- MVP: MVP 0 - PTY Terminal Spike
- 상태: **미완료**
- 관련 plan: `docs/superpowers/plans/2026-06-18-local-first-agent-desktop.md`
- 관련 spec: `docs/superpowers/specs/2026-06-18-local-first-agent-desktop-design.md`

## 이전 구현 상태

초기 MVP 0으로 아래 코드가 작성되었으나 핵심 목표(PTY + xterm.js 검증)를 달성하지 못했다. 해당 코드는 MVP 1 이후 재사용 가능하다.

재사용 가능한 코드:
- `src/main/db/`: SQLite schema + repositories
- `src/shared/types.ts`: Task, AgentSession, TelemetryEvent 등 shared types
- `src/main/app/runtime.ts`: Electron app 기반 구조

재사용 불가 (교체 대상):
- `src/main/runner/stub-runner.ts`: stub runner → node-pty PTY manager로 교체
- `src/main/terminal/terminal-bridge.ts`: stub → xterm.js 연동으로 교체
- `src/renderer.tsx`: 전면 재작성 (새 레이아웃)

## MVP 0 목표

node-pty + xterm.js가 Windows Electron 환경에서 실제로 동작함을 증명한다.

### 완료 기준

- [ ] `pnpm build` — node-pty native module이 포함된 상태로 빌드 성공.
- [ ] `pnpm typecheck` 통과.
- [ ] `pnpm lint` 통과.
- [ ] xterm.js terminal이 renderer에서 렌더링된다.
- [ ] node-pty가 main process에서 cmd.exe를 PTY로 실행한다.
- [ ] IPC를 통해 PTY output이 xterm.js에 실시간 스트리밍된다.
- [ ] IPC를 통해 xterm.js keyboard input이 PTY stdin으로 전달된다.
- [ ] PTY process exit가 감지되고 GUI 상태에 반영된다.
- [ ] Manual: `dir` 입력 후 출력 확인.
- [ ] Manual: `exit` 입력 후 터미널 패널 닫힘 확인.

## 완료 시 기록할 항목

- node-pty 버전 + Electron 버전
- electron-rebuild 설정
- ConPTY (Windows) 동작 여부
- xterm.js addon 목록
- IPC 채널명과 데이터 포맷
- 다음 시작 지점 (MVP 1)
