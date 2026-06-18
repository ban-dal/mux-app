# MVP Completion Record — MVP 1: CLI Selection + Basic Shell Launch

## 기본 정보

- MVP: 1
- 완료일: 2026-06-19
- 작업 브랜치: mvp-1-cli-selection
- 대상 workspace: C:\Users\ehgus\Documents\workspace\kdh\mux-app
- 관련 plan: docs/superpowers/plans/2026-06-18-local-first-agent-desktop.md
- 관련 spec: docs/superpowers/specs/2026-06-18-local-first-agent-desktop-design.md

## 목표

첫 실행 시 CLI 선택 화면을 표시하고, 이후 실행부터는 선택된 CLI가 터미널에서 자동 실행되며, 채팅 입력이 PTY stdin으로 전달되는 3-column 레이아웃을 구현한다.

## 완료 기준 결과

| 기준 | 결과 | 근거 |
|------|------|------|
| 첫 실행: CLI 선택 화면 표시 | 완료 | CliSelect.tsx — PATH 기반 감지 후 사용 가능 여부 표시 |
| Claude 선택 → 터미널에서 claude 자동 실행 | 완료 | shell(pwsh) 먼저 spawn 후 initInput으로 CLI 명령 stdin 전송 |
| 채팅 입력 → PTY 전달 | 완료 | `\r` 전송으로 PTY 프롬프트 제출 확인 |
| 재실행 → 선택 화면 없이 바로 Main 뷰 | 완료 | SQLite app_config에 selected_cli 저장, App.tsx에서 isCliId() 타입 가드 포함 |

## 주요 변경

### 추가

- `src/main/db/database.ts` — node:sqlite DatabaseSync, app_config 테이블, closeDb() 추가
- `src/main/db/config-repository.ts` — getConfig/setConfig, 준비문 캐싱
- `src/main/cli/cli-detector.ts` — where/which 기반 CLI PATH 감지
- `src/renderer/App.tsx` — loading → select → main 라우터, isCliId() 타입 가드
- `src/renderer/features/setup/CliSelect.tsx` — CLI 선택 UI
- `src/renderer/features/chat/ChatInput.tsx` — textarea + 전송 버튼, 포커스 아웃라인
- `src/renderer/layout/MainLayout.tsx` — LNB 240px | 중앙 flex | 우측 320px 3-column
- `src/renderer/features/terminal/Terminal.tsx` — features/terminal/로 이동, initInput prop, 포커스 링
- `src/renderer/global.d.ts` — Window.pty, Window.muxApp 타입 선언

### 변경

- `src/main.ts` — DB 초기화, app IPC 등록, width: 1280 추가, before-quit closeDb
- `src/preload.ts` — PtyApi + AppApi contextBridge 노출
- `src/main/pty/pty-manager.ts` — onData/onExit disposable 저장, 명시적 IPC 핸들러 참조

### 제거

- `src/renderer/components/Terminal.tsx` — features/terminal/Terminal.tsx로 이동

## 주요 결정

### Windows에서 CLI 직접 spawn 대신 shell 경유

- 맥락: `pty.spawn('claude')` 시 .cmd 파일을 node-pty가 직접 실행 불가
- 결정: shell(pwsh → powershell → cmd 순) 먼저 spawn 후 `initInput` prop으로 CLI 명령을 stdin 전송
- 대안: cmd /c claude 등 직접 실행 — shell 세션이 CLI 종료 시 함께 닫히는 UX 문제
- 결과: shell이 살아있어 CLI 종료 후에도 터미널 재사용 가능

### PTY 입력에 \r 사용

- 맥락: 채팅 전송 시 `\n`을 보내면 PTY가 Enter로 인식 못 함
- 결정: `\r` (carriage return) 전송 — PTY/ConPTY가 Enter로 처리
- 결과: Claude Code 프롬프트 제출 정상 동작

### 자동 포커스 제거

- 맥락: PTY idle 감지 + trust 다이얼로그 패턴 매칭으로 자동 채팅 포커스 시도했으나 신뢰도 부족
- 결정: 자동 포커스 제거, 클릭 기반 수동 포커스만 유지
- 결과: 터미널 클릭 → 터미널 포커스(방향키 조작 가능), 채팅창 클릭 → 채팅 포커스, 파란색 보더로 현재 포커스 표시

## 검증

| 명령 또는 확인 | 결과 | 메모 |
|----------------|------|------|
| `pnpm lint` | 통과 | |
| `pnpm typecheck` | 통과 | |
| 수동: 첫 실행 CLI 선택 화면 | 통과 | claude 사용 가능, codex/gemini 설치 필요 표시 |
| 수동: claude 선택 → 터미널 자동 실행 | 통과 | pwsh 열리고 claude 자동 입력됨 |
| 수동: 채팅 입력 전송 | 통과 | Claude Code 프롬프트 제출 확인 |
| 수동: 재실행 | 통과 | 선택 화면 없이 바로 Main 뷰 |
| 수동: 터미널 포커스 링 | 통과 | 클릭 시 헤더 하단 보더 파란색 |
| 수동: trust 다이얼로그 방향키 조작 | 통과 | 터미널 클릭 후 방향키 조작 가능 |

## 남은 위험

- `detectClis()`가 동기(execFileSync) — 앱 시작 시 main process 잠깐 블로킹. 현재는 1회 호출이라 체감 없음. 향후 "재감지" 기능 추가 시 async로 전환 필요.
- Claude Code 외 CLI(codex, gemini)는 실제 실행 검증 안 됨 — initInput 전달 방식이 동일하므로 동작할 것으로 예상.

## 다음 시작 지점

MVP 2 — LNB 채팅 히스토리 + 프로젝트 그룹

1. `git checkout main && git checkout -b mvp-2-lnb-history`
2. SQLite 스키마 추가: `workspaces`, `conversations`, `messages` 테이블
3. LNB 컴포넌트: workspace 섹션 + conversation 목록 + 새 대화 버튼

## 참고 파일

- `docs/superpowers/plans/2026-06-18-local-first-agent-desktop.md` — MVP 2 scope 상세
- `docs/mvp-records/MVP-00-feasibility-spine.md` — node-pty + xterm.js 설정 기록
