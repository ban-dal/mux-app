# Local-First Agent Desktop Design

> 이 문서는 `cmux`의 멀티 에이전트 실행/관찰 경험과 Codex/Claude Desktop 계열의 데스크톱 UX를 결합한 개인용 로컬-first 앱의 장기 설계 기준이다.

## 목표

개인 개발자가 로컬 머신에서 여러 AI 코딩 에이전트 작업을 생성, 관찰, 승인, 기록, 재개할 수 있는 데스크톱 앱을 만든다.

핵심 UX 원칙은 두 가지다.

- 메인 모델과 서브에이전트의 실시간 telemetry는 Ghostty 기반 터미널 경험으로 보여준다.
- 작업 생성, 승인, diff, 플랜, 로그, 검색, 설정, 외부 도구 연결은 앱의 GUI 기능으로 제공한다.

초기 제품은 개인용 로컬-first 앱으로 제한한다. 팀 협업, 원격 실행, 멀티유저 권한은 후속 진화 지점으로만 설계 여지를 남긴다.

## 비목표

- MVP 0-3에서는 클라우드 동기화, 팀 워크스페이스, 서버 기반 실행 큐를 만들지 않는다.
- MVP 0-2에서는 모든 AI provider를 추상화하지 않는다. 우선 Codex CLI와 Claude Code 계열 로컬 실행 흐름을 검증한다.
- MVP 0-3에서는 IDE 전체를 재구현하지 않는다. 파일 편집은 기존 에디터와 Git 기반 diff를 활용한다.
- Ghostty를 완전히 앱 내부 컴포넌트처럼 재구현하지 않는다. 처음에는 실행, focus, 탭/창 매핑, 로그 캡처 가능성을 검증한다.

## 제품 판단 기준

이 앱이 잘 작동한다는 뜻은 다음과 같다.

- 사용자는 GUI에서 작업을 만들고, 터미널에서 에이전트가 실제로 움직이는 모습을 본다.
- 각 작업은 시작 이유, 사용한 모델/명령, 변경 파일, 검증 결과, 남은 위험을 남긴다.
- 실패한 작업은 왜 실패했는지 확인하고 같은 맥락으로 재시도할 수 있다.
- 긴 작업은 중간에 앱을 닫아도 다시 열어 이어갈 수 있다.
- 위험한 행동은 명시적 승인 게이트를 거친다.

## 기본 아키텍처

앱은 로컬 데스크톱 shell, 실행 오케스트레이터, telemetry 수집기, 영속 저장소, GUI renderer로 나눈다.

- Desktop shell: 앱 창, 메뉴, deep link, local file permission, OS별 통합을 맡는다.
- Agent runner: Codex, Claude Code, shell command, future provider를 실행하고 lifecycle을 관리한다.
- Terminal bridge: Ghostty 세션을 만들고 작업/에이전트/터미널 pane 사이의 mapping을 유지한다.
- Telemetry collector: stdout/stderr, tool calls, token usage, command events, file changes, exit status를 수집한다.
- Local store: 작업, 세션, 에이전트, 이벤트, approval, artifact, completion record를 저장한다.
- GUI renderer: 작업 보드, detail view, diff, 승인, 로그, 검색, 설정 화면을 제공한다.

## 핵심 도메인 모델

### Workspace

로컬 프로젝트 루트 하나를 나타낸다. Git 상태, 허용된 명령 정책, provider 설정, 기록 위치를 포함한다.

### Task

사용자가 GUI에서 만든 작업 단위다. 하나의 목표, 상태, 관련 workspace, 생성 프롬프트, 실행 이력을 가진다.

상태:

- Draft: 아직 실행 전
- Ready: 실행 가능
- Running: 메인 에이전트 또는 서브에이전트 실행 중
- Needs Approval: 사용자 승인 대기
- Blocked: 외부 입력 없이는 진행 불가
- Failed: 실행 실패
- Completed: 완료 기록 작성 완료
- Archived: 보관됨

### Agent Session

특정 task 안에서 실행된 모델 프로세스다. main 또는 subagent 역할을 가진다.

### Terminal Session

Ghostty 세션 또는 pane과 앱의 agent session을 연결하는 객체다. terminal id, process id, command, cwd, start/end time, scrollback/export path를 기록한다.

### Telemetry Event

시간순 append-only event다. status change, command start/end, tool call, approval request, file touch, token usage, model message, error를 포함한다.

### Completion Record

MVP 또는 task 완료 시 남기는 사람이 읽는 기록이다. 변경 요약, 결정, 검증, 남은 위험, 다음 시작 지점을 포함한다.

## UX 구조

### 첫 화면

랜딩 페이지가 아니라 작업대가 첫 화면이다.

- 왼쪽: workspace/task navigation
- 가운데: task board 또는 selected task detail
- 오른쪽 또는 하단: terminal/telemetry/diff/log 탭
- 상단 command bar: 새 작업, 실행, 중지, 승인, 검색

### 작업 생성

사용자는 GUI에서 다음을 입력한다.

- 목표
- 대상 workspace
- 실행 모델 또는 runner
- 허용할 권한 수준
- optional: 참조 파일, 기존 plan, completion record

앱은 실행 전에 "작업 카드"를 만든다. 실행은 별도 버튼으로 시작한다.

### 실행 관찰

실시간 에이전트 출력은 Ghostty terminal에서 본다. GUI는 terminal을 대체하지 않고, 구조화된 상태만 보강한다.

- 현재 단계
- 마지막 이벤트
- 실행 시간
- 변경 감지 파일
- approval 대기 여부
- subagent 목록

### 승인 게이트

다음 행동은 GUI 승인 이벤트로 남긴다.

- 네트워크 접근
- package install
- destructive file operation
- git commit
- git push
- PR 생성
- 외부 앱/커넥터 write action

### 완료 기록

작업 완료 버튼은 단순 상태 변경이 아니다. 앱은 completion record 초안을 만들고 사용자가 저장한다.

완료 기록은 다음 실행의 입력으로 다시 사용될 수 있어야 한다.

## MVP 로드맵 요약

### MVP 0: Feasibility Spine

목표: 앱 런타임, Ghostty 연동, 로컬 저장소, runner skeleton이 한 흐름으로 연결되는지 검증한다.

완료 기준:

- 샘플 workspace를 등록할 수 있다.
- GUI에서 task를 만들 수 있다.
- runner가 더미 command를 실행한다.
- Ghostty 또는 대체 terminal adapter가 실행 결과를 보여준다.
- task/event가 로컬 저장소에 남는다.
- completion record template이 존재한다.

### MVP 1: Single Main Agent

목표: 하나의 Codex/Claude 계열 main agent 작업을 GUI에서 시작하고 기록한다.

완료 기준:

- 실제 agent command를 workspace cwd에서 실행한다.
- 실행 상태가 GUI에 반영된다.
- terminal session과 task가 연결된다.
- exit code, duration, touched files, log path가 저장된다.
- 완료 기록을 생성한다.

### MVP 2: Subagent Telemetry

목표: main agent와 subagent를 구분해 관찰하고 기록한다.

완료 기준:

- agent session role이 main/subagent로 저장된다.
- subagent별 terminal/log view가 열린다.
- event timeline에서 어떤 agent가 무엇을 했는지 구분된다.
- 실패한 subagent를 개별적으로 재실행할 수 있다.

### MVP 3: cmux-Style Task Board

목표: 여러 작업을 동시에 관리하고 비교한다.

완료 기준:

- task board에서 상태별 filtering이 가능하다.
- 동시에 여러 task 실행 상태를 볼 수 있다.
- 실패/blocked/completed task가 명확히 분리된다.
- task detail에서 prompt, terminal, events, files, completion record를 볼 수 있다.

### MVP 4: Desktop Workflow GUI

목표: terminal 밖의 기능을 GUI로 충분히 편하게 만든다.

완료 기준:

- diff view가 있다.
- approval queue가 있다.
- plan/spec/log viewer가 있다.
- 작업 검색과 재개가 가능하다.
- 설정 화면에서 runner/provider/policy를 관리한다.

### MVP 5: Provider and Connector Layer

목표: Codex/Claude 외 runner와 외부 도구를 연결할 수 있는 확장점을 만든다.

완료 기준:

- runner adapter interface가 안정화된다.
- connector action은 read/write/approval policy로 구분된다.
- GitHub PR, issue, check summary 같은 기능을 GUI에서 볼 수 있다.
- connector write action은 approval과 audit event를 남긴다.

### MVP 6: Long-Term Memory and Replay

목표: 장기 사용자가 과거 작업을 검색, 재사용, 회귀 검증할 수 있게 한다.

완료 기준:

- completion record와 event를 검색할 수 있다.
- 작업 템플릿을 만들 수 있다.
- 실패 패턴과 해결 기록을 재사용할 수 있다.
- 같은 task를 새 branch/workspace에서 replay할 수 있다.

### MVP 7: Team-Ready Evolution

목표: 개인용 로컬-first 구조를 유지하면서 팀 기능으로 확장할 수 있는 경계를 만든다.

완료 기준:

- workspace export/import가 가능하다.
- task/completion record를 공유 가능한 artifact로 내보낸다.
- audit log schema가 멀티유저 필드를 수용한다.
- remote runner는 실험 플래그 뒤에 둔다.

## 기술 선택 초안

초기 추천은 Electron + React + TypeScript + SQLite다.

이유:

- 데스크톱 GUI와 Node 기반 process orchestration을 빠르게 연결할 수 있다.
- Codex/Claude CLI, Git, shell, local files와의 통합이 단순하다.
- SQLite로 local-first event store를 안정적으로 만들 수 있다.
- React 기반 GUI에서 board, diff, settings, viewer를 빠르게 구현할 수 있다.

대안:

- Tauri: 배포 크기와 native 감각은 좋지만 process/terminal/Node ecosystem 연동이 더 까다로울 수 있다.
- Native Swift/Kotlin/C#: OS 품질은 좋지만 cross-platform과 AI tooling 실험 속도가 느리다.

## 중요한 열린 질문

- Ghostty를 앱 내부에 embed할 수 있는가, 아니면 companion terminal로 제어해야 하는가?
- Windows, macOS, Linux 중 1차 타겟 OS는 무엇인가?
- Codex와 Claude를 같은 방식으로 실행할 수 있는 최소 adapter boundary는 어디인가?
- terminal scrollback을 얼마나 구조화된 telemetry로 변환할 것인가?
- completion record는 프로젝트 파일로 남길 것인가, 앱 내부 DB에만 저장할 것인가, 둘 다 할 것인가?

## 초기 결정

- 개인용 local-first를 우선한다.
- GUI는 terminal을 대체하지 않고, terminal 주변의 상태/승인/기록/검색을 맡는다.
- event store는 append-only로 설계한다.
- completion record는 사람이 읽는 Markdown artifact로 남긴다.
- 팀 기능은 MVP 7 전까지 구현하지 않는다.
