import { useEffect, useId, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Centred dialog instead of a bottom sheet (used for confirmations). */
  centered?: boolean;
}

// Sheets can stack (a confirmation on top of a sheet); only the top one reacts to Escape.
const openSheets: string[] = [];

/** Bottom sheet on phones, centred dialog on wide screens. */
export function Sheet({ title, onClose, children, centered }: Props) {
  const titleId = useId();

  useEffect(() => {
    openSheets.push(titleId);
    document.body.classList.add('no-scroll');
    return () => {
      openSheets.splice(openSheets.indexOf(titleId), 1);
      if (openSheets.length === 0) document.body.classList.remove('no-scroll');
    };
  }, [titleId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openSheets[openSheets.length - 1] === titleId) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, titleId]);

  return (
    <div
      className={`sheet-backdrop${centered ? ' sheet-centered' : ''}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          {!centered && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten">
              <Icon name="close" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
