import { useRef, useState, type ChangeEvent } from 'react';
import { ConfirmDialog } from '../core/components/dialogs';
import { Icon } from '../core/components/Icon';
import { Sheet } from '../core/components/Sheet';
import { useTheme, type Theme } from '../core/lib/theme';
import { showToast } from '../core/lib/toast';
import { exportBackup, parseBackup } from './backup';
import { importData, useAppState } from '../core/store';
import type { AppData } from '../core/types';

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Systeem' },
  { value: 'light', label: 'Licht' },
  { value: 'dark', label: 'Donker' },
];

// Refuse absurdly large files before reading them into memory.
const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

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
      showToast(`Back-up teruggezet: ${count(imported.lists.length, 'lijst', 'lijsten')}, ${count(imported.notes.length, 'notitie', 'notities')}.`);
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
      } else {
        // Backups from before notes existed leave the notes on this device in place.
        const imported = result.notesIncluded ? result.data : { ...result.data, notes: data.notes };
        if (data.lists.length === 0 && data.notes.length === 0) await runImport(imported);
        else setPending(imported);
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
        Je lijsten en notities staan alleen op dit apparaat. Ze kunnen verdwijnen als je de app of de
        websitegegevens verwijdert, of als het systeem opslagruimte vrijmaakt. Bewaar daarom af en
        toe een back-up.
      </p>
      <div className="menu">
        <button
          type="button"
          className="menu-item"
          onClick={onExport}
          disabled={data.lists.length === 0 && data.notes.length === 0}
        >
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
            pending.notes === data.notes
              ? `Je huidige ${count(data.lists.length, 'lijst wordt', 'lijsten worden')} vervangen door ${count(pending.lists.length, 'lijst', 'lijsten')} uit de back-up. Je notities blijven staan. Dit kan niet ongedaan worden gemaakt.`
              : `Je huidige ${count(data.lists.length, 'lijst', 'lijsten')} en ${count(data.notes.length, 'notitie', 'notities')} worden vervangen door ${count(pending.lists.length, 'lijst', 'lijsten')} en ${count(pending.notes.length, 'notitie', 'notities')} uit de back-up. Dit kan niet ongedaan worden gemaakt.`
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
