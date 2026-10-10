import { navigate } from '../../core/router';

export const goHabits = () => navigate('gewoontes');
export const openHabit = (id: string) => navigate('gewoonte', id);
