import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { byOrder, plainInput } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { createCategory, deleteCategory, renameCategory } from './store';
import type { TemplateCategory } from './types';

function CategoryRow({ category, onDelete }: { category: TemplateCategory; onDelete: () => void }) {
  const [name, setName] = useState(category.name);
  // Saved when leaving the field; an emptied name falls back to the stored one.
  const save = () => {
    if (name.trim()) renameCategory(category.id, name);
    else setName(category.name);
  };
  return (
    <li className="label-row">
      <input
        type="text"
        value={name}
        maxLength={MAX_NAME_LENGTH}
        aria-label="Categorie"
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
        aria-label={`Categorie ${category.name} verwijderen`}
        onClick={onDelete}
      >
        <Icon name="trash" size={20} />
      </button>
    </li>
  );
}

/** Rename, add and remove template categories. */
export function CategorySheet({ onClose }: { onClose: () => void }) {
  const { data } = useAppState();
  const categories = [...data.templateCategories].sort(byOrder);
  const [newName, setNewName] = useState('');
  const [deleting, setDeleting] = useState<TemplateCategory | null>(null);

  const used = (id: string) => data.templates.filter((t) => t.categoryId === id).length;

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (createCategory(newName)) setNewName('');
  };

  return (
    <Sheet title="Categorieën" onClose={onClose}>
      {categories.length === 0 ? (
        <p className="sheet-text">
          Met categorieën groepeer je templates, bijvoorbeeld Reizen, Sport of Werk.
        </p>
      ) : (
        <ul className="label-rows">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onDelete={() =>
                used(category.id) === 0 ? deleteCategory(category.id) : setDeleting(category)
              }
            />
          ))}
        </ul>
      )}

      <form className="inline-form" onSubmit={add}>
        <input
          type="text"
          value={newName}
          placeholder="Nieuwe categorie"
          aria-label="Nieuwe categorie"
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
          title="Categorie verwijderen?"
          message={`De templates in "${deleting.name}" blijven bewaard, maar hebben daarna geen categorie meer.`}
          confirmLabel="Verwijderen"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteCategory(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </Sheet>
  );
}
