import { useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '../core/components/Icon';
import { Sheet } from '../core/components/Sheet';
import { useTheme, type Theme } from '../core/lib/theme';
import { getSetting, useAppState } from '../core/store';
import { MODULES } from '../modules';
import { setTab, useTabs } from './navigation';
import {
  backupParts,
  hasContent,
  LAST_BACKUP_SETTING,
  parseBackup,
  type ParsedBackup,
} from './backup';
import { ExportSheet, ImportSheet } from './BackupSheets';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Systeem' },
  { value: 'light', label: 'Licht' },
  { value: 'dark', label: 'Donker' },
];

// Refuse absurdly large files before reading them into memory.
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

const dateFormat = new Intl.DateTimeFormat('nl', { dateStyle: 'long' });

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  // Re-render when data changes, so the backup options stay up to date.
  useAppState();
  const [theme, setTheme] = useTheme();
  const tabs = useTabs();
  const [exporting, setExporting] = useState(false);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const lastBackup = getSetting<number>(LAST_BACKUP_SETTING);
  const anythingToExport = backupParts().some((part) => hasContent(part.key));

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMPORT_BYTES) {
      setError('Dit bestand is te groot om een back-up van Paklijsten te zijn.');
      return;
    }
    try {
      const result = parseBackup(await file.text());
      if (result.ok) setParsed(result.backup);
      else setError(result.error);
    } catch (cause) {
      console.error(cause);
      setError('Het bestand kon niet worden gelezen.');
    }
  };

  return (
    <Sheet title="Instellingen" onClose={onClose}>
      <h3 className="section-title">Weergave</h3>
      <div className="segmented" role="radiogroup" aria-label="Thema">
        {THEMES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={theme === option.value}
            className={theme === option.value ? 'active' : ''}
            onClick={() => setTheme(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <h3 className="section-title">Tabbalk</h3>
      <p className="sheet-text">
        Kies de vier onderdelen onderaan het scherm. De rest staat onder Meer.
      </p>
      <div className="tab-slots">
        {tabs.map((id, slot) => (
          <select
            key={slot}
            className="select"
            aria-label={`Tab ${slot + 1}`}
            value={id}
            onChange={(event) => setTab(tabs, slot, event.target.value)}
          >
            {MODULES.map((module) => (
              <option key={module.id} value={module.id}>
                {module.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      <h3 className="section-title">Back-up</h3>
      <p className="sheet-text">
        Je gegevens staan alleen op dit apparaat. Ze kunnen verdwijnen als je de app of de
        websitegegevens verwijdert, of als het systeem opslagruimte vrijmaakt. Bewaar daarom af en
        toe een back-up.{' '}
        <strong className="last-backup">
          {lastBackup
            ? `Laatste volledige back-up: ${dateFormat.format(lastBackup)}.`
            : 'Nog geen volledige back-up gemaakt.'}
        </strong>
      </p>
      <div className="menu">
        <button
          type="button"
          className="menu-item"
          onClick={() => setExporting(true)}
          disabled={!anythingToExport}
        >
          <Icon name="download" />
          Back-up exporteren
        </button>
        <button type="button" className="menu-item" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" />
          Back-up terugzetten
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {exporting && <ExportSheet onClose={() => setExporting(false)} />}
      {parsed && (
        <ImportSheet
          backup={parsed}
          onClose={() => setParsed(null)}
          onDone={() => {
            setParsed(null);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
