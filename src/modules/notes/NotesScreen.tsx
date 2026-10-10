import { useMemo, useState } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { Icon } from '../../core/components/Icon';
import { openNote } from './routes';
import { plainInput } from '../../core/lib/util';
import { formatNoteDate, isEmptyNote, noteHeading } from './util';
import { useAppState } from '../../core/store';
import { createNote } from './store';

/** Overview of all notes, most recently changed first. */
export function NotesScreen() {
  const { data } = useAppState();
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase('nl');

  const notes = useMemo(
    () => data.notes.filter((note) => !isEmptyNote(note)).sort((a, b) => b.updatedAt - a.updatedAt),
    [data.notes],
  );
  const visible = search
    ? notes.filter((note) => `${note.title}\n${note.body}`.toLocaleLowerCase('nl').includes(search))
    : notes;

  return (
    <div className="screen">
      <header className="topbar">
        <MenuButton current="notes" />
        <h1>Notities</h1>
      </header>

      <main className="content">
        {notes.length === 0 ? (
          <div className="empty">
            <div className="empty-mark">
              <Icon name="note" size={36} />
            </div>
            <h2>Nog geen notities</h2>
            <p>Houd hier bij wat niet in een paklijst past: reisgegevens, adressen of ideeën.</p>
          </div>
        ) : (
          <>
            <label className="search">
              <Icon name="search" size={20} />
              <input
                type="search"
                value={query}
                placeholder="Zoek in notities"
                aria-label="Zoek in notities"
                {...plainInput}
                enterKeyHint="search"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {visible.length === 0 ? (
              <div className="empty empty-compact">
                <h2>Niets gevonden</h2>
                <p>Geen notitie bevat “{query.trim()}”.</p>
              </div>
            ) : (
              <ul className="card-list">
                {visible.map((note) => {
                  const heading = noteHeading(note);
                  // Without a title the first line is already the heading; show the rest.
                  const preview = (
                    note.title.trim() ? note.body : note.body.trim().split('\n').slice(1).join(' ')
                  )
                    .replace(/\s+/g, ' ')
                    .trim();
                  return (
                    <li key={note.id} className="card">
                      <button type="button" className="note-card" onClick={() => openNote(note.id)}>
                        <span className="note-card-title">{heading}</span>
                        {preview && <span className="note-card-preview">{preview}</span>}
                        <span className="note-card-date">{formatNoteDate(note.updatedAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>

      <div className="bottom-bar">
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => openNote(createNote())}
        >
          <Icon name="plus" />
          Nieuwe notitie
        </button>
      </div>
    </div>
  );
}
