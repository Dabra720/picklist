import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/components/Icon';
import { navigate, useRoute } from '../core/router';
import { moduleFor, MODULES } from '../modules';
import { closeOverlay, openMenu, openSettings, useOverlay } from './navigation';
import { SettingsSheet } from './SettingsSheet';

/** The ☰ button for the top bar of a main screen. On phones the tab bar's "Meer" replaces it. */
export function MenuButton(_props: { current: string }) {
  const overlay = useOverlay();
  return (
    <button
      type="button"
      className="icon-btn menu-button"
      aria-label="Menu"
      aria-haspopup="dialog"
      aria-expanded={overlay === 'menu'}
      onClick={openMenu}
    >
      <Icon name="menu" />
    </button>
  );
}

/** The side menu and the settings sheet, rendered once for the whole app. */
export function AppMenuHost() {
  const overlay = useOverlay();
  const route = useRoute();
  const current = moduleFor(route.segment).id;
  // Rendered at the body: the sticky top bar would otherwise trap them below the bottom bar.
  if (overlay === 'menu') return createPortal(<Drawer current={current} />, document.body);
  if (overlay === 'settings')
    return createPortal(<SettingsSheet onClose={closeOverlay} />, document.body);
  return null;
}

function Drawer({ current }: { current: string }) {
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    panel.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlay();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      className="drawer-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeOverlay();
      }}
    >
      <nav ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="drawer-head">
          <span className="drawer-title">Menu</span>
          <button
            type="button"
            className="icon-btn"
            onClick={closeOverlay}
            aria-label="Menu sluiten"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="menu">
          {MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`menu-item${module.id === current ? ' menu-item-current' : ''}`}
              aria-current={module.id === current ? 'page' : undefined}
              onClick={() => {
                closeOverlay();
                if (module.id !== current) navigate(module.home);
              }}
            >
              <Icon name={module.icon} />
              {module.label}
            </button>
          ))}
        </div>
        <div className="drawer-foot menu">
          <button type="button" className="menu-item" onClick={openSettings}>
            <Icon name="settings" />
            Instellingen
          </button>
        </div>
      </nav>
    </div>
  );
}
