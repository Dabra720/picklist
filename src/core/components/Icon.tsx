const PATHS = {
  back: 'M15 5l-7 7 7 7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  checkAll: 'M2 12.5l4.5 4.5L15 8M11.5 16l1 1L22 8',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  tag: 'M3 12V4h8l10 10-8 8L3 12zM7.5 8h.01',
  reset: 'M4 12a8 8 0 108-8H7M10 1L7 4l3 3',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  close: 'M6 6l12 12M18 6L6 18',
  uncheck: 'M5 5h14v14H5z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  note: 'M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h5',
  template: 'M8 3h11v13H8zM5 7v14h11M11 7.5h5M11 11.5h5',
  folder: 'M3 6h6l2 2h10v11H3z',
  checklist: 'M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5',
} as const;

export type IconName = keyof typeof PATHS;

const DOTTED: IconName[] = ['more', 'grip'];

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={DOTTED.includes(name) ? 2.6 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
