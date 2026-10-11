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

/** Words used by the sheet; projects (in tasks) use the same sheet with their own words. */
export interface LabelTexts {
  title: string;
  intro: string;
  one: string;
  newPlaceholder: string;
  deleteTitle: string;
  deleteMessage: (name: string) => string;
}

const LABEL_TEXTS: LabelTexts = {
  title: 'Labels',
  intro: 'Met labels groepeer je items, bijvoorbeeld Kleding, Elektronica of Documenten.',
  one: 'Label',
  newPlaceholder: 'Nieuw label',
  deleteTitle: 'Label verwijderen?',
  deleteMessage: (name) =>
    `De items met het label "${name}" blijven bewaard, maar hebben daarna geen label meer.`,
};

interface Props {
  labels: LabelLike[];
  itemCounts: Map<string, number>;
  actions: LabelActions;
  texts?: LabelTexts;
  onClose: () => void;
}

function LabelRow({
  label,
  one,
  onUpdate,
  onDelete,
}: {
  label: LabelLike;
  one: string;
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
        aria-label={one}
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
        aria-label={`${one} ${label.name} verwijderen`}
        onClick={onDelete}
      >
        <Icon name="trash" size={20} />
      </button>
    </li>
  );
}

export function LabelSheet({ labels, itemCounts, actions, texts = LABEL_TEXTS, onClose }: Props) {
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
    <Sheet title={texts.title} onClose={onClose}>
      {labels.length === 0 ? (
        <p className="sheet-text">{texts.intro}</p>
      ) : (
        <ul className="label-rows">
          {labels.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              one={texts.one}
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
          placeholder={texts.newPlaceholder}
          aria-label={texts.newPlaceholder}
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
          title={texts.deleteTitle}
          message={texts.deleteMessage(deleting.name)}
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
