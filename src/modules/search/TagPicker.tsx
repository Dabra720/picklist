import { useState, type CSSProperties, type FormEvent } from 'react';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { byOrder, plainInput } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { LabelSheet, type LabelActions, type LabelTexts } from '../lists/LabelSheet';
import { createTag, deleteTag, setTags, tagUsage, updateTag } from './store';
import type { Tag, TaggableKind } from './types';

/** Small coloured tag pills, e.g. on a card. */
export function TagChips({ tagIds, tags }: { tagIds: string[]; tags: Tag[] }) {
  const shown = tagIds.map((id) => tags.find((t) => t.id === id)).filter((t): t is Tag => !!t);
  if (shown.length === 0) return null;
  return (
    <span className="tag-chips">
      {shown.map((tag) => (
        <span key={tag.id} className="tag-chip" style={{ '--tag': tag.color } as CSSProperties}>
          {tag.name}
        </span>
      ))}
    </span>
  );
}

const TAG_TEXTS: LabelTexts = {
  title: 'Tags',
  intro: 'Tags verbinden lijsten, notities en taken, bijvoorbeeld Texel, Werk of Verbouwing.',
  one: 'Tag',
  newPlaceholder: 'Nieuwe tag',
  deleteTitle: 'Tag verwijderen?',
  deleteMessage: (name) =>
    `"${name}" wordt van alle lijsten, notities en taken gehaald. Die blijven zelf bewaard.`,
};

const tagActions: LabelActions = { create: createTag, update: updateTag, remove: deleteTag };

/** Rename, recolour, add and remove tags: one central place for all modules. */
export function TagManagerSheet({ onClose }: { onClose: () => void }) {
  const { data } = useAppState();
  return (
    <LabelSheet
      labels={[...data.tags].sort(byOrder)}
      itemCounts={tagUsage(data)}
      actions={tagActions}
      texts={TAG_TEXTS}
      onClose={onClose}
    />
  );
}

/** Choose the tags of one list, note or task. */
export function TagPickerSheet({
  kind,
  id,
  tagIds,
  onClose,
}: {
  kind: TaggableKind;
  id: string;
  tagIds: string[];
  onClose: () => void;
}) {
  const { data } = useAppState();
  const tags = [...data.tags].sort(byOrder);
  const [newName, setNewName] = useState('');
  const [managing, setManaging] = useState(false);

  const toggle = (tagId: string) =>
    setTags(
      kind,
      id,
      tagIds.includes(tagId) ? tagIds.filter((t) => t !== tagId) : [...tagIds, tagId],
    );

  const add = (event: FormEvent) => {
    event.preventDefault();
    const tagId = createTag(newName);
    if (tagId) {
      setNewName('');
      if (!tagIds.includes(tagId)) setTags(kind, id, [...tagIds, tagId]);
    }
  };

  if (managing) return <TagManagerSheet onClose={() => setManaging(false)} />;

  return (
    <Sheet title="Tags" onClose={onClose}>
      {tags.length === 0 ? (
        <p className="sheet-text">Nog geen tags. Maak hieronder je eerste tag.</p>
      ) : (
        <div className="chips chips-wrap tag-picker" role="group" aria-label="Tags">
          {tags.map((tag) => {
            const on = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={on}
                className={`chip${on ? ' chip-active' : ''}`}
                onClick={() => toggle(tag.id)}
              >
                <span className="dot" style={{ background: tag.color }} />
                {tag.name}
                {on && <Icon name="check" size={16} />}
              </button>
            );
          })}
        </div>
      )}
      <form className="inline-form" onSubmit={add}>
        <input
          type="text"
          value={newName}
          placeholder="Nieuwe tag"
          aria-label="Nieuwe tag"
          maxLength={MAX_NAME_LENGTH}
          {...plainInput}
          enterKeyHint="done"
          onChange={(event) => setNewName(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
          Toevoegen
        </button>
      </form>
      {tags.length > 0 && (
        <button
          type="button"
          className="btn btn-block btn-small sheet-link"
          onClick={() => setManaging(true)}
        >
          <Icon name="settings" size={18} />
          Tags beheren
        </button>
      )}
    </Sheet>
  );
}

/** A row with the current tags and a button to change them; for detail screens. */
export function TagField({
  kind,
  id,
  tagIds,
}: {
  kind: TaggableKind;
  id: string;
  tagIds: string[];
}) {
  const { data } = useAppState();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="tag-field">
        <TagChips tagIds={tagIds} tags={data.tags} />
        <button type="button" className="chip chip-action" onClick={() => setOpen(true)}>
          <Icon name="tag" size={16} />
          {tagIds.length > 0 ? 'Tags' : 'Tag toevoegen'}
        </button>
      </div>
      {open && (
        <TagPickerSheet kind={kind} id={id} tagIds={tagIds} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
