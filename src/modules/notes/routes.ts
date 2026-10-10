import { navigate } from '../../core/router';

export const goNotes = () => navigate('notities');
export const openNote = (id: string) => navigate('notitie', id);
