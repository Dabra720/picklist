import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { goHome, goNotes } from '../lib/route';
import { SettingsSheet } from '../screens/SettingsSheet';
import { Icon, type IconName } from './Icon';

export type Section = 'lists' | 'notes';

const SECTIONS: { id: Section; label: string; icon: IconName; go: () => void }[] = [
  { id: 'lists', label: 'Paklijsten', icon: 'checklist', go: goHome },
  { id: 'notes', label: 'Notities', icon: 'note', go: goNotes },
];

/** The menu button for the top bar of a main screen, with its side menu and the settings. */
export function MenuButton({ current }: { current: Section }) {
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
  current: Section;
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
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`menu-item${section.id === current ? ' menu-item-current' : ''}`}
              aria-current={section.id === current ? 'page' : undefined}
              onClick={() => {
                onClose();
                if (section.id !== current) section.go();
              }}
            >
              <Icon name={section.icon} />
              {section.label}
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
