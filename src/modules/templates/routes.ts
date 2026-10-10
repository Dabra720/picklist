import { navigate } from '../../core/router';

export const goTemplates = () => navigate('templates');
export const openTemplate = (id: string) => navigate('template', id);
