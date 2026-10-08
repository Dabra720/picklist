import { useState, type FormEvent, type ReactNode } from 'react';
import { plainInput } from '../lib/util';
import { MAX_NAME_LENGTH } from '../types';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';

interface ConfirmProps {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Sheet title={title} onClose={onCancel} centered>
      <p className="sheet-text">{message}</p>
      <div className="button-row">
        <button type="button" className="btn" onClick={onCancel}>
          Annuleren
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}

interface NameProps {
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

/** Sheet with a single name field, used for creating and renaming. */
export function NameSheet({ title, label, placeholder, initialValue = '', submitLabel, onSubmit, onClose }: NameProps) {
  const [value, setValue] = useState(initialValue);
  const valid = value.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSubmit(value);
  };

  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>{label}</span>
          <input
            type="text"
            value={value}
            placeholder={placeholder}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            {...plainInput}
            enterKeyHint="done"
            onFocus={(event) => event.target.select()}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>
          {submitLabel}
        </button>
      </form>
    </Sheet>
  );
}

export interface MenuAction {
  label: string;
  icon: IconName;
  danger?: boolean;
  disabled?: boolean;
  run: () => void;
}

export function ActionSheet({ title, actions, onClose }: { title: string; actions: MenuAction[]; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="menu">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`menu-item${action.danger ? ' menu-item-danger' : ''}`}
            disabled={action.disabled}
            onClick={() => {
              onClose();
              action.run();
            }}
          >
            <Icon name={action.icon} />
            {action.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
