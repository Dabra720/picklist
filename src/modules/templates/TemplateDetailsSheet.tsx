import { useState, type FormEvent } from 'react';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { byOrder, plainInput } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { createCategory } from './store';

const NEW = 'new';

interface Props {
  title: string;
  submitLabel: string;
  initialName?: string;
  initialCategoryId?: string | null;
  /** Explains where the template comes from, e.g. when saving a list. */
  intro?: string;
  onSubmit: (name: string, categoryId: string | null) => void;
  onClose: () => void;
}

/** Name and category of a template: used to create, to save a list as one, and to change it. */
export function TemplateDetailsSheet({
  title,
  submitLabel,
  initialName = '',
  initialCategoryId = null,
  intro,
  onSubmit,
  onClose,
}: Props) {
  const { data } = useAppState();
  const categories = [...data.templateCategories].sort(byOrder);
  const [name, setName] = useState(initialName);
  // '' = no category, NEW = a new one typed below, otherwise a category id.
  const [choice, setChoice] = useState(initialCategoryId ?? '');
  const [newCategory, setNewCategory] = useState('');
  const valid = name.trim().length > 0 && (choice !== NEW || newCategory.trim().length > 0);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    // A new category is only created when the sheet is saved, not while choosing.
    const categoryId = choice === NEW ? createCategory(newCategory) : choice || null;
    onSubmit(name, categoryId);
  };

  const chip = (value: string, label: string, icon?: boolean) => (
    <button
      key={value || 'none'}
      type="button"
      role="radio"
      aria-checked={choice === value}
      className={`chip${choice === value ? ' chip-active' : ''}${icon ? ' chip-action' : ''}`}
      onClick={() => setChoice(value)}
    >
      {icon && <Icon name="plus" size={16} />}
      {label}
    </button>
  );

  return (
    <Sheet title={title} onClose={onClose}>
      {intro && <p className="sheet-text">{intro}</p>}
      <form onSubmit={submit}>
        <label className="field">
          <span>Naam</span>
          <input
            type="text"
            value={name}
            placeholder="Bijv. Vakantie"
            maxLength={MAX_NAME_LENGTH}
            autoFocus={!initialName}
            {...plainInput}
            enterKeyHint="done"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="field">
          <span id="template-category-title">Categorie</span>
          <div
            className="chips chips-wrap"
            role="radiogroup"
            aria-labelledby="template-category-title"
          >
            {chip('', 'Geen')}
            {categories.map((category) => chip(category.id, category.name))}
            {chip(NEW, 'Nieuwe categorie', true)}
          </div>
          {choice === NEW && (
            <input
              type="text"
              value={newCategory}
              placeholder="Bijv. Reizen"
              aria-label="Naam van de nieuwe categorie"
              maxLength={MAX_NAME_LENGTH}
              autoFocus
              {...plainInput}
              enterKeyHint="done"
              onChange={(event) => setNewCategory(event.target.value)}
            />
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>
          {submitLabel}
        </button>
      </form>
    </Sheet>
  );
}
