/**
 * Inline line icons — the exact SVG paths from frontend/pages/app.php's
 * $icons array (no external icon library, same as before).
 */
const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" />
    </>
  ),
  projects: <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" />,
  scanner: (
    <>
      <path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  edit: <path d="M4 20l4.5-1L19 8.5a2 2 0 0 0 0-2.8l-.7-.7a2 2 0 0 0-2.8 0L5 15.5 4 20z" />,
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" /><line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="8" y2="11" /><line x1="12" y1="11" x2="12" y2="11" /><line x1="16" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="8" y2="15" /><line x1="12" y1="15" x2="12" y2="15" /><line x1="16" y1="15" x2="16" y2="17.5" />
      <line x1="8" y1="18.5" x2="12" y2="18.5" />
    </>
  ),
  materials: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M4 7.5L12 12l8-4.5" /><path d="M12 12v9" />
    </>
  ),
  roof: (
    <>
      <path d="M3 11L12 4l9 7" /><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
    </>
  ),
  boq: (
    <>
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" />
    </>
  ),
  reports: (
    <>
      <line x1="5" y1="20" x2="5" y2="12" /><line x1="12" y1="20" x2="12" y2="6" /><line x1="19" y1="20" x2="19" y2="15" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z" />,
}

export type IconName = keyof typeof PATHS

export function Icon({ name, strokeWidth = 1.7, className }: { name: IconName; strokeWidth?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
