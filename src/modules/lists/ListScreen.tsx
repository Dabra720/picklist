import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ActionSheet, ConfirmDialog, NameSheet } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { ProgressBar } from '../../core/components/ProgressBar';
import { goLists, openList } from './routes';
import { showToast } from '../../core/lib/toast';
import { byOrder, percent, plainInput } from '../../core/lib/util';
import { parseQuantity, sortItems } from './util';
import {
  addItem,
  checkedIds,
  deleteItem,
  deleteList,
  duplicateList,
  renameList,
  reorderItems,
  restoreChecked,
  restoreItem,
  setAllChecked,
  setSortMode,
  toggleItem,
  updateItem,
} from './store';
import { useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import type { Item, Label, PackList, SortMode } from './types';
import { ItemEditSheet } from './ItemEditSheet';
import { ItemList } from './ItemList';
import { LabelSheet } from './LabelSheet';

const NO_LABEL = 'none';
/** 'all', NO_LABEL or a label id. */
type Filter = string;

const SORT_LABELS: Record<SortMode, string> = {
  manual: 'Eigen volgorde',
  alpha: 'Alfabetisch',
  unchecked: 'Niet-afgevinkt eerst',
};

type Dialog =
  | { kind: 'menu' | 'rename' | 'delete' | 'labels' }
  | { kind: 'item'; item: Item };

interface Group {
  key: string;
  label: Label | null;
  total: number;
  checked: number;
  visible: Item[];
}

export function ListScreen({ list }: { list: PackList }) {
  const { data } = useAppState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [newName, setNewName] = useState('');
  const [newLabelId, setNewLabelId] = useState<string>(NO_LABEL);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const close = () => setDialog(null);

  const labels = useMemo(
    () => data.labels.filter((label) => label.listId === list.id).sort(byOrder),
    [data.labels, list.id],
  );
  const items = useMemo(
    () => data.items.filter((item) => item.listId === list.id),
    [data.items, list.id],
  );

  const labelIds = new Set(labels.map((label) => label.id));
  // Fall back gracefully when the selected label has been deleted in the meantime.
  const activeFilter = filter === 'all' || filter === NO_LABEL || labelIds.has(filter) ? filter : 'all';
  const targetLabelId = labelIds.has(newLabelId) ? newLabelId : null;
  const search = query.trim().toLocaleLowerCase('nl');

  const groups = useMemo<Group[]>(() => {
    const known = new Set(labels.map((label) => label.id));
    const sorted = sortItems(items, list.sortMode);
    const definitions: { key: string; label: Label | null }[] = [
      ...labels.map((label) => ({ key: label.id, label })),
      { key: NO_LABEL, label: null },
    ];
    return definitions
      .filter((group) => activeFilter === 'all' || activeFilter === group.key)
      .map((group) => {
        const own = sorted.filter(
          (item) => (item.labelId && known.has(item.labelId) ? item.labelId : NO_LABEL) === group.key,
        );
        return {
          ...group,
          total: own.length,
          checked: own.filter((item) => item.checked).length,
          visible: search
            ? own.filter((item) => item.name.toLocaleLowerCase('nl').includes(search))
            : own,
        };
      })
      .filter((group) => (search ? group.visible.length > 0 : group.label !== null || group.total > 0));
  }, [items, labels, list.sortMode, activeFilter, search]);

  const total = items.length;
  const checked = items.filter((item) => item.checked).length;
  const complete = total > 0 && checked === total;
  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = item.labelId ?? NO_LABEL;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const selectFilter = (next: Filter) => {
    setFilter(next);
    // New items go to the label you are looking at.
    if (next !== 'all') setNewLabelId(next);
  };

  const submitNewItem = (event: FormEvent) => {
    event.preventDefault();
    // "7x sokken" adds one item with a quantity of seven.
    const { name, quantity } = parseQuantity(newName);
    if (addItem(list.id, name, targetLabelId, quantity)) {
      setNewName('');
      addInput.current?.focus();
    }
  };

  /** Checks or unchecks everything, with a way back in case it was a slip of the thumb. */
  const setAll = (value: boolean, message: string) => {
    const previous = checkedIds(list.id);
    setAllChecked(list.id, value);
    showToast(message, {
      label: 'Ongedaan maken',
      run: () => restoreChecked(list.id, previous),
    });
  };

  const removeItem = (item: Item) => {
    deleteItem(item.id);
    close();
    showToast(`"${item.name}" verwijderd.`, { label: 'Ongedaan maken', run: () => restoreItem(item) });
  };

  const sortable = list.sortMode === 'manual' && !search;

  return (
    <div className="screen">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Terug naar overzicht" onClick={goLists}>
          <Icon name="back" />
        </button>
        <h1 className="topbar-title">{list.name}</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label="Opties voor deze lijst"
          onClick={() => setDialog({ kind: 'menu' })}
        >
          <Icon name="more" />
        </button>
      </header>

      <main className="content">
        <section className={`card summary${complete ? ' summary-complete' : ''}`} aria-label="Voortgang">
          <div className="summary-row">
            <div>
              <div className="summary-title">
                {complete ? 'Alles ingepakt' : `${checked} van ${total} ingepakt`}
              </div>
              <div className="summary-sub">
                {complete ? 'Je bent klaar om te vertrekken.' : `${percent(checked, total)}% compleet`}
              </div>
            </div>
            {checked > 0 && (
              <button
                type="button"
                className="btn btn-small"
                onClick={() => setAll(false, 'Alle vinkjes gereset.')}
              >
                <Icon name="reset" size={18} />
                Reset
              </button>
            )}
          </div>
          <ProgressBar checked={checked} total={total} label="Voortgang van deze lijst" />
        </section>

        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={20} />
            <input
              type="search"
              value={query}
              placeholder="Zoek een item"
              aria-label="Zoek een item"
              autoComplete="off"
              enterKeyHint="search"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            className="select"
            aria-label="Sortering"
            value={list.sortMode}
            onChange={(event) => setSortMode(list.id, event.target.value as SortMode)}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {SORT_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>

        <div className="chips" role="group" aria-label="Filter op label">
          {labels.length > 0 && (
            <>
              <button
                type="button"
                aria-pressed={activeFilter === 'all'}
                className={`chip${activeFilter === 'all' ? ' chip-active' : ''}`}
                onClick={() => selectFilter('all')}
              >
                Alles
              </button>
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={activeFilter === label.id}
                  className={`chip${activeFilter === label.id ? ' chip-active' : ''}`}
                  onClick={() => selectFilter(label.id)}
                >
                  <span className="dot" style={{ background: label.color }} />
                  {label.name}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={activeFilter === NO_LABEL}
                className={`chip${activeFilter === NO_LABEL ? ' chip-active' : ''}`}
                onClick={() => selectFilter(NO_LABEL)}
              >
                Geen label
              </button>
            </>
          )}
          <button type="button" className="chip chip-action" onClick={() => setDialog({ kind: 'labels' })}>
            <Icon name="tag" size={16} />
            {labels.length > 0 ? 'Labels beheren' : 'Labels toevoegen'}
          </button>
        </div>

        {total === 0 ? (
          <div className="empty empty-compact">
            <h2>Deze lijst is nog leeg</h2>
            <p>
              Typ hieronder wat je wilt meenemen en tik op de plusknop. Meerdere van hetzelfde? Typ
              bijvoorbeeld "7x sokken".
            </p>
          </div>
        ) : groups.length === 0 ? (
          <div className="empty empty-compact">
            <p>{search ? `Geen items gevonden voor "${query.trim()}".` : 'Geen items met dit label.'}</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="group">
              {labels.length > 0 && (
                <div className="group-head">
                  <h2>
                    {group.label && <span className="dot" style={{ background: group.label.color }} />}
                    {group.label?.name ?? 'Geen label'}
                  </h2>
                  <span className="group-count">
                    {group.checked}/{group.total}
                  </span>
                  <ProgressBar
                    small
                    checked={group.checked}
                    total={group.total}
                    label={`Voortgang ${group.label?.name ?? 'zonder label'}`}
                  />
                </div>
              )}
              {group.visible.length === 0 ? (
                <p className="group-empty">Nog geen items met dit label.</p>
              ) : (
                <ItemList
                  items={group.visible}
                  sortable={sortable}
                  onToggle={toggleItem}
                  onEdit={(item) => setDialog({ kind: 'item', item })}
                  onReorder={reorderItems}
                />
              )}
            </section>
          ))
        )}
      </main>

      <form className="bottom-bar add-bar" onSubmit={submitNewItem}>
        {labels.length > 0 && (
          <select
            className="select"
            aria-label="Label voor het nieuwe item"
            value={targetLabelId ?? NO_LABEL}
            onChange={(event) => setNewLabelId(event.target.value)}
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
          ref={addInput}
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

      {dialog?.kind === 'menu' && (
        <ActionSheet
          title={list.name}
          onClose={close}
          actions={[
            {
              label: 'Alles afvinken',
              icon: 'checkAll',
              disabled: total === 0 || complete,
              run: () => setAll(true, 'Alles afgevinkt.'),
            },
            {
              label: 'Alle vinkjes resetten',
              icon: 'reset',
              disabled: checked === 0,
              run: () => setAll(false, 'Alle vinkjes gereset.'),
            },
            { label: 'Labels beheren', icon: 'tag', run: () => setDialog({ kind: 'labels' }) },
            { label: 'Lijst hernoemen', icon: 'edit', run: () => setDialog({ kind: 'rename' }) },
            {
              label: 'Lijst dupliceren',
              icon: 'copy',
              run: () => {
                const id = duplicateList(list.id);
                if (id) {
                  openList(id);
                  showToast('Lijst gedupliceerd.');
                }
              },
            },
            {
              label: 'Lijst verwijderen',
              icon: 'trash',
              danger: true,
              run: () => setDialog({ kind: 'delete' }),
            },
          ]}
        />
      )}

      {dialog?.kind === 'rename' && (
        <NameSheet
          title="Lijst hernoemen"
          label="Titel"
          initialValue={list.name}
          submitLabel="Opslaan"
          onClose={close}
          onSubmit={(name) => {
            renameList(list.id, name);
            close();
          }}
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Lijst verwijderen?"
          message={`"${list.name}" wordt met alle items en labels verwijderd. Dit kan niet ongedaan worden gemaakt.`}
          confirmLabel="Verwijderen"
          danger
          onCancel={close}
          onConfirm={() => {
            deleteList(list.id);
            goLists();
          }}
        />
      )}

      {dialog?.kind === 'labels' && (
        <LabelSheet listId={list.id} labels={labels} itemCounts={itemCounts} onClose={close} />
      )}

      {dialog?.kind === 'item' && (
        <ItemEditSheet
          item={dialog.item}
          labels={labels}
          onClose={close}
          onDelete={() => removeItem(dialog.item)}
          onSave={(patch) => {
            updateItem(dialog.item.id, patch);
            close();
          }}
        />
      )}
    </div>
  );
}
