import type { AppModule } from '../../core/modules';
import { templatesBackup } from './backup';
import { TemplateScreen } from './TemplateScreen';
import { TemplatesScreen } from './TemplatesScreen';

export const templatesModule: AppModule = {
  id: 'templates',
  label: 'Templates',
  icon: 'template',
  home: 'templates',
  routes: {
    templates: () => <TemplatesScreen />,
    template: (id, data) => {
      const template = data.templates.find((candidate) => candidate.id === id);
      return template ? <TemplateScreen key={template.id} template={template} /> : null;
    },
  },
  backup: templatesBackup,
};
