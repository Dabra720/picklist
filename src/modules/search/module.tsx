import type { AppModule } from '../../core/modules';
import { tagsBackup } from './backup';
import { SearchScreen } from './SearchScreen';

/** Search over all modules, and the tags they share. */
export const searchModule: AppModule = {
  id: 'search',
  label: 'Zoeken',
  icon: 'search',
  home: 'zoeken',
  routes: {
    zoeken: () => <SearchScreen />,
  },
  backup: tagsBackup,
};
