# MVP 00 - PTY Terminal Spike

## 기본 정보

- MVP: MVP 0 - PTY Terminal Spike
- 완료일: 2026-06-18
- 작업 브랜치: mvp-0-feasibility-spine
- 관련 plan: `docs/superpowers/plans/2026-06-18-local-first-agent-desktop.md`
- 관련 spec: `docs/superpowers/specs/2026-06-18-local-first-agent-desktop-design.md`

## 목표

node-pty + xterm.js가 Windows Electron 환경에서 실제로 동작함을 증명한다.

## 완료 기준 결과

| 기준 | 결과 | 근거 |
|---|---|---|
| `pnpm build` — node-pty native module 포함 빌드 | 완료 | `electron-forge package` 성공 |
| `pnpm typecheck` 통과 | 완료 | `tsc --noEmit` 0 errors |
| `pnpm lint` 통과 | 완료 | `oxlint .` 0 errors |
| xterm.js terminal renderer 렌더링 | 완료 | 앱 창에서 확인 |
| node-pty → cmd.exe PTY 실행 | 완료 | `dir` 출력 확인 |
| PTY output → IPC → xterm.js 스트리밍 | 완료 | 수동 smoke test |
| xterm.js keyboard input → PTY stdin | 완료 | 수동 입력 전달 확인 |
| PTY exit 감지 → GUI 상태 반영 | 완료 | `exit` 입력 후 상태 변경 확인 |

## 주요 변경

### 추가

- `src/main/pty/pty-manager.ts`: node-pty PTY 관리, IPC 채널 등록
- `src/renderer/components/Terminal.tsx`: xterm.js + FitAddon + ResizeObserver
- `src/renderer.tsx`: 최소 앱 shell

### 변경

- `forge.config.ts`: `rebuildConfig: { onlyModules: [] }` + `asar: { unpack: '**/*.node' }`
- `vite.main.config.ts`: `rollupOptions.external: ['node-pty']`
- `src/preload.ts`: contextBridge로 PTY IPC 노출

### 제거

- 구 stub runner 기반 코드 전체 (db/, runner/, terminal-bridge, records/, shared/types, tests/)

## 주요 결정

### node-pty native rebuild 우회

- 맥락: Windows에 Python/VS Build Tools 없어 `@electron/rebuild`가 node-pty 재컴파일 실패
- 결정: `rebuildConfig: { onlyModules: [] }`로 electron-rebuild 스킵. node-pty v1.1.0의 `prebuilds/win32-x64/*.node` prebuilt 바이너리 직접 사용
- 대안: Python + windows-build-tools 설치, `node-pty-prebuilt-multiarch` (Windows prebuilt 없음), `@homebridge/node-pty-prebuilt-multiarch` (Windows prebuilt 없음)
- 결과: 빌드 및 실행 성공. N-API 기반 바이너리라 Electron ABI 재컴파일 없이 호환됨

### Windows 기본 쉘 = PowerShell

- 맥락: `cmd.exe`보다 개발자 친화적 환경 필요
- 결정: `where pwsh.exe` → `powershell.exe` → `cmd.exe` 순서로 탐색
- 결과: 현재 환경에서 pwsh.exe (PowerShell 7) 로드 확인

## 검증

| 명령 또는 확인 | 결과 | 메모 |
|---|---|---|
| `pnpm lint` | 통과 | |
| `pnpm typecheck` | 통과 | |
| `pnpm build` | 통과 | `electron-forge package` 성공 |
| 수동 smoke test — `dir` 입력 | 통과 | PTY 출력 xterm.js에 표시 |
| 수동 smoke test — `exit` 입력 | 통과 | 터미널 상태 `exited (0)` 표시 |
| 수동 smoke test — `claude --version` | 통과 | 버전 출력 확인 |

## IPC 채널 명세

| 채널 | 방향 | 방식 | 데이터 |
|---|---|---|---|
| `pty:spawn` | renderer→main | `ipcMain.handle` | 없음 → Promise\<void\> |
| `pty:input` | renderer→main | `ipcMain.on` | `string` |
| `pty:resize` | renderer→main | `ipcMain.on` | `(cols: number, rows: number)` |
| `pty:data` | main→renderer | `webContents.send` | `string` |
| `pty:exit` | main→renderer | `webContents.send` | `{ exitCode: number, signal: number }` |

## 남은 위험

- `rebuildConfig: { onlyModules: [] }` 설정으로 다른 native module이 추가될 경우 rebuild 안 됨. 새 native module 추가 시 재검토 필요.
- node-pty prebuilt는 Node.js 런타임 기준 컴파일. Electron 버전이 크게 달라지면 ABI 불일치 가능성 있음 (N-API라 실제론 낮음).

## 다음 시작 지점

MVP 1은 CLI 선택 화면부터 시작한다.

1. `src/main/db/database.ts` — `node:sqlite` 기반 DB 초기화, `app_config` 테이블 생성
2. `src/main/cli/cli-detector.ts` — `where`/`which`로 claude/codex/gemini 감지
3. CLI 선택 화면 → 선택 시 config 저장 → main view 이동 → 자동 PTY spawn
4. 3-column 레이아웃 (LNB 240px | center flex | right 320px) + 하단 채팅 입력바

## 참고 파일

- `src/main/pty/pty-manager.ts`
- `src/renderer/components/Terminal.tsx`
- `node_modules/node-pty/prebuilds/win32-x64/`
