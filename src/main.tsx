import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { applyTheme } from './lib/theme';
import { initStore } from './store/store';
import './styles.css';

applyTheme();
void initStore();

// Caches the app shell for offline use and picks up new versions automatically.
// The service worker only touches cached files, never the data in IndexedDB.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
