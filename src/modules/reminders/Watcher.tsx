import { useEffect, useRef } from 'react';
import { showToast } from '../../core/lib/toast';
import { getData, useAppState } from '../../core/store';
import { goReminders } from './routes';
import { dueAt, isDue } from './util';

/** Reminders that already had their in-app notice this session. */
const announced = new Set<string>();

/**
 * Shows an in-app notice when reminders become due while the app is open (and once at start for
 * those already due), and puts the number of due reminders on the app icon where supported.
 * Returns true when a notice was shown.
 */
export function announceDueReminders(now = Date.now()): boolean {
  const due = getData().reminders.filter(
    (r) => isDue(r, now) && !announced.has(`${r.id}@${dueAt(r)}`),
  );
  if (due.length === 0) return false;
  due.forEach((r) => announced.add(`${r.id}@${dueAt(r)}`));
  const message =
    due.length === 1
      ? `Herinnering: ${due[0].title}`
      : `${due.length} herinneringen: ${due.map((r) => r.title).join(', ')}`;
  showToast(message, { label: 'Bekijken', run: goReminders });
  return true;
}

function updateBadge(count: number) {
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) void nav.setAppBadge?.(count)?.catch(() => undefined);
    else void nav.clearAppBadge?.()?.catch(() => undefined);
  } catch {
    // Not supported here; the in-app list still shows everything.
  }
}

/** Runs in the background while the app is open (see AppModule.Background). */
export function ReminderWatcher() {
  const { status, data } = useAppState();
  const started = useRef(false);

  useEffect(() => {
    if (status !== 'ready') return;
    updateBadge(data.reminders.filter((r) => isDue(r)).length);
  }, [status, data.reminders]);

  useEffect(() => {
    if (status !== 'ready' || started.current) return;
    started.current = true;
    const timer = setInterval(() => {
      announceDueReminders();
      updateBadge(getData().reminders.filter((r) => isDue(r)).length);
    }, 30_000);
    return () => clearInterval(timer);
  }, [status]);

  return null;
}
