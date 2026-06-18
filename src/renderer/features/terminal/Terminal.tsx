import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { SpawnOptions } from '../../../main/pty/pty-manager';

type Status = 'idle' | 'running' | 'exited';

interface Props {
  /** If provided, spawn is triggered automatically on mount */
  autoSpawn?: SpawnOptions;
  /** If provided, sent to stdin immediately after the PTY spawns (e.g. 'claude') */
  initInput?: string;
}

export function Terminal({ autoSpawn, initInput }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [exitInfo, setExitInfo] = useState<{ exitCode: number; signal: number } | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // xterm.js routes keyboard input through an internal hidden textarea
    const onTermFocus = () => setIsFocused(true);
    const onTermBlur = () => setIsFocused(false);
    term.textarea?.addEventListener('focus', onTermFocus);
    term.textarea?.addEventListener('blur', onTermBlur);

    const removeData = window.pty.onData((data) => term.write(data));
    const removeExit = window.pty.onExit((info) => {
      setStatus('exited');
      setExitInfo(info);
      term.write(`\r\n\x1b[90m[process exited with code ${info.exitCode}]\x1b[0m\r\n`);
    });

    const onInput = term.onData((data) => window.pty.sendInput(data));

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      window.pty.resize(term.cols, term.rows);
    });
    observer.observe(containerRef.current);

    if (autoSpawn) {
      void doSpawn(autoSpawn, initInput);
    }

    return () => {
      term.textarea?.removeEventListener('focus', onTermFocus);
      term.textarea?.removeEventListener('blur', onTermBlur);
      removeData();
      removeExit();
      onInput.dispose();
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
    // autoSpawn is intentionally excluded — only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSpawn = async (opts?: SpawnOptions, afterInput?: string) => {
    setStatus('running');
    setExitInfo(null);
    termRef.current?.clear();
    await window.pty.spawn(opts);
    if (fitAddonRef.current && termRef.current) {
      fitAddonRef.current.fit();
      window.pty.resize(termRef.current.cols, termRef.current.rows);
    }
    if (afterInput) {
      window.pty.sendInput(afterInput + '\r');
    }
  };

  const focusTerminal = () => termRef.current?.focus();

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}
      onClick={focusTerminal}
    >
      <div style={{ ...styles.header, borderBottom: isFocused ? '1px solid #3b82f6' : '1px solid #3e3e3e' }}>
        <span style={styles.headerTitle}>Terminal</span>
        <StatusBadge status={status} exitCode={exitInfo?.exitCode} />
        <button
          onClick={() => void doSpawn(autoSpawn, initInput)}
          disabled={status === 'running'}
          style={{
            ...styles.spawnBtn,
            ...(status === 'running' ? styles.spawnBtnDisabled : {}),
          }}
        >
          {status === 'idle' ? 'Open' : status === 'running' ? 'Running…' : 'Reopen'}
        </button>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', padding: '4px 0', cursor: 'text' }} />
    </div>
  );
}

function StatusBadge({ status, exitCode }: { status: Status; exitCode?: number }) {
  const color =
    status === 'running' ? '#4caf50' : status === 'exited' && exitCode !== 0 ? '#f44336' : '#888';
  const label =
    status === 'idle' ? 'idle' : status === 'running' ? 'running' : `exited (${exitCode ?? 0})`;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    background: '#2d2d2d',
    flexShrink: 0,
  },
  headerTitle: {
    color: '#d4d4d4',
    fontSize: 13,
    fontWeight: 500,
    flex: 1,
  },
  spawnBtn: {
    padding: '4px 10px',
    fontSize: 12,
    background: '#0e639c',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  spawnBtnDisabled: {
    background: '#3e3e3e',
    color: '#888',
    cursor: 'default',
  },
};
