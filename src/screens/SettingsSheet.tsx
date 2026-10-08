import { useRef, useState, type ChangeEvent } from 'react';
import { ConfirmDialog } from '../components/dialogs';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { useTheme, type Theme } from '../lib/theme';
import { showToast } from '../lib/toast';
import { exportBackup, parseBackup } from '../store/backup';
import { importData, useAppState } from '../store/store';
import type { AppData } from '../types';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Systeem' },
  { value: 'light', label: 'Licht' },
  { value: 'dark', label: 'Donker' },
];

// Refuse absurdly large files before reading them into memory.
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { data } = useAppState();
  const [theme, setTheme] = useTheme();
  const [pending, setPending] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const runImport = async (imported: AppData) => {
    setPending(null);
    try {
      await importData(imported);
      showToast(`Back-up teruggezet: ${imported.lists.length} ${imported.lists.length === 1 ? 'lijst' : 'lijsten'}.`);
      onClose();
    } catch (cause) {
      console.error(cause);
      setError('Terugzetten is mislukt. Je bestaande gegevens zijn niet gewijzigd.');
    }
  };

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
      if (!result.ok) {
        setError(result.error);
      } else if (data.lists.length === 0) {
        await runImport(result.data);
      } else {
        setPending(result.data);
      }
    } catch (cause) {
      console.error(cause);
      setError('Het bestand kon niet worden gelezen.');
    }
  };

  const onExport = async () => {
    try {
      await exportBackup(data);
    } catch (cause) {
      console.error(cause);
      showToast('Exporteren is mislukt.');
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

      <h3 className="section-title">Back-up</h3>
      <p className="sheet-text">
        Je lijsten staan alleen op dit apparaat. Ze kunnen verdwijnen als je de app of de
        websitegegevens verwijdert, of als het systeem opslagruimte vrijmaakt. Bewaar daarom af en
        toe een back-up.
      </p>
      <div className="menu">
        <button type="button" className="menu-item" onClick={onExport} disabled={data.lists.length === 0}>
          <Icon name="download" />
          Back-up exporteren
        </button>
        <button type="button" className="menu-item" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" />
          Back-up terugzetten
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={onFile}
      />
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {pending && (
        <ConfirmDialog
          title="Gegevens overschrijven?"
          message={
            <>
              Je huidige {data.lists.length} {data.lists.length === 1 ? 'lijst wordt' : 'lijsten worden'}{' '}
              vervangen door {pending.lists.length}{' '}
              {pending.lists.length === 1 ? 'lijst' : 'lijsten'} uit de back-up. Dit kan niet ongedaan
              worden gemaakt.
            </>
          }
          confirmLabel="Overschrijven"
          danger
          onConfirm={() => void runImport(pending)}
          onCancel={() => setPending(null)}
        />
      )}
    </Sheet>
  );
}
