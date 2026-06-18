import { createRoot } from 'react-dom/client';
import { App } from './renderer/App';

createRoot(document.querySelector('#root') as HTMLElement).render(<App />);
