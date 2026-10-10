import { useEffect, useRef } from 'react';
import { AppMenuHost } from './app/AppMenu';
import { TabBar } from './app/TabBar';
import { ToastHost } from './core/components/ToastHost';
import { navigate, useRoute, type Route } from './core/router';
import { initStore, useAppState } from './core/store';
import { moduleFor } from './modules';

export function App() {
  const state = useAppState();
  const route = useRoute();
  const module = moduleFor(route.segment);
  const showHome = () => module.routes[module.home](undefined, state.data);
  const render = module.routes[route.segment];
  const routed = state.status === 'ready' && render ? render(route.param, state.data) : null;
  const missing = state.status === 'ready' && routed === null;
  // While going back from something that no longer exists, show the main screen right away.
  const screen = state.status === 'ready' ? (routed ?? showHome()) : null;

  // A link to something that no longer exists leads back to its module's main screen.
  useEffect(() => {
    if (missing) navigate(module.home);
  }, [missing, module.home]);

  // Let the module of the previous screen tidy up when it is left.
  const previous = useRef<Route | null>(null);
  useEffect(() => {
    const left = previous.current;
    if (left && (left.segment !== route.segment || left.param !== route.param)) {
      moduleFor(left.segment).onLeave?.(left);
    }
    previous.current = route;
  }, [route]);

  if (state.status === 'loading') {
    return <div className="splash" aria-busy="true" aria-label="Laden" />;
  }

  if (state.status === 'error') {
    return (
      <div className="screen">
        <div className="empty">
          <h2>De opslag is niet beschikbaar</h2>
          <p>
            Paklijsten bewaart je gegevens op dit apparaat, maar de browser staat dat nu niet toe.
            Dit gebeurt bijvoorbeeld in een privévenster.
          </p>
          <p className="error-text">{state.error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void initStore()}>
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {screen}
      {/* The tab bar is on the main screens; screens below them have their own back button. */}
      {route.segment === module.home && <TabBar current={module.id} />}
      <AppMenuHost />
      <ToastHost />
    </>
  );
}
