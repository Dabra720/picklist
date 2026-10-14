import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { plainInput } from '../../core/lib/util';
import { MAX_NAME_LENGTH } from '../../core/types';
import { labelTree, type TreeEntry } from './labelTree';
import { LABEL_COLORS, type LabelLike } from './types';

/** What the sheet does with labels; a list and a template each store them in their own way. */
export interface LabelActions {
  /** `parentId` is only passed when the sheet offers sublabels. */
  create: (name: string, parentId?: string | null) => string | null;
  update: (id: string, patch: { name?: string; color?: string; parentId?: string | null }) => void;
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
  /** Offers sublabels (one level deep); used by lists and templates. */
  nested?: boolean;
  onClose: () => void;
}

/** Labels with an order, as the tree helpers need; the sheet gets them already sorted. */
type Sorted = LabelLike & { order: number };

function LabelRow({
  entry,
  one,
  nested,
  parents,
  onUpdate,
  onDelete,
  onAddChild,
}: {
  entry: TreeEntry<Sorted>;
  one: string;
  nested: boolean;
  /** Top-level labels this label could be moved under. */
  parents: Sorted[];
  onUpdate: LabelActions['update'];
  onDelete: () => void;
  onAddChild: (name: string) => boolean;
}) {
  const { label } = entry;
  const [name, setName] = useState(label.name);

  // Saved when leaving the field; an emptied name falls back to the stored one.
  const save = () => {
    if (name.trim()) onUpdate(label.id, { name });
    else setName(label.name);
  };

  // Tapping the dot shows every colour at once, so one tap picks the one you want.
  const [picking, setPicking] = useState(false);
  const pickerId = `label-colors-${label.id}`;

  const pickColor = (color: string) => {
    if (color !== label.color) onUpdate(label.id, { color });
    setPicking(false);
  };

  const [adding, setAdding] = useState(false);
  const [childName, setChildName] = useState('');
  const addChild = (event: FormEvent) => {
    event.preventDefault();
    if (onAddChild(childName)) setChildName('');
  };

  // A label with sublabels stays top-level: labels go one level deep.
  const canMove = nested && entry.children.length === 0 && parents.length > 0;
  const currentParent = entry.parent?.id ?? '';

  return (
    <li className={`label-item${entry.depth === 1 ? ' label-item-child' : ''}`}>
      <div className="label-row">
        <button
          type="button"
          className="icon-btn"
          aria-label={
            canMove ? `Kleur en plaats van ${label.name} wijzigen` : `Kleur van ${label.name} wijzigen`
          }
          aria-expanded={picking}
          aria-controls={pickerId}
          onClick={() => setPicking((open) => !open)}
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
        {nested && entry.depth === 0 && (
          <button
            type="button"
            className="icon-btn icon-btn-subtle"
            aria-label={`Sublabel toevoegen aan ${label.name}`}
            aria-expanded={adding}
            onClick={() => setAdding((open) => !open)}
          >
            <Icon name="plus" size={20} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn icon-btn-subtle"
          aria-label={`${one} ${label.name} verwijderen`}
          onClick={onDelete}
        >
          <Icon name="trash" size={20} />
        </button>
      </div>
      {picking && canMove && (
        <label className="label-parent">
          <span>Valt onder</span>
          <select
            className="select"
            value={currentParent}
            onChange={(event) => {
              onUpdate(label.id, { parentId: event.target.value || null });
              setPicking(false);
            }}
          >
            <option value="">Geen (hoofdlabel)</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {picking && (
        <div
          id={pickerId}
          className="color-row label-colors"
          role="radiogroup"
          aria-label={`Kleur van ${label.name}`}
        >
          {LABEL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={label.color === color}
              aria-label={`Kleur ${color}`}
              className={`color-swatch${label.color === color ? ' active' : ''}`}
              style={{ background: color }}
              onClick={() => pickColor(color)}
            />
          ))}
        </div>
      )}
      {adding && (
        <form className="inline-form label-child-form" onSubmit={addChild}>
          <input
            type="text"
            value={childName}
            placeholder={`Sublabel van ${label.name}`}
            aria-label={`Nieuw sublabel van ${label.name}`}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            {...plainInput}
            enterKeyHint="done"
            onChange={(event) => setChildName(event.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!childName.trim()}>
            Toevoegen
          </button>
        </form>
      )}
    </li>
  );
}

/** What happens to the items and sublabels of a label that is removed (lists and templates). */
function nestedDeleteMessage(entry: TreeEntry<Sorted>, items: number): string {
  const { label, parent, children } = entry;
  if (parent) {
    return `De items met het sublabel "${label.name}" blijven bewaard en komen onder "${parent.name}".`;
  }
  const parts: string[] = [];
  if (items > 0) parts.push(`De items met het label "${label.name}" blijven bewaard, maar hebben daarna geen label meer.`);
  if (children.length > 0) {
    parts.push(
      children.length === 1
        ? `Het sublabel "${children[0].name}" wordt een gewoon label.`
        : `De ${children.length} sublabels worden gewone labels.`,
    );
  }
  return parts.join(' ');
}

export function LabelSheet({
  labels,
  itemCounts,
  actions,
  texts = LABEL_TEXTS,
  nested = false,
  onClose,
}: Props) {
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<TreeEntry<Sorted> | null>(null);

  // The sheet gets labels in display order; without nesting they are all top-level.
  const entries = labelTree<Sorted>(
    labels.map((label, order) => ({ ...label, order, parentId: nested ? label.parentId : null })),
  );
  const topLevel = entries.filter((entry) => entry.depth === 0).map((entry) => entry.label);

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (actions.create(newName)) setNewName('');
  };

  const remove = (entry: TreeEntry<Sorted>) => {
    if ((itemCounts.get(entry.label.id) ?? 0) === 0 && entry.children.length === 0) {
      actions.remove(entry.label.id);
    } else setDeleting(entry);
  };

  return (
    <Sheet title={texts.title} onClose={onClose}>
      {labels.length === 0 ? (
        <p className="sheet-text">
          {texts.intro}
          {nested && ' Met de plusknop naast een label maak je er sublabels onder.'}
        </p>
      ) : (
        <ul className="label-rows">
          {entries.map((entry) => (
            <LabelRow
              key={entry.label.id}
              entry={entry}
              one={entry.depth === 1 ? 'Sublabel' : texts.one}
              nested={nested}
              parents={topLevel.filter((label) => label.id !== entry.label.id)}
              onUpdate={actions.update}
              onDelete={() => remove(entry)}
              onAddChild={(name) => actions.create(name, entry.label.id) !== null}
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
          title={deleting.depth === 1 ? 'Sublabel verwijderen?' : texts.deleteTitle}
          message={
            nested
              ? nestedDeleteMessage(deleting, itemCounts.get(deleting.label.id) ?? 0)
              : texts.deleteMessage(deleting.label.name)
          }
          confirmLabel="Verwijderen"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            actions.remove(deleting.label.id);
            setDeleting(null);
          }}
        />
      )}
    </Sheet>
  );
}
