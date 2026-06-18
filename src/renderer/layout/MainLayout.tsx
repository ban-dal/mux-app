import { useEffect, useState } from 'react';
import type { CliId } from '../../main/cli/cli-detector';
import { Terminal } from '../features/terminal/Terminal';
import { ChatInput } from '../features/chat/ChatInput';

interface Props {
  selectedCli: CliId;
  onChangeCli: () => void;
}

export function MainLayout({ selectedCli, onChangeCli }: Props) {
  const [termFocusTick, setTermFocusTick] = useState(0);
  const [chatFocusTick, setChatFocusTick] = useState(0);

  // Auto-focus: terminal on start, switch to chat once PTY output settles.
  // Trust dialog detection: while trust prompt is visible no new data flows —
  // suppress the idle timer so we don't steal focus mid-dialog.
  // Only start the idle countdown after the dialog is resolved (new data arrives).
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    let trustDialogActive = false;
    let removeDataFn: (() => void) | null = null;
    let removeExitFn: (() => void) | null = null;

    const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g;
    const TRUST_RE = /trust.*folder|safety.{0,5}check/i;

    const finish = () => {
      if (done) return;
      done = true;
      if (idleTimer) clearTimeout(idleTimer);
      removeDataFn?.();
      removeExitFn?.();
    };

    const scheduleChat = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setChatFocusTick((t) => t + 1);
        finish();
      }, 1500);
    };

    removeDataFn = window.pty.onData((data) => {
      if (done) return;
      const plain = data.replace(ANSI_RE, '');

      if (TRUST_RE.test(plain)) {
        // Trust dialog is on screen — suppress idle timer, keep terminal focused
        trustDialogActive = true;
        if (idleTimer) clearTimeout(idleTimer);
        return;
      }

      if (trustDialogActive) {
        // New data after trust dialog → user made a selection, CLI is loading
        trustDialogActive = false;
      }

      scheduleChat();
    });

    // PTY exited (e.g. user declined trust): keep terminal focused, stop watching
    removeExitFn = window.pty.onExit(() => {
      setTermFocusTick((t) => t + 1);
      finish();
    });

    return finish;
  }, []);

  return (
    <div style={styles.root}>
      {/* LNB */}
      <aside style={styles.lnb}>
        <div style={styles.lnbHeader}>
          <span style={styles.logo}>Mux</span>
        </div>
        <div style={styles.lnbBody}>
          <p style={styles.placeholder}>대화 기록</p>
          <p style={styles.placeholderSub}>MVP 2에서 구현</p>
        </div>
        <div style={styles.lnbFooter}>
          <button style={styles.changeCliBtn} onClick={onChangeCli}>
            {CLI_LABELS[selectedCli]} 변경
          </button>
        </div>
      </aside>

      {/* Center */}
      <div style={styles.center}>
        <div style={styles.terminal}>
          <Terminal autoSpawn={{}} initInput={selectedCli} focusTick={termFocusTick} />
        </div>
        <ChatInput focusTick={chatFocusTick} />
      </div>

      {/* Right panel */}
      <aside style={styles.right}>
        <div style={styles.rightHeader}>
          <span style={styles.rightTitle}>파일 / 변경사항</span>
        </div>
        <div style={styles.rightBody}>
          <p style={styles.placeholder}>파일 트리</p>
          <p style={styles.placeholderSub}>MVP 3에서 구현</p>
        </div>
      </aside>
    </div>
  );
}

const CLI_LABELS: Record<CliId, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  gemini: 'Gemini CLI',
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    height: '100vh',
    background: '#0f0f0f',
    color: '#f4f4f5',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  },

  // LNB
  lnb: {
    width: 240,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #2e2e2e',
    background: '#141414',
  },
  lnbHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid #2e2e2e',
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    color: '#f4f4f5',
    letterSpacing: -0.5,
  },
  lnbBody: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  lnbFooter: {
    padding: '12px 16px',
    borderTop: '1px solid #2e2e2e',
  },
  changeCliBtn: {
    width: '100%',
    padding: '8px 0',
    background: 'transparent',
    border: '1px solid #3a3a3a',
    borderRadius: 6,
    color: '#a1a1aa',
    fontSize: 12,
    cursor: 'pointer',
  },

  // Center
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  terminal: {
    flex: 1,
    overflow: 'hidden',
  },

  // Right
  right: {
    width: 320,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #2e2e2e',
    background: '#141414',
  },
  rightHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid #2e2e2e',
  },
  rightTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#a1a1aa',
  },
  rightBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  placeholder: {
    margin: 0,
    fontSize: 13,
    color: '#52525b',
  },
  placeholderSub: {
    margin: 0,
    fontSize: 11,
    color: '#3f3f46',
  },
};
