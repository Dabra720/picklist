import { useMemo, useState } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { Icon, type IconName } from '../../core/components/Icon';
import { relativeDay, dateKey, capitalize } from '../../core/lib/dates';
import { byOrder } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { DATE_FILTERS, KINDS, search, type DateFilter, type ResultKind } from './search';
import { tagUsage } from './store';
import { TagChips, TagManagerSheet } from './TagPicker';

const KIND_ICON: Record<ResultKind, IconName> = {
  list: 'checklist',
  note: 'note',
  task: 'task',
  template: 'template',
};
const MAX_RESULTS = 200;

/** One search over all modules, with filters for type, tags and date. */
export function SearchScreen() {
  const { data } = useAppState();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ResultKind | 'all'>('all');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [date, setDate] = useState<DateFilter>('all');
  const [managing, setManaging] = useState(false);

  const tags = useMemo(() => [...data.tags].sort(byOrder), [data.tags]);
  const usage = useMemo(() => tagUsage(data), [data]);
  const activeTags = tagIds.filter((id) => tags.some((t) => t.id === id));
  const filtering =
    query.trim() !== '' || kind !== 'all' || activeTags.length > 0 || date !== 'all';
  // Fast enough to run on every keystroke for thousands of records.
  const results = filtering ? search(data, { query, kind, tagIds: activeTags, date }) : [];

  const toggleTag = (id: string) =>
    setTagIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );

  return (
    <div className="screen">
      <header className="topbar">
        <MenuButton current="search" />
        <h1>Zoeken</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label="Tags beheren"
          onClick={() => setManaging(true)}
        >
          <Icon name="tag" />
        </button>
      </header>

      <main className="content">
        <label className="search search-large">
          <Icon name="search" size={20} />
          <input
            type="search"
            value={query}
            placeholder="Zoek in lijsten, taken, notities…"
            aria-label="Zoeken"
            autoComplete="off"
            name="search"
            enterKeyHint="search"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <div className="chips" role="radiogroup" aria-label="Soort">
          {[{ value: 'all' as const, label: 'Alles' }, ...KINDS].map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              className={`chip${kind === k.value ? ' chip-active' : ''}`}
              onClick={() => setKind(k.value)}
            >
              {k.label}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className="chips" role="group" aria-label="Filter op tag">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                aria-pressed={activeTags.includes(tag.id)}
                className={`chip${activeTags.includes(tag.id) ? ' chip-active' : ''}`}
                onClick={() => toggleTag(tag.id)}
              >
                <span className="dot" style={{ background: tag.color }} />
                {tag.name}
                <span className="chip-count">{usage.get(tag.id) ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        <select
          className="select search-date"
          aria-label="Gewijzigd"
          value={date}
          onChange={(event) => setDate(event.target.value as DateFilter)}
        >
          {DATE_FILTERS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        {!filtering ? (
          <div className="empty empty-compact">
            <div className="empty-mark">
              <Icon name="search" size={36} />
            </div>
            <h2>Zoek door alles</h2>
            <p>
              Typ een woord, of kies een tag of soort. Je vindt paklijsten en hun items, taken en
              subtaken, notities en templates.
            </p>
            {tags.length === 0 && (
              <button type="button" className="btn" onClick={() => setManaging(true)}>
                <Icon name="tag" size={18} />
                Tags maken
              </button>
            )}
          </div>
        ) : results.length === 0 ? (
          <div className="empty empty-compact">
            <h2>Niets gevonden</h2>
            <p>Probeer een ander woord of minder filters.</p>
          </div>
        ) : (
          <>
            <p className="result-count" role="status">
              {results.length === 1 ? '1 resultaat' : `${results.length} resultaten`}
            </p>
            <ul className="card task-list search-results">
              {results.slice(0, MAX_RESULTS).map((result) => (
                <li key={result.key}>
                  <button type="button" className="search-result" onClick={result.open}>
                    <Icon name={KIND_ICON[result.kind]} size={20} />
                    <span className="search-result-text">
                      <span className="task-title">{result.title}</span>
                      {result.snippet && <span className="search-snippet">{result.snippet}</span>}
                      <span className="task-meta">
                        {result.context && <span>{result.context}</span>}
                        <span>{capitalize(relativeDay(dateKey(new Date(result.updatedAt))))}</span>
                        <TagChips tagIds={result.tagIds} tags={tags} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      {managing && <TagManagerSheet onClose={() => setManaging(false)} />}
    </div>
  );
}
