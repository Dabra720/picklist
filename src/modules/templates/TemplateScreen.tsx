import { useMemo, useState } from 'react';
import { Icon } from '../../core/components/Icon';
import { showToast } from '../../core/lib/toast';
import { byOrder } from '../../core/lib/util';
import { count } from '../../core/lib/validate';
import { useAppState } from '../../core/store';
import { AddItemBar, NO_LABEL } from '../lists/AddItemBar';
import { ItemEditSheet } from '../lists/ItemEditSheet';
import { ItemList } from '../lists/ItemList';
import { LabelSheet, type LabelActions } from '../lists/LabelSheet';
import { goTemplates } from './routes';
import {
  addTemplateItem,
  addTemplateLabel,
  deleteTemplateItem,
  deleteTemplateLabel,
  reorderTemplateItems,
  restoreTemplateItem,
  updateTemplateItem,
  updateTemplateLabel,
} from './store';
import { NewListFromTemplateSheet, TemplateMenu } from './TemplateMenu';
import type { Template, TemplateItem, TemplateLabel } from './types';

type Dialog = { kind: 'menu' | 'labels' | 'newList' } | { kind: 'item'; item: TemplateItem };

interface Group {
  key: string;
  label: TemplateLabel | null;
  items: TemplateItem[];
}

/** Edit a template: the same groups, labels and add bar as a list, but without check marks. */
export function TemplateScreen({ template }: { template: Template }) {
  const { data } = useAppState();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [newLabelId, setNewLabelId] = useState(NO_LABEL);
  const close = () => setDialog(null);

  const labels = useMemo(() => [...template.labels].sort(byOrder), [template.labels]);
  const category = data.templateCategories.find((c) => c.id === template.categoryId);

  const groups = useMemo<Group[]>(() => {
    const known = new Set(labels.map((label) => label.id));
    const sorted = [...template.items].sort(byOrder);
    return [...labels.map((label) => ({ key: label.id, label })), { key: NO_LABEL, label: null }]
      .map((group) => ({
        ...group,
        items: sorted.filter(
          (item) =>
            (item.labelId && known.has(item.labelId) ? item.labelId : NO_LABEL) === group.key,
        ),
      }))
      .filter((group) => group.label !== null || group.items.length > 0);
  }, [labels, template.items]);

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of template.items) {
      const key = item.labelId ?? NO_LABEL;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [template.items]);

  const labelActions: LabelActions = {
    create: (name) => addTemplateLabel(template.id, name),
    update: (id, patch) => updateTemplateLabel(template.id, id, patch),
    remove: (id) => deleteTemplateLabel(template.id, id),
  };

  const removeItem = (item: TemplateItem) => {
    deleteTemplateItem(template.id, item.id);
    close();
    showToast(`"${item.name}" verwijderd.`, {
      label: 'Ongedaan maken',
      run: () => restoreTemplateItem(template.id, item),
    });
  };

  const total = template.items.length;

  return (
    <div className="screen">
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Terug naar templates"
          onClick={goTemplates}
        >
          <Icon name="back" />
        </button>
        <h1 className="topbar-title">{template.name}</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label="Opties voor deze template"
          onClick={() => setDialog({ kind: 'menu' })}
        >
          <Icon name="more" />
        </button>
      </header>

      <main className="content">
        <section className="card summary" aria-label="Template">
          <div className="summary-row">
            <div>
              <div className="summary-title">Template · {count(total, 'item', 'items')}</div>
              <div className="summary-sub">{category ? category.name : 'Zonder categorie'}</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={total === 0}
              onClick={() => setDialog({ kind: 'newList' })}
            >
              <Icon name="checklist" size={18} />
              Lijst maken
            </button>
          </div>
        </section>

        <div className="chips">
          <button
            type="button"
            className="chip chip-action"
            onClick={() => setDialog({ kind: 'labels' })}
          >
            <Icon name="tag" size={16} />
            {labels.length > 0 ? 'Labels beheren' : 'Labels toevoegen'}
          </button>
        </div>

        {total === 0 ? (
          <div className="empty empty-compact">
            <h2>Deze template is nog leeg</h2>
            <p>
              Typ hieronder wat er altijd mee moet en tik op de plusknop. Meerdere van hetzelfde?
              Typ bijvoorbeeld "7x sokken".
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="group">
              {labels.length > 0 && (
                <div className="group-head">
                  <h2>
                    {group.label && (
                      <span className="dot" style={{ background: group.label.color }} />
                    )}
                    {group.label?.name ?? 'Geen label'}
                  </h2>
                  <span className="group-count">{group.items.length}</span>
                </div>
              )}
              {group.items.length === 0 ? (
                <p className="group-empty">Nog geen items met dit label.</p>
              ) : (
                <ItemList
                  items={group.items}
                  sortable
                  onEdit={(item) => setDialog({ kind: 'item', item })}
                  onReorder={(ids) => reorderTemplateItems(template.id, ids)}
                />
              )}
            </section>
          ))
        )}
      </main>

      <AddItemBar
        labels={labels}
        labelId={newLabelId}
        onLabelChange={setNewLabelId}
        onAdd={(name, quantity, labelId) => addTemplateItem(template.id, name, labelId, quantity)}
      />

      {dialog?.kind === 'menu' && (
        <TemplateMenu
          template={template}
          onClose={close}
          onDeleted={goTemplates}
          extraActions={[
            {
              label: 'Labels beheren',
              icon: 'tag',
              keepOpen: true,
              run: () => setDialog({ kind: 'labels' }),
            },
          ]}
        />
      )}
      {dialog?.kind === 'newList' && (
        <NewListFromTemplateSheet template={template} onClose={close} />
      )}
      {dialog?.kind === 'labels' && (
        <LabelSheet
          labels={labels}
          itemCounts={itemCounts}
          actions={labelActions}
          onClose={close}
        />
      )}
      {dialog?.kind === 'item' && (
        <ItemEditSheet
          item={dialog.item}
          labels={labels}
          onClose={close}
          onDelete={() => removeItem(dialog.item)}
          onSave={(patch) => {
            updateTemplateItem(template.id, dialog.item.id, patch);
            close();
          }}
        />
      )}
    </div>
  );
}
