import { useEffect, useState } from 'react';
import type { CliInfo, CliId } from '../../../main/cli/cli-detector';

interface Props {
  onSelect: (cli: CliId) => void;
}

export function CliSelect({ onSelect }: Props) {
  const [clis, setClis] = useState<CliInfo[]>([]);
  const [selected, setSelected] = useState<CliId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.muxApp
      .detectClis()
      .then((result) => {
        setClis(result);
        const first = result.find((c) => c.available);
        if (first) setSelected(first.id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleContinue = async () => {
    if (!selected) return;
    await window.muxApp.setConfig('selected_cli', selected);
    onSelect(selected);
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.title}>Mux</h1>
        <p style={styles.subtitle}>AI 코딩 에이전트를 선택하세요</p>

        {loading ? (
          <p style={styles.hint}>감지 중…</p>
        ) : (
          <>
            <div style={styles.grid}>
              {clis.map((cli) => (
                <button
                  key={cli.id}
                  style={{
                    ...styles.cliCard,
                    ...(selected === cli.id ? styles.cliCardSelected : {}),
                    ...(cli.available ? {} : styles.cliCardDisabled),
                  }}
                  disabled={!cli.available}
                  onClick={() => setSelected(cli.id)}
                >
                  <span style={styles.cliLabel}>{cli.label}</span>
                  <span
                    style={cli.available ? styles.badgeAvailable : styles.badgeUnavailable}
                  >
                    {cli.available ? '사용 가능' : '설치 필요'}
                  </span>
                  {cli.path && <span style={styles.cliPath}>{cli.path}</span>}
                </button>
              ))}
            </div>

            {clis.every((c) => !c.available) && (
              <p style={styles.warn}>
                claude, codex, gemini 중 하나를 먼저 설치해주세요.
              </p>
            )}

            <button
              style={{
                ...styles.continueBtn,
                ...(selected ? {} : styles.continueBtnDisabled),
              }}
              disabled={!selected}
              onClick={() => void handleContinue()}
            >
              계속
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f0f0f',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    padding: '48px 40px',
    background: '#1a1a1a',
    border: '1px solid #2e2e2e',
    borderRadius: 12,
    width: 480,
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    color: '#f4f4f5',
    letterSpacing: -1,
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: '#71717a',
  },
  hint: {
    color: '#52525b',
    fontSize: 13,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  cliCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: '#242424',
    border: '1px solid #3a3a3a',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.1s',
  },
  cliCardSelected: {
    border: '1px solid #3b82f6',
    background: '#1e3a5f',
  },
  cliCardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  cliLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: '#f4f4f5',
  },
  badgeAvailable: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 500,
    background: '#166534',
    color: '#86efac',
  },
  badgeUnavailable: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 500,
    background: '#3f3f46',
    color: '#71717a',
  },
  cliPath: {
    fontSize: 11,
    color: '#52525b',
    fontFamily: 'monospace',
    marginLeft: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 180,
  },
  warn: {
    fontSize: 13,
    color: '#f59e0b',
    textAlign: 'center',
    margin: 0,
  },
  continueBtn: {
    width: '100%',
    padding: '12px 0',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  continueBtnDisabled: {
    background: '#27272a',
    color: '#52525b',
    cursor: 'not-allowed',
  },
};
