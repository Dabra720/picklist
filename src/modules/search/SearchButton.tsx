import { Icon } from '../../core/components/Icon';
import { goSearch } from './routes';

/** Magnifier in the top bar of a main screen: search is reachable from everywhere. */
export function SearchButton() {
  return (
    <button type="button" className="icon-btn" aria-label="Zoeken" onClick={goSearch}>
      <Icon name="search" />
    </button>
  );
}
