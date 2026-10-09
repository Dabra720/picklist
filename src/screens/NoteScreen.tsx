import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionSheet, ConfirmDialog } from '../components/dialogs';
import { Icon } from '../components/Icon';
import { goNotes } from '../lib/route';
import { showToast } from '../lib/toast';
import { formatNoteDate, isEmptyNote, plainInput } from '../lib/util';
import { deleteNote, restoreNote, updateNote } from '../store/store';
import { MAX_NAME_LENGTH, MAX_NOTE_LENGTH, type Note } from '../types';

// Typing is saved after a short pause, and always when leaving the note or the app.
const SAVE_DELAY = 400;

type Dialog = 'menu' | 'delete';

export function NoteScreen({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const pending = useRef<{ title: string; body: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current) {
      updateNote(note.id, pending.current);
      pending.current = null;
    }
  }, [note.id]);

  const schedule = (next: { title: string; body: string }) => {
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  };

  // Save when the note is left, and when the app goes to the background (iOS may close it then).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  // Grow the text area with its content so the page scrolls as a whole (smoother on iOS).
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [body]);

  // A brand-new note starts with the cursor in the text.
  useEffect(() => {
    if (isEmptyNote(note)) textarea.current?.focus();
    // Only when the note is opened, not on every save.
  }, [note.id]);

  const remove = () => {
    pending.current = null;
    clearTimeout(timer.current);
    const snapshot: Note = { ...note, title, body };
    deleteNote(note.id);
    goNotes();
    if (!isEmptyNote(snapshot)) {
      showToast('Notitie verwijderd.', {
        label: 'Ongedaan maken',
        run: () => restoreNote(snapshot),
      });
    }
  };

  return (
    <div className="screen">
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Terug naar notities"
          onClick={goNotes}
        >
          <Icon name="back" />
        </button>
        <span className="topbar-title note-date">
          {isEmptyNote({ title, body })
            ? 'Nieuwe notitie'
            : `Bewerkt ${formatNoteDate(note.updatedAt)}`}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Opties voor deze notitie"
          onClick={() => setDialog('menu')}
        >
          <Icon name="more" />
        </button>
      </header>

      <main className="content note-editor">
        <input
          type="text"
          className="note-title"
          value={title}
          placeholder="Titel"
          aria-label="Titel"
          maxLength={MAX_NAME_LENGTH}
          {...plainInput}
          enterKeyHint="next"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              textarea.current?.focus();
            }
          }}
          onChange={(event) => {
            setTitle(event.target.value);
            schedule({ title: event.target.value, body });
          }}
        />
        <textarea
          ref={textarea}
          className="note-body"
          value={body}
          placeholder="Schrijf hier je notitie"
          aria-label="Notitie"
          maxLength={MAX_NOTE_LENGTH}
          autoComplete="off"
          onChange={(event) => {
            setBody(event.target.value);
            schedule({ title, body: event.target.value });
          }}
        />
      </main>

      {dialog === 'menu' && (
        <ActionSheet
          title={title.trim() || 'Notitie'}
          onClose={() => setDialog(null)}
          actions={[
            { label: 'Verwijderen', icon: 'trash', danger: true, run: () => setDialog('delete') },
          ]}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          title="Notitie verwijderen?"
          message="De notitie wordt van dit apparaat verwijderd."
          confirmLabel="Verwijderen"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
