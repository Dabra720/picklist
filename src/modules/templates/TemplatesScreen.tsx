import { useState } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { Icon } from '../../core/components/Icon';
import { useAppState } from '../../core/store';
import { CategorySheet } from './CategorySheet';
import { openTemplate } from './routes';
import { createTemplate } from './store';
import { TemplateDetailsSheet } from './TemplateDetailsSheet';
import { TemplateMenu } from './TemplateMenu';
import type { Template } from './types';
import { describeTemplate, groupTemplates } from './util';

type Dialog = { kind: 'create' } | { kind: 'categories' } | { kind: 'menu'; template: Template };

/** All templates, grouped per category. */
export function TemplatesScreen() {
  const { data } = useAppState();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const groups = groupTemplates(data);
  const showHeadings = data.templateCategories.length > 0;

  return (
    <div className="screen">
      <header className="topbar">
        <MenuButton current="templates" />
        <h1>Templates</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label="Categorieën beheren"
          onClick={() => setDialog({ kind: 'categories' })}
        >
          <Icon name="folder" />
        </button>
      </header>

      <main className="content">
        {groups.length === 0 ? (
          <div className="empty">
            <div className="empty-mark">
              <Icon name="template" size={36} />
            </div>
            <h2>Nog geen templates</h2>
            <p>
              Een template is een vaste lijst die je steeds opnieuw gebruikt. Maak er hier een, of
              sla een bestaande paklijst op als template via ⋯ in die lijst.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section
              key={group.key}
              className="template-group"
              aria-label={group.category?.name ?? 'Zonder categorie'}
            >
              {showHeadings && (
                <h2 className="template-group-title">
                  {group.category?.name ?? 'Zonder categorie'}
                </h2>
              )}
              <ul className="card-list">
                {group.templates.map((template) => (
                  <li key={template.id} className="card list-card">
                    <button
                      type="button"
                      className="list-card-main"
                      onClick={() => openTemplate(template.id)}
                    >
                      <span className="list-card-title">
                        <span className="list-card-name">{template.name}</span>
                      </span>
                      <span className="list-card-meta">
                        <span>{describeTemplate(template)}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn list-card-more"
                      aria-label={`Opties voor ${template.name}`}
                      onClick={() => setDialog({ kind: 'menu', template })}
                    >
                      <Icon name="more" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setDialog({ kind: 'create' })}
        >
          <Icon name="plus" />
          Nieuwe template
        </button>
      </div>

      {dialog?.kind === 'create' && (
        <TemplateDetailsSheet
          title="Nieuwe template"
          submitLabel="Template maken"
          onClose={close}
          onSubmit={(name, categoryId) => {
            close();
            const id = createTemplate(name, categoryId);
            if (id) openTemplate(id);
          }}
        />
      )}
      {dialog?.kind === 'categories' && <CategorySheet onClose={close} />}
      {dialog?.kind === 'menu' && <TemplateMenu template={dialog.template} onClose={close} />}
    </div>
  );
}
