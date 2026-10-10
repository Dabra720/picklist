import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent } from 'react';
import { Icon } from '../../core/components/Icon';
import { plainInput } from '../../core/lib/util';
import { MAX_NAME_LENGTH } from '../../core/types';
import type { LabelLike } from './types';
import { parseQuantity } from './util';

export const NO_LABEL = 'none';

interface Props {
  labels: LabelLike[];
  /** NO_LABEL or a label id: the label new items get. */
  labelId: string;
  onLabelChange: (labelId: string) => void;
  /** Adds the item; returns false when nothing was added. */
  onAdd: (name: string, quantity: number, labelId: string | null) => boolean;
}

/** The bar at the bottom of a list or template to add items, with "7x sokken" support. */
export const AddItemBar = forwardRef<{ focus: () => void }, Props>(function AddItemBar(
  { labels, labelId, onLabelChange, onAdd },
  ref,
) {
  const [newName, setNewName] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));

  const target = labels.some((label) => label.id === labelId) ? labelId : NO_LABEL;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // "7x sokken" adds one item with a quantity of seven.
    const { name, quantity } = parseQuantity(newName);
    if (onAdd(name, quantity, target === NO_LABEL ? null : target)) {
      setNewName('');
      input.current?.focus();
    }
  };

  return (
    <form className="bottom-bar add-bar" onSubmit={submit}>
      {labels.length > 0 && (
        <select
          className="select"
          aria-label="Label voor het nieuwe item"
          value={target}
          onChange={(event) => onLabelChange(event.target.value)}
        >
          <option value={NO_LABEL}>Geen label</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </select>
      )}
      <input
        ref={input}
        type="text"
        value={newName}
        placeholder="Item toevoegen"
        aria-label="Nieuw item"
        maxLength={MAX_NAME_LENGTH}
        {...plainInput}
        enterKeyHint="done"
        onChange={(event) => setNewName(event.target.value)}
      />
      <button
        type="submit"
        className="btn btn-primary btn-square"
        aria-label="Item toevoegen"
        disabled={!newName.trim()}
      >
        <Icon name="plus" />
      </button>
    </form>
  );
});
