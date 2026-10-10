import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { plainInput } from '../../core/lib/util';
import { MAX_NAME_LENGTH } from '../../core/types';
import { LABEL_COLORS, type LabelLike } from './types';

/** What the sheet does with labels; a list and a template each store them in their own way. */
export interface LabelActions {
  create: (name: string) => string | null;
  update: (id: string, patch: { name?: string; color?: string }) => void;
  remove: (id: string) => void;
}

interface Props {
  labels: LabelLike[];
  itemCounts: Map<string, number>;
  actions: LabelActions;
  onClose: () => void;
}

function LabelRow({
  label,
  onUpdate,
  onDelete,
}: {
  label: LabelLike;
  onUpdate: LabelActions['update'];
  onDelete: () => void;
}) {
  const [name, setName] = useState(label.name);

  // Saved when leaving the field; an emptied name falls back to the stored one.
  const save = () => {
    if (name.trim()) onUpdate(label.id, { name });
    else setName(label.name);
  };

  const nextColor = () => {
    const index = LABEL_COLORS.indexOf(label.color);
    onUpdate(label.id, { color: LABEL_COLORS[(index + 1) % LABEL_COLORS.length] });
  };

  return (
    <li className="label-row">
      <button
        type="button"
        className="icon-btn"
        aria-label={`Kleur van ${label.name} wijzigen`}
        onClick={nextColor}
      >
        <span className="dot dot-large" style={{ background: label.color }} />
      </button>
      <input
        type="text"
        value={name}
        maxLength={MAX_NAME_LENGTH}
        aria-label="Label"
        {...plainInput}
        enterKeyHint="done"
        onChange={(event) => setName(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <button
        type="button"
        className="icon-btn icon-btn-subtle"
        aria-label={`Label ${label.name} verwijderen`}
        onClick={onDelete}
      >
        <Icon name="trash" size={20} />
      </button>
    </li>
  );
}

export function LabelSheet({ labels, itemCounts, actions, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<LabelLike | null>(null);

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (actions.create(newName)) setNewName('');
  };

  const remove = (label: LabelLike) => {
    if ((itemCounts.get(label.id) ?? 0) === 0) actions.remove(label.id);
    else setDeleting(label);
  };

  return (
    <Sheet title="Labels" onClose={onClose}>
      {labels.length === 0 ? (
        <p className="sheet-text">
          Met labels groepeer je items, bijvoorbeeld Kleding, Elektronica of Documenten.
        </p>
      ) : (
        <ul className="label-rows">
          {labels.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              onUpdate={actions.update}
              onDelete={() => remove(label)}
            />
          ))}
        </ul>
      )}

      <form className="inline-form" onSubmit={add}>
        <input
          type="text"
          value={newName}
          placeholder="Nieuw label"
          aria-label="Nieuw label"
          maxLength={MAX_NAME_LENGTH}
          {...plainInput}
          enterKeyHint="done"
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
          Toevoegen
        </button>
      </form>

      {deleting && (
        <ConfirmDialog
          title="Label verwijderen?"
          message={`De items met het label "${deleting.name}" blijven bewaard, maar hebben daarna geen label meer.`}
          confirmLabel="Verwijderen"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            actions.remove(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </Sheet>
  );
}
