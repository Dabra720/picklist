import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'list'; id: string }
  | { name: 'notes' }
  | { name: 'note'; id: string };

// Hash routing works on any static host (GitHub Pages) and keeps the back button working.
function parseRoute(): Route {
  const hash = window.location.hash;
  const list = hash.match(/^#\/lijst\/(.+)$/);
  if (list) return { name: 'list', id: decodeURIComponent(list[1]) };
  const note = hash.match(/^#\/notitie\/(.+)$/);
  if (note) return { name: 'note', id: decodeURIComponent(note[1]) };
  if (hash === '#/notities') return { name: 'notes' };
  return { name: 'home' };
}

export function openList(id: string) {
  window.location.hash = `#/lijst/${encodeURIComponent(id)}`;
}

export function goHome() {
  window.location.hash = '#/';
}

export function goNotes() {
  window.location.hash = '#/notities';
}

export function openNote(id: string) {
  window.location.hash = `#/notitie/${encodeURIComponent(id)}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parseRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
