import { useEffect, useState } from 'react';

/**
 * A hash route: `#/<segment>/<param>`, e.g. `#/lijst/<id>` or `#/notities`. The start screen is
 * the empty segment. Hash routing works on any static host (GitHub Pages) and keeps the back
 * button working.
 */
export interface Route {
  segment: string;
  param?: string;
}

function parseRoute(): Route {
  const match = window.location.hash.match(/^#\/([^/]*)(?:\/(.+))?$/);
  if (!match) return { segment: '' };
  return {
    segment: match[1],
    param: match[2] === undefined ? undefined : decodeURIComponent(match[2]),
  };
}

export function navigate(segment: string, param?: string) {
  window.location.hash =
    param === undefined ? `#/${segment}` : `#/${segment}/${encodeURIComponent(param)}`;
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
