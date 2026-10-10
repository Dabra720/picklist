import { useState } from 'react';
import { CheckRow } from '../core/components/CheckRow';
import { ConfirmDialog } from '../core/components/dialogs';
import { Sheet } from '../core/components/Sheet';
import { syncThemeSetting } from '../core/lib/theme';
import { showToast } from '../core/lib/toast';
import {
  backupParts,
  describeCurrent,
  describeResult,
  exportBackup,
  hasContent,
  restoreBackup,
  type ImportMode,
  type ParsedBackup,
} from './backup';

const dateTime = new Intl.DateTimeFormat('nl', { dateStyle: 'long', timeStyle: 'short' });

function toggle(set: Set<string>, key: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(key);
  else next.delete(key);
  return next;
}

/** Choose which parts go into a backup, then save it. */
export function ExportSheet({ onClose }: { onClose: () => void }) {
  const parts = backupParts().filter((part) => hasContent(part.key));
  const [selected, setSelected] = useState(() => new Set(parts.map((part) => part.key)));
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      if (await exportBackup([...selected])) onClose();
    } catch (error) {
      console.error(error);
      showToast('Exporteren is mislukt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Back-up exporteren" onClose={onClose}>
      <p className="sheet-text">
        Kies wat er in de back-up komt. Bewaar het bestand bijvoorbeeld in Bestanden of iCloud
        Drive.
      </p>
      <div className="check-list">
        {parts.map((part) => (
          <CheckRow
            key={part.key}
            checked={selected.has(part.key)}
            onChange={(on) => setSelected((current) => toggle(current, part.key, on))}
            title={part.label}
            detail={describeCurrent(part.key)}
          />
        ))}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={selected.size === 0 || busy}
        onClick={() => void run()}
      >
        Exporteren
      </button>
    </Sheet>
  );
}

const MODES: { value: ImportMode; label: string; help: string }[] = [
  {
    value: 'merge',
    label: 'Samenvoegen',
    help: 'Voegt toe wat nieuw is. Staat iets al op dit apparaat, dan blijft de laatst gewijzigde versie staan. Er wordt niets verwijderd.',
  },
  {
    value: 'replace',
    label: 'Vervangen',
    help: 'De gekozen onderdelen op dit apparaat worden gewist en vervangen door de back-up.',
  },
];

/** Shows what a backup holds and restores the chosen parts by merging or replacing. */
export function ImportSheet({
  backup,
  onClose,
  onDone,
}: {
  backup: ParsedBackup;
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState(() => new Set(backup.parts.map((part) => part.key)));
  const [mode, setMode] = useState<ImportMode>('merge');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = backup.parts.filter((part) => selected.has(part.key));
  const warnings = [
    ...backup.warnings,
    ...chosen.flatMap((part) => part.warnings.map((warning) => `${part.label}: ${warning}`)),
  ];
  const help = MODES.find((option) => option.value === mode)!.help;

  const run = async () => {
    setConfirming(false);
    setBusy(true);
    setError(null);
    try {
      const result = await restoreBackup(chosen, mode);
      if (selected.has('settings')) syncThemeSetting();
      showToast(describeResult(result, mode, chosen));
      onDone();
    } catch (cause) {
      console.error(cause);
      setError('Terugzetten is mislukt. Je bestaande gegevens zijn niet gewijzigd.');
      setBusy(false);
    }
  };

  return (
    <Sheet title="Back-up terugzetten" onClose={onClose}>
      <p className="sheet-text">
        {backup.exportedAt
          ? `Gemaakt op ${dateTime.format(backup.exportedAt)}.`
          : 'Datum van de back-up onbekend.'}
      </p>

      <h3 className="section-title">Onderdelen</h3>
      <div className="check-list">
        {backup.parts.map((part) => (
          <CheckRow
            key={part.key}
            checked={selected.has(part.key)}
            onChange={(on) => setSelected((current) => toggle(current, part.key, on))}
            title={part.label}
            detail={`In back-up: ${part.summary} · Nu: ${describeCurrent(part.key)}`}
          />
        ))}
      </div>

      {warnings.length > 0 && (
        <ul className="notice-list" aria-label="Opmerkingen bij de back-up">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <h3 className="section-title">Hoe terugzetten</h3>
      <div className="segmented" role="radiogroup" aria-label="Hoe terugzetten">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={mode === option.value}
            className={mode === option.value ? 'active' : ''}
            onClick={() => setMode(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className={`sheet-text${mode === 'replace' ? ' danger-text' : ''}`}>{help}</p>

      <button
        type="button"
        className={`btn btn-block ${mode === 'replace' ? 'btn-danger' : 'btn-primary'}`}
        disabled={chosen.length === 0 || busy}
        onClick={() => (mode === 'replace' ? setConfirming(true) : void run())}
      >
        {mode === 'replace' ? 'Vervangen' : 'Samenvoegen'}
      </button>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {confirming && (
        <ConfirmDialog
          title="Gegevens vervangen?"
          message={`${chosen.map((part) => `${part.label} (nu: ${describeCurrent(part.key)})`).join(', ')} ${chosen.length === 1 ? 'wordt' : 'worden'} vervangen door de back-up. Dit kan niet ongedaan worden gemaakt.`}
          confirmLabel="Vervangen"
          danger
          onCancel={() => setConfirming(false)}
          onConfirm={() => void run()}
        />
      )}
    </Sheet>
  );
}
