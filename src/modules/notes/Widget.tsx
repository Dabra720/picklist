import { WidgetList } from '../../core/components/WidgetList';
import { useAppState } from '../../core/store';
import { openNote } from './routes';
import { formatNoteDate, isEmptyNote, noteHeading } from './util';

/** Dashboard: the most recently changed notes. */
export function NotesWidget() {
  const { data } = useAppState();
  const notes = data.notes.filter((n) => !isEmptyNote(n)).sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <WidgetList
      items={notes}
      max={3}
      empty="Nog geen notities."
      keyOf={(n) => n.id}
      render={(note) => (
        <button type="button" className="search-result" onClick={() => openNote(note.id)}>
          <span className="search-result-text">
            <span className="task-title">{noteHeading(note)}</span>
            <span className="task-meta">
              <span>{formatNoteDate(note.updatedAt)}</span>
            </span>
          </span>
        </button>
      )}
    />
  );
}
