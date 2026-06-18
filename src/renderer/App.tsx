import { useEffect, useState } from 'react';
import type { CliId } from '../main/cli/cli-detector';
import { CliSelect } from './features/setup/CliSelect';
import { MainLayout } from './layout/MainLayout';

type View = 'loading' | 'select' | 'main';

const CLI_IDS: CliId[] = ['claude', 'codex', 'gemini'];

function isCliId(value: string): value is CliId {
  return (CLI_IDS as string[]).includes(value);
}

export function App() {
  const [view, setView] = useState<View>('loading');
  const [selectedCli, setSelectedCli] = useState<CliId | null>(null);

  useEffect(() => {
    window.muxApp
      .getConfig('selected_cli')
      .then((saved) => {
        if (saved && isCliId(saved)) {
          setSelectedCli(saved);
          setView('main');
        } else {
          setView('select');
        }
      })
      .catch(() => setView('select'));
  }, []);

  const handleSelect = (cli: CliId) => {
    setSelectedCli(cli);
    setView('main');
  };

  const handleChangeCli = () => {
    setView('select');
  };

  if (view === 'loading') {
    return <div style={styles.loading}>로딩 중…</div>;
  }

  if (view === 'select') {
    return <CliSelect onSelect={handleSelect} />;
  }

  return <MainLayout selectedCli={selectedCli!} onChangeCli={handleChangeCli} />;
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f0f0f',
    color: '#52525b',
    fontSize: 13,
  },
};
