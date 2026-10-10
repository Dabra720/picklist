import { uid } from '../../core/lib/util';
import { commit, getData, type LoadHook } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import type { Note } from './types';
import { cleanNoteBody, isEmptyNote } from './util';

/** A note that was opened but never written in is not worth keeping. */
export const removeEmptyNotes: LoadHook = (data) => {
  const empty = data.notes.filter(isEmptyNote).map((note) => note.id);
  if (empty.length === 0) return { data };
  return {
    data: { ...data, notes: data.notes.filter((note) => !isEmptyNote(note)) },
    writes: [{ store: 'notes', remove: empty }],
  };
};

export function createNote(): string {
  const data = getData();
  const now = Date.now();
  const note: Note = { id: uid(), title: '', body: '', createdAt: now, updatedAt: now };
  commit({ ...data, notes: [...data.notes, note] }, [{ store: 'notes', put: [note] }]);
  return note.id;
}

export function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'body'>>) {
  const data = getData();
  const current = data.notes.find((n) => n.id === id);
  if (!current) return;
  const updated: Note = {
    ...current,
    title: patch.title !== undefined ? patch.title.slice(0, MAX_NAME_LENGTH) : current.title,
    body: patch.body !== undefined ? cleanNoteBody(patch.body) : current.body,
  };
  if (updated.title === current.title && updated.body === current.body) return;
  updated.updatedAt = Date.now();
  commit({ ...data, notes: data.notes.map((n) => (n.id === id ? updated : n)) }, [
    { store: 'notes', put: [updated] },
  ]);
}

export function deleteNote(id: string) {
  const data = getData();
  if (!data.notes.some((n) => n.id === id)) return;
  commit({ ...data, notes: data.notes.filter((n) => n.id !== id) }, [
    { store: 'notes', remove: [id] },
  ]);
}

/** Removes a note silently if nothing was written in it (used when leaving a new note). */
export function discardIfEmpty(id: string) {
  const note = getData().notes.find((n) => n.id === id);
  if (note && isEmptyNote(note)) deleteNote(id);
}

/** Puts back a note exactly as it was (used to undo a delete). */
export function restoreNote(note: Note) {
  const data = getData();
  if (data.notes.some((n) => n.id === note.id)) return;
  commit({ ...data, notes: [...data.notes, note] }, [{ store: 'notes', put: [note] }]);
}
