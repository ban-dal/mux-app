import { useRef, useState } from 'react';

export function ChatInput() {
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const text = value.trim();
    if (!text) return;
    window.pty.sendInput(text + '\n');
    setValue('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div
      style={{
        ...styles.root,
        borderTop: isFocused ? '1px solid #3b82f6' : '1px solid #2e2e2e',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        style={styles.textarea}
        value={value}
        placeholder="메시지 입력 (Enter 전송, Shift+Enter 줄바꿈)"
        rows={2}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <button
        style={{ ...styles.sendBtn, ...(value.trim() ? {} : styles.sendBtnDisabled) }}
        disabled={!value.trim()}
        onClick={send}
      >
        전송
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    gap: 8,
    padding: '10px 12px',
    background: '#1a1a1a',
    borderTop: '1px solid #2e2e2e',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: 'none',
    background: '#242424',
    border: '1px solid #3a3a3a',
    borderRadius: 6,
    color: '#f4f4f5',
    fontSize: 13,
    padding: '8px 10px',
    lineHeight: 1.5,
    outline: 'none',
    fontFamily: 'system-ui, sans-serif',
  },
  sendBtn: {
    padding: '0 16px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    alignSelf: 'flex-end',
    height: 36,
  },
  sendBtnDisabled: {
    background: '#27272a',
    color: '#52525b',
    cursor: 'not-allowed',
  },
};
