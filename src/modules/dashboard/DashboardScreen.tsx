import { useState } from 'react';
import { MenuButton } from '../../app/AppMenu';
import { NameSheet } from '../../core/components/dialogs';
import { Icon, type IconName } from '../../core/components/Icon';
import { capitalize } from '../../core/lib/dates';
import { showToast } from '../../core/lib/toast';
import { navigate } from '../../core/router';
import { createNote } from '../notes/store';
import { openNote } from '../notes/routes';
import { ReminderSheet } from '../reminders/ReminderSheet';
import { SearchButton } from '../search/SearchButton';
import { openTask } from '../tasks/routes';
import { createTask } from '../tasks/store';
import { NewListSheet } from '../templates/NewListSheet';
import { CustomizeSheet } from './CustomizeSheet';
import { useDashboardLayout } from './widgets';

const longDate = new Intl.DateTimeFormat('nl', { weekday: 'long', day: 'numeric', month: 'long' });

function greeting(hour: number): string {
  if (hour < 6) return 'Goedenacht';
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

type Dialog = 'task' | 'reminder' | 'list' | 'customize';

/** The start screen: quick actions and a card per module, in the order the user chose. */
export function DashboardScreen() {
  const { ordered, hidden } = useDashboardLayout();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const now = new Date();
  const visible = ordered.filter((w) => !hidden.has(w.id));

  const actions: { label: string; icon: IconName; run: () => void }[] = [
    { label: 'Notitie', icon: 'note', run: () => openNote(createNote()) },
    { label: 'Taak', icon: 'task', run: () => setDialog('task') },
    { label: 'Herinnering', icon: 'bell', run: () => setDialog('reminder') },
    { label: 'Paklijst', icon: 'checklist', run: () => setDialog('list') },
  ];

  return (
    <div className="screen screen-wide">
      <header className="topbar">
        <MenuButton current="dashboard" />
        <div className="dashboard-title">
          <h1>{greeting(now.getHours())}</h1>
          <span>{capitalize(longDate.format(now))}</span>
        </div>
        <SearchButton />
        <button
          type="button"
          className="icon-btn"
          aria-label="Dashboard aanpassen"
          onClick={() => setDialog('customize')}
        >
          <Icon name="sliders" />
        </button>
      </header>

      <main className="content">
        <div className="quick-actions" role="group" aria-label="Snel toevoegen">
          {actions.map((action) => (
            <button key={action.label} type="button" className="quick-action" onClick={action.run}>
              <span className="quick-action-icon">
                <Icon name={action.icon} />
              </span>
              {action.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="empty empty-compact">
            <p>Alle blokken staan uit. Tik op het schuifjes-icoon om ze weer te tonen.</p>
          </div>
        ) : (
          <div className="widgets">
            {visible.map(({ id, title, more, Component }) => (
              <section key={id} className="card widget" aria-label={title}>
                <div className="widget-head">
                  <h2>{title}</h2>
                  {more !== undefined && (
                    <button type="button" className="widget-more" onClick={() => navigate(more)}>
                      Alles
                      <Icon name="chevronRight" size={16} />
                    </button>
                  )}
                </div>
                <Component />
              </section>
            ))}
          </div>
        )}
      </main>

      {dialog === 'task' && (
        <NameSheet
          title="Nieuwe taak"
          label="Taak"
          placeholder="Bijv. Boot reserveren"
          submitLabel="Toevoegen"
          onClose={close}
          onSubmit={(name) => {
            close();
            const id = createTask(name);
            if (id) showToast('Taak toegevoegd.', { label: 'Openen', run: () => openTask(id) });
          }}
        />
      )}
      {dialog === 'reminder' && <ReminderSheet onClose={close} />}
      {dialog === 'list' && <NewListSheet onClose={close} />}
      {dialog === 'customize' && <CustomizeSheet onClose={close} />}
    </div>
  );
}
