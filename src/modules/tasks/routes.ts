import { navigate } from '../../core/router';

export const goTasks = () => navigate('taken');
export const openTask = (id: string) => navigate('taak', id);
