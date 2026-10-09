import { useEffect, useRef } from 'react';
import { ToastHost } from './components/ToastHost';
import { goHome, goNotes, useRoute } from './lib/route';
import { HomeScreen } from './screens/HomeScreen';
import { ListScreen } from './screens/ListScreen';
import { NoteScreen } from './screens/NoteScreen';
import { NotesScreen } from './screens/NotesScreen';
import { discardIfEmpty, initStore, useAppState } from './store/store';

export function App() {
  const state = useAppState();
  const route = useRoute();

  const list =
    route.name === 'list'
      ? state.data.lists.find((candidate) => candidate.id === route.id)
      : undefined;
  const note =
    route.name === 'note'
      ? state.data.notes.find((candidate) => candidate.id === route.id)
      : undefined;
  const missingList = state.status === 'ready' && route.name === 'list' && !list;
  const missingNote = state.status === 'ready' && route.name === 'note' && !note;

  // A link to a list or note that no longer exists leads back to its overview.
  useEffect(() => {
    if (missingList) goHome();
    if (missingNote) goNotes();
  }, [missingList, missingNote]);

  // A new note that was left without writing anything is removed again.
  const openNoteId = route.name === 'note' ? route.id : null;
  const previousNoteId = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousNoteId.current;
    if (previous && previous !== openNoteId) discardIfEmpty(previous);
    previousNoteId.current = openNoteId;
  }, [openNoteId]);

  if (state.status === 'loading') {
    return <div className="splash" aria-busy="true" aria-label="Laden" />;
  }

  if (state.status === 'error') {
    return (
      <div className="screen">
        <div className="empty">
          <h2>De opslag is niet beschikbaar</h2>
          <p>
            Paklijsten bewaart je lijsten op dit apparaat, maar de browser staat dat nu niet toe.
            Dit gebeurt bijvoorbeeld in een privévenster.
          </p>
          <p className="error-text">{state.error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void initStore()}>
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  let screen;
  if (list) screen = <ListScreen key={list.id} list={list} />;
  else if (note) screen = <NoteScreen key={note.id} note={note} />;
  else if (route.name === 'notes' || route.name === 'note') screen = <NotesScreen />;
  else screen = <HomeScreen />;

  return (
    <>
      {screen}
      <ToastHost />
    </>
  );
}
