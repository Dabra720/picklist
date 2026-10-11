import { useCallback, useEffect, useRef } from 'react';

/**
 * Saves typed text after a short pause, and always when the screen is left or the app goes to
 * the background (iOS may close a backgrounded app without warning).
 */
export function useAutosave<T>(save: (value: T) => void, delay = 400) {
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (pending.current) {
      const { value } = pending.current;
      pending.current = null;
      saveRef.current(value);
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [delay, flush],
  );

  /** Drops what was not saved yet (e.g. when the thing is deleted). */
  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = null;
  }, []);

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

  return { schedule, flush, cancel };
}

/** Lets a textarea grow with its text, so the page scrolls as a whole (smoother on iOS). */
export function fitTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  const scrollY = window.scrollY;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
  if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
}
