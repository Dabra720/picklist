import { useState } from 'react';
import { ActionSheet, NameSheet, type MenuAction } from '../../core/components/dialogs';
import { showToast } from '../../core/lib/toast';
import { openList } from '../lists/routes';
import { openTemplate } from './routes';
import {
  createListFromTemplate,
  deleteTemplate,
  duplicateTemplate,
  renameTemplate,
  restoreTemplate,
  setTemplateCategory,
} from './store';
import { TemplateDetailsSheet } from './TemplateDetailsSheet';
import type { Template } from './types';

/** "Make a list" from a template: asks for the list's name, then opens the new list. */
export function NewListFromTemplateSheet({
  template,
  onClose,
}: {
  template: Template;
  onClose: () => void;
}) {
  return (
    <NameSheet
      title="Nieuwe paklijst"
      label="Titel"
      initialValue={template.name}
      submitLabel="Lijst maken"
      onClose={onClose}
      onSubmit={(name) => {
        const id = createListFromTemplate(template.id, name);
        onClose();
        if (id) {
          openList(id);
          showToast(`Lijst gemaakt uit "${template.name}".`);
        }
      }}
    />
  );
}

type Step = 'menu' | 'details' | 'newList';

/** The ⋯ menu of a template and what its actions open, shared by the overview and the editor. */
export function TemplateMenu({
  template,
  onClose,
  onDeleted,
  extraActions = [],
}: {
  template: Template;
  onClose: () => void;
  /** Called after the template was deleted (the editor then goes back to the overview). */
  onDeleted?: () => void;
  extraActions?: MenuAction[];
}) {
  const [step, setStep] = useState<Step>('menu');

  if (step === 'newList') return <NewListFromTemplateSheet template={template} onClose={onClose} />;

  if (step === 'details') {
    return (
      <TemplateDetailsSheet
        title="Naam en categorie"
        submitLabel="Opslaan"
        initialName={template.name}
        initialCategoryId={template.categoryId}
        onClose={onClose}
        onSubmit={(name, categoryId) => {
          renameTemplate(template.id, name);
          setTemplateCategory(template.id, categoryId);
          onClose();
        }}
      />
    );
  }

  return (
    <ActionSheet
      title={template.name}
      onClose={onClose}
      actions={[
        { label: 'Lijst maken', icon: 'checklist', keepOpen: true, run: () => setStep('newList') },
        ...extraActions,
        { label: 'Naam en categorie', icon: 'edit', keepOpen: true, run: () => setStep('details') },
        {
          label: 'Dupliceren',
          icon: 'copy',
          run: () => {
            const id = duplicateTemplate(template.id);
            if (id)
              showToast('Template gedupliceerd.', { label: 'Openen', run: () => openTemplate(id) });
          },
        },
        {
          label: 'Verwijderen',
          icon: 'trash',
          danger: true,
          run: () => {
            deleteTemplate(template.id);
            onDeleted?.();
            showToast(`Template "${template.name}" verwijderd.`, {
              label: 'Ongedaan maken',
              run: () => restoreTemplate(template),
            });
          },
        },
      ]}
    />
  );
}
