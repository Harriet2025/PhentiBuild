import type { ReactNode } from 'react'

/**
 * The website's visual language: a construction drawing.
 * Sheet numbers, dimension lines and a tape-measure ruler - so PhentiBuild
 * reads as construction technology, not a generic SaaS template.
 */

/** "A-02 ── FEATURES" heading in drawing-sheet style. */
export function Sheet({ no, kicker, title, lead, align = 'left', dark = false, id }: {
  no: string; kicker: string; title: ReactNode; lead?: ReactNode; align?: 'left' | 'center'; dark?: boolean; id?: string
}) {
  return (
    <header className={`ps-sheet ps-sheet--${align}${dark ? ' ps-sheet--dark' : ''}`} id={id}>
      <p className="ps-sheet-tag"><span className="ps-sheet-no">{no}</span><span className="ps-sheet-rule" aria-hidden="true" /><span>{kicker}</span></p>
      <h2 className="ps-sheet-title">{title}</h2>
      {lead && <p className="ps-sheet-lead">{lead}</p>}
    </header>
  )
}

/** A dimension line: |◄──── 4.50 m ────►| */
export function Dim({ label, vertical = false, className = '' }: { label: string; vertical?: boolean; className?: string }) {
  return (
    <span className={`ps-dim${vertical ? ' ps-dim--v' : ''} ${className}`} aria-hidden="true">
      <span className="ps-dim-line" />
      <span className="ps-dim-label">{label}</span>
      <span className="ps-dim-line" />
    </span>
  )
}

/** Tape-measure ruler used as a divider between sections. */
export function Ruler({ dark = false }: { dark?: boolean }) {
  return <div className={`ps-ruler${dark ? ' ps-ruler--dark' : ''}`} aria-hidden="true"><span>0</span><span>1 m</span><span>2 m</span><span>3 m</span><span>4 m</span><span>5 m</span></div>
}

/** Small line-drawing icons for the site (stroke = currentColor). */
const PATHS: Record<string, ReactNode> = {
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><rect x="8" y="6" width="8" height="3" /><path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" /></>,
  materials: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></>,
  boq: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 11h5M10 15h5M10 19h3" /></>,
  roof: <><path d="M3 12l9-7 9 7" /><path d="M5 10.5V20h14v-9.5" /><path d="M9 20v-5h6v5" /></>,
  project: <><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /></>,
  camera: <><path d="M4 8a1 1 0 0 1 1-1h2l1.5-2h7L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><circle cx="12" cy="13" r="3.2" /></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  ruler: <><rect x="2" y="8" width="20" height="8" rx="1" /><path d="M6 8v3M10 8v4M14 8v3M18 8v4" /></>,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
  chat: <path d="M4 20l1.5-4A8 8 0 1 1 9 19z" />,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  map: <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  hardhat: <><path d="M4 16h16M6 16v-3a6 6 0 0 1 12 0v3" /><path d="M10 7.5V5h4v2.5M3 19h18" /></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
  compass: <><circle cx="12" cy="5" r="2" /><path d="M11 7l-5 13M13 7l5 13M8 15h8" /></>,
  hammer: <><path d="M14 4l6 6-3 3-6-6z" /><path d="M11 7L3 15l3 3 8-8" /></>,
  student: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></>,
  site: <><path d="M3 21V9l9-6 9 6v12" /><path d="M8 21v-7h8v7M3 21h18" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

export function Glyph({ name, className = '' }: { name: keyof typeof PATHS | string; className?: string }) {
  return (
    <svg className={`ps-glyph ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] ?? PATHS.check}
    </svg>
  )
}
