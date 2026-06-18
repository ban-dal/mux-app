import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

declare global {
  interface Window {
    pty: import('../../preload').PtyApi;
  }
}

type Status = 'idle' | 'running' | 'exited';

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [exitInfo, setExitInfo] = useState<{ exitCode: number; signal: number } | null>(null);

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

    const removeData = window.pty.onData((data) => term.write(data));
    const removeExit = window.pty.onExit((info) => {
      setStatus('exited');
      setExitInfo(info);
      term.write(`\r\n\x1b[90m[process exited with code ${info.exitCode}]\x1b[0m\r\n`);
    });

    const onInput = term.onData((data) => window.pty.sendInput(data));

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      const { cols, rows } = term;
      window.pty.resize(cols, rows);
    });
    observer.observe(containerRef.current);

    return () => {
      removeData();
      removeExit();
      onInput.dispose();
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  const handleSpawn = async () => {
    setStatus('running');
    setExitInfo(null);
    termRef.current?.clear();
    await window.pty.spawn();
    if (fitAddonRef.current && termRef.current) {
      fitAddonRef.current.fit();
      window.pty.resize(termRef.current.cols, termRef.current.rows);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1e1e1e' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          background: '#2d2d2d',
          borderBottom: '1px solid #3e3e3e',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#d4d4d4', fontSize: 13, fontWeight: 500 }}>Terminal</span>
        <StatusBadge status={status} exitCode={exitInfo?.exitCode} />
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={handleSpawn}
            disabled={status === 'running'}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              background: status === 'running' ? '#3e3e3e' : '#0e639c',
              color: status === 'running' ? '#888' : '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: status === 'running' ? 'default' : 'pointer',
            }}
          >
            {status === 'idle' ? 'Open Terminal' : status === 'running' ? 'Running…' : 'Reopen'}
          </button>
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', padding: '4px 0' }} />
    </div>
  );
}

function StatusBadge({ status, exitCode }: { status: Status; exitCode?: number }) {
  const colors: Record<Status, string> = {
    idle: '#888',
    running: '#4caf50',
    exited: exitCode === 0 ? '#888' : '#f44336',
  };
  const labels: Record<Status, string> = {
    idle: 'idle',
    running: 'running',
    exited: exitCode === 0 ? `exited (0)` : `exited (${exitCode})`,
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: colors[status],
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: colors[status],
          display: 'inline-block',
        }}
      />
      {labels[status]}
    </span>
  );
}
