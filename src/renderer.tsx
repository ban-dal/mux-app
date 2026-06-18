import { createRoot } from 'react-dom/client';
import { Terminal } from './renderer/components/Terminal';

function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        style={{
          padding: '8px 16px',
          background: '#2d2d2d',
          borderBottom: '1px solid #3e3e3e',
          fontSize: 13,
          color: '#9ca3af',
          flexShrink: 0,
        }}
      >
        Mux — MVP 0: PTY Terminal Spike
      </header>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Terminal />
      </div>
    </div>
  );
}

createRoot(document.querySelector('#root') as HTMLElement).render(<App />);
