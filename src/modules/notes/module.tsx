import type { AppModule } from '../../core/modules';
import { notesBackup } from './backup';
import { NoteScreen } from './NoteScreen';
import { NotesScreen } from './NotesScreen';
import { discardIfEmpty, removeEmptyNotes } from './store';

export const notesModule: AppModule = {
  id: 'notes',
  label: 'Notities',
  icon: 'note',
  home: 'notities',
  routes: {
    notities: () => <NotesScreen />,
    notitie: (id, data) => {
      const note = data.notes.find((candidate) => candidate.id === id);
      return note ? <NoteScreen key={note.id} note={note} /> : null;
    },
  },
  // A new note that was left without writing anything is removed again.
  onLeave: (route) => {
    if (route.segment === 'notitie' && route.param) discardIfEmpty(route.param);
  },
  loadHooks: [removeEmptyNotes],
  backup: notesBackup,
};
