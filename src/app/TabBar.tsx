import { useEffect } from 'react';
import { Icon } from '../core/components/Icon';
import { navigate } from '../core/router';
import { MODULES } from '../modules';
import { openMenu, useTabs } from './navigation';

/** Bottom navigation on the main screens: four chosen modules plus "Meer" (the side menu). */
export function TabBar({ current }: { current: string }) {
  const tabs = useTabs();

  // Screens make room for the bar while it is shown.
  useEffect(() => {
    document.body.classList.add('has-tabbar');
    return () => document.body.classList.remove('has-tabbar');
  }, []);

  return (
    <nav className="tabbar" aria-label="Onderdelen">
      {tabs.map((id) => {
        const module = MODULES.find((candidate) => candidate.id === id)!;
        const active = id === current;
        return (
          <button
            key={id}
            type="button"
            className={`tab${active ? ' tab-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (!active) navigate(module.home);
            }}
          >
            <Icon name={module.icon} size={24} />
            <span>{module.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`tab${tabs.includes(current) ? '' : ' tab-active'}`}
        aria-haspopup="dialog"
        onClick={openMenu}
      >
        <Icon name="more" size={24} />
        <span>Meer</span>
      </button>
    </nav>
  );
}
