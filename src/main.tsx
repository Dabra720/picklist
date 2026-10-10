import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { applyTheme, syncThemeSetting } from './core/lib/theme';
import { trackVisualViewport } from './core/lib/viewport';
import { configureStore, initStore } from './core/store';
import { MODULES } from './modules';
import './styles.css';

applyTheme();
trackVisualViewport();
configureStore(MODULES.flatMap((module) => module.loadHooks ?? []));
void initStore().then(syncThemeSetting);

// Caches the app shell for offline use and picks up new versions automatically.
// The service worker only touches cached files, never the data in IndexedDB.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
