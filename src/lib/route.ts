import { useEffect, useState } from 'react';

export type Route = { name: 'home' } | { name: 'list'; id: string };

// Hash routing works on any static host (GitHub Pages) and keeps the back button working.
function parseRoute(): Route {
  const match = window.location.hash.match(/^#\/lijst\/(.+)$/);
  return match ? { name: 'list', id: decodeURIComponent(match[1]) } : { name: 'home' };
}

export function openList(id: string) {
  window.location.hash = `#/lijst/${encodeURIComponent(id)}`;
}

export function goHome() {
  window.location.hash = '#/';
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
