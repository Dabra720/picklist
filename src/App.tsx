import { useEffect } from 'react';
import { ToastHost } from './components/ToastHost';
import { goHome, useRoute } from './lib/route';
import { HomeScreen } from './screens/HomeScreen';
import { ListScreen } from './screens/ListScreen';
import { initStore, useAppState } from './store/store';

export function App() {
  const state = useAppState();
  const route = useRoute();

  const list =
    route.name === 'list' ? state.data.lists.find((candidate) => candidate.id === route.id) : undefined;
  const missingList = state.status === 'ready' && route.name === 'list' && !list;

  // A link to a list that no longer exists leads back to the overview.
  useEffect(() => {
    if (missingList) goHome();
  }, [missingList]);

  if (state.status === 'loading') {
    return <div className="splash" aria-busy="true" aria-label="Laden" />;
  }

  if (state.status === 'error') {
    return (
      <div className="screen">
        <div className="empty">
          <h2>De opslag is niet beschikbaar</h2>
          <p>
            Paklijsten bewaart je lijsten op dit apparaat, maar de browser staat dat nu niet toe.
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
      {list ? <ListScreen key={list.id} list={list} /> : <HomeScreen />}
      <ToastHost />
    </>
  );
}
