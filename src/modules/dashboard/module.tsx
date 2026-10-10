import type { AppModule } from '../../core/modules';
import { DashboardScreen } from './DashboardScreen';

/** The start screen. It has no data of its own: every card comes from another module. */
export const dashboardModule: AppModule = {
  id: 'dashboard',
  label: 'Start',
  icon: 'home',
  home: '',
  routes: {
    '': () => <DashboardScreen />,
  },
};
