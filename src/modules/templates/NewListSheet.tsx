import { useState } from 'react';
import { NameSheet } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { Sheet } from '../../core/components/Sheet';
import { useAppState } from '../../core/store';
import { openList } from '../lists/routes';
import { createList } from '../lists/store';
import { NewListFromTemplateSheet } from './TemplateMenu';
import type { Template } from './types';
import { describeTemplate, groupTemplates } from './util';

/**
 * "Nieuwe paklijst": an empty list, or one made from a template. Without templates it goes
 * straight to naming an empty list, as before templates existed.
 */
export function NewListSheet({ onClose }: { onClose: () => void }) {
  const { data } = useAppState();
  const groups = groupTemplates(data);
  const [step, setStep] = useState<'choose' | 'blank' | Template>(
    groups.length > 0 ? 'choose' : 'blank',
  );

  if (step === 'blank') {
    return (
      <NameSheet
        title="Nieuwe paklijst"
        label="Titel"
        placeholder="Bijv. Weekendje weg"
        submitLabel="Lijst maken"
        onClose={onClose}
        onSubmit={(name) => {
          onClose();
          const id = createList(name);
          if (id) openList(id);
        }}
      />
    );
  }

  if (step !== 'choose') return <NewListFromTemplateSheet template={step} onClose={onClose} />;

  const showHeadings = data.templateCategories.length > 0;
  return (
    <Sheet title="Nieuwe paklijst" onClose={onClose}>
      <div className="menu">
        <button type="button" className="menu-item" onClick={() => setStep('blank')}>
          <Icon name="plus" />
          Lege lijst
        </button>
      </div>
      <h3 className="section-title">Uit template</h3>
      {groups.map((group) => (
        <div
          key={group.key}
          className="menu"
          role="group"
          aria-label={group.category?.name ?? 'Zonder categorie'}
        >
          {showHeadings && (
            <p className="menu-group-title">{group.category?.name ?? 'Zonder categorie'}</p>
          )}
          {group.templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="menu-item"
              onClick={() => setStep(template)}
            >
              <Icon name="template" />
              <span className="menu-item-text">
                <span>{template.name}</span>
                <span className="menu-item-detail">{describeTemplate(template)}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </Sheet>
  );
}
