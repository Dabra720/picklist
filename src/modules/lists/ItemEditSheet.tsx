import { useState, type FormEvent } from 'react';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { plainInput } from '../../core/lib/util';
import { MAX_NAME_LENGTH } from '../../core/types';
import { MAX_QUANTITY, type Item, type Label } from './types';

interface Props {
  item: Item;
  labels: Label[];
  onSave: (patch: { name: string; labelId: string | null; quantity: number }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ItemEditSheet({ item, labels, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(item.name);
  const [labelId, setLabelId] = useState(item.labelId);
  const [quantity, setQuantity] = useState(item.quantity);
  const valid = name.trim().length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSave({ name, labelId, quantity });
  };

  return (
    <Sheet title="Item bewerken" onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Item</span>
          <input
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            {...plainInput}
            enterKeyHint="done"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="field">
          <span id="item-quantity-title">Aantal</span>
          <div className="stepper" role="group" aria-labelledby="item-quantity-title">
            <button
              type="button"
              className="btn btn-square"
              aria-label="Eén minder"
              disabled={quantity <= 1}
              onClick={() => setQuantity(quantity - 1)}
            >
              −
            </button>
            <output className="stepper-value" aria-live="polite">
              {quantity}
            </output>
            <button
              type="button"
              className="btn btn-square"
              aria-label="Eén meer"
              disabled={quantity >= MAX_QUANTITY}
              onClick={() => setQuantity(quantity + 1)}
            >
              +
            </button>
          </div>
        </div>

        {labels.length > 0 && (
          <div className="field">
            <span id="item-label-title">Label</span>
            <div className="chips chips-wrap" role="radiogroup" aria-labelledby="item-label-title">
              <button
                type="button"
                role="radio"
                aria-checked={labelId === null}
                className={`chip${labelId === null ? ' chip-active' : ''}`}
                onClick={() => setLabelId(null)}
              >
                Geen label
              </button>
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  role="radio"
                  aria-checked={labelId === label.id}
                  className={`chip${labelId === label.id ? ' chip-active' : ''}`}
                  onClick={() => setLabelId(label.id)}
                >
                  <span className="dot" style={{ background: label.color }} />
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="button-row">
          <button type="button" className="btn btn-danger-ghost" onClick={onDelete}>
            <Icon name="trash" size={20} />
            Verwijderen
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            Opslaan
          </button>
        </div>
      </form>
    </Sheet>
  );
}
