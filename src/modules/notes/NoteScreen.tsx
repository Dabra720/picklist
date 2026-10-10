import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActionSheet, ConfirmDialog } from '../../core/components/dialogs';
import { Icon } from '../../core/components/Icon';
import { goNotes } from './routes';
import { showToast } from '../../core/lib/toast';
import { plainInput } from '../../core/lib/util';
import { formatNoteDate, isEmptyNote } from './util';
import { deleteNote, restoreNote, updateNote } from './store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { MAX_NOTE_LENGTH, type Note } from './types';

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
  const fitToText = useCallback(() => {
    const element = textarea.current;
    if (!element) return;
    // Collapsing the box to measure it shortens the page for a moment, which would make the
    // browser jump to the top; keep the scroll position where it was.
    const scrollY = window.scrollY;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
    if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
  }, []);

  useLayoutEffect(fitToText, [body, fitToText]);

  // Text wraps differently after rotating the phone or resizing the window.
  useEffect(() => {
    const element = textarea.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      fitToText();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fitToText]);

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
