import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../core/components/Icon';
import { navigate } from '../core/router';
import { MODULES } from '../modules';
import { SettingsSheet } from './SettingsSheet';

/**
 * The menu button for the top bar of a main screen, with its side menu and the settings.
 * `current` is the id of the module the screen belongs to.
 */
export function MenuButton({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" />
      </button>
      {/* Rendered at the body: the sticky top bar would otherwise trap them below the bottom bar. */}
      {open &&
        createPortal(
          <Drawer
            current={current}
            onClose={() => setOpen(false)}
            onSettings={() => {
              setOpen(false);
              setSettings(true);
            }}
          />,
          document.body,
        )}
      {settings &&
        createPortal(<SettingsSheet onClose={() => setSettings(false)} />, document.body)}
    </>
  );
}

function Drawer({
  current,
  onClose,
  onSettings,
}: {
  current: string;
  onClose: () => void;
  onSettings: () => void;
}) {
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.classList.add('no-scroll');
    panel.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('no-scroll');
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="drawer-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <nav ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="drawer-head">
          <span className="drawer-title">Menu</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Menu sluiten">
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
                onClose();
                if (module.id !== current) navigate(module.home);
              }}
            >
              <Icon name={module.icon} />
              {module.label}
            </button>
          ))}
        </div>
        <div className="drawer-foot menu">
          <button type="button" className="menu-item" onClick={onSettings}>
            <Icon name="settings" />
            Instellingen
          </button>
        </div>
      </nav>
    </div>
  );
}
