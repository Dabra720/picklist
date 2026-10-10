import { useMemo, useState } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { ActionSheet, ConfirmDialog, NameSheet } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { ProgressBar } from '../../core/components/ProgressBar';
import { openList } from './routes';
import { showToast } from '../../core/lib/toast';
import { byOrder, percent } from '../../core/lib/util';
import {
  createExampleList,
  createList,
  deleteList,
  duplicateList,
  renameList,
} from './store';
import { useAppState } from '../../core/store';
import type { PackList } from './types';

type Dialog =
  | { kind: 'create' }
  | { kind: 'menu' | 'rename' | 'delete'; list: PackList };

export function ListsScreen() {
  const { data } = useAppState();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  const cards = useMemo(() => {
    const counts = new Map<string, { total: number; checked: number }>();
    for (const item of data.items) {
      const count = counts.get(item.listId) ?? { total: 0, checked: 0 };
      count.total += 1;
      if (item.checked) count.checked += 1;
      counts.set(item.listId, count);
    }
    return [...data.lists]
      .sort(byOrder)
      .map((list) => ({ list, ...(counts.get(list.id) ?? { total: 0, checked: 0 }) }));
  }, [data.lists, data.items]);

  return (
    <div className="screen">
      <header className="topbar">
        <MenuButton current="lists" />
        <h1>Paklijsten</h1>
      </header>

      <main className="content">
        {cards.length === 0 ? (
          <div className="empty">
            <div className="empty-mark">
              <Icon name="check" size={36} />
            </div>
            <h2>Nog geen paklijsten</h2>
            <p>Maak een lijst, voeg je spullen toe en vink ze af bij vertrek.</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const id = createExampleList();
                if (id) openList(id);
              }}
            >
              Begin met een voorbeeld
            </button>
          </div>
        ) : (
          <ul className="card-list">
            {cards.map(({ list, total, checked }) => {
              const complete = total > 0 && checked === total;
              return (
                <li key={list.id} className={`card list-card${complete ? ' list-card-complete' : ''}`}>
                  <button type="button" className="list-card-main" onClick={() => openList(list.id)}>
                    <span className="list-card-title">
                      <span className="list-card-name">{list.name}</span>
                      {complete && (
                        <span className="badge">
                          <Icon name="check" size={14} />
                          Compleet
                        </span>
                      )}
                    </span>
                    <span className="list-card-meta">
                      <span>
                        {total === 0
                          ? 'Nog geen items'
                          : `${checked} van ${total} ${total === 1 ? 'item' : 'items'} ingepakt`}
                      </span>
                      {total > 0 && <span>{percent(checked, total)}%</span>}
                    </span>
                    <ProgressBar checked={checked} total={total} label={`Voortgang ${list.name}`} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn list-card-more"
                    aria-label={`Opties voor ${list.name}`}
                    onClick={() => setDialog({ kind: 'menu', list })}
                  >
                    <Icon name="more" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setDialog({ kind: 'create' })}
        >
          <Icon name="plus" />
          Nieuwe paklijst
        </button>
      </div>

      {dialog?.kind === 'create' && (
        <NameSheet
          title="Nieuwe paklijst"
          label="Titel"
          placeholder="Bijv. Weekendje weg"
          submitLabel="Lijst maken"
          onClose={close}
          onSubmit={(name) => {
            close();
            const id = createList(name);
            if (id) openList(id);
          }}
        />
      )}

      {dialog?.kind === 'menu' && (
        <ActionSheet
          title={dialog.list.name}
          onClose={close}
          actions={[
            { label: 'Hernoemen', icon: 'edit', run: () => setDialog({ kind: 'rename', list: dialog.list }) },
            {
              label: 'Dupliceren',
              icon: 'copy',
              run: () => {
                if (duplicateList(dialog.list.id)) showToast('Lijst gedupliceerd.');
              },
            },
            {
              label: 'Verwijderen',
              icon: 'trash',
              danger: true,
              run: () => setDialog({ kind: 'delete', list: dialog.list }),
            },
          ]}
        />
      )}

      {dialog?.kind === 'rename' && (
        <NameSheet
          title="Lijst hernoemen"
          label="Titel"
          initialValue={dialog.list.name}
          submitLabel="Opslaan"
          onClose={close}
          onSubmit={(name) => {
            renameList(dialog.list.id, name);
            close();
          }}
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Lijst verwijderen?"
          message={`"${dialog.list.name}" wordt met alle items en labels verwijderd. Dit kan niet ongedaan worden gemaakt.`}
          confirmLabel="Verwijderen"
          danger
          onCancel={close}
          onConfirm={() => {
            deleteList(dialog.list.id);
            close();
          }}
        />
      )}
    </div>
  );
}
