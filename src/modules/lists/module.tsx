import type { AppModule } from '../../core/modules';
import { listsBackup } from './backup';
import { ListScreen } from './ListScreen';
import { ListsScreen } from './ListsScreen';
import { normalizeLists } from './store';

export const listsModule: AppModule = {
  id: 'lists',
  label: 'Paklijsten',
  icon: 'checklist',
  home: '',
  routes: {
    '': () => <ListsScreen />,
    lijst: (id, data) => {
      const list = data.lists.find((candidate) => candidate.id === id);
      return list ? <ListScreen key={list.id} list={list} /> : null;
    },
  },
  loadHooks: [normalizeLists],
  backup: listsBackup,
};
