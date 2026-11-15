import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Faq } from './content'
import { Glyph, Ruler } from './drawing'

/** Dark header band for inner pages, styled like a drawing's title area. */
export function PageHero({ sheet, kicker, title, lead, children }: { sheet: string; kicker: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <section className="ps-pagehero ps-grid-dark">
        <div className="ps-container">
          <p className="ps-sheet-tag ps-sheet-tag--light"><span className="ps-sheet-no">{sheet}</span><span className="ps-sheet-rule" aria-hidden="true" /><span>{kicker}</span></p>
          <h1 className="ps-pagehero-title">{title}</h1>
          {lead && <p className="ps-pagehero-lead">{lead}</p>}
          {children}
        </div>
      </section>
      <Ruler dark />
    </>
  )
}

/** Closing call to action. */
export function CtaBand({ title = 'Put your next estimate on one sheet.', text = 'Create a free account and price your first wall in minutes.' }: { title?: string; text?: string }) {
  const { status } = useAuth()
  return (
    <section className="ps-cta ps-grid-dark">
      <div className="ps-container ps-cta-inner">
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
        <div className="ps-cta-actions">
          {status === 'authenticated'
            ? <Link to="/dashboard" className="btn btn-primary btn-lg">Open your dashboard</Link>
            : <><Link to="/register" className="btn btn-primary btn-lg">Get started</Link><Link to="/contact" className="btn ps-btn-ghost btn-lg">Talk to us</Link></>}
        </div>
      </div>
    </section>
  )
}

/** Accessible accordion built on <details>. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="ps-faq">
      {items.map((f) => (
        <details key={f.q} className="ps-faq-item">
          <summary><span>{f.q}</span><span className="ps-faq-sign" aria-hidden="true" /></summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  )
}

/**
 * A real app screenshot in a browser frame, with drawing-style callouts.
 * notes: x / y are percentages of the screenshot.
 */
export function ProductShot({ src, alt, notes = [] }: { src: string; alt: string; notes?: { x: number; y: number; text: string }[] }) {
  return (
    <figure className="ps-shot">
      <div className="ps-shot-bar" aria-hidden="true"><span /><span /><span /><em>app.phentibuild</em></div>
      <div className="ps-shot-body">
        <img src={src} alt={alt} loading="lazy" />
        {notes.map((n, i) => (
          <span key={i} className={`ps-note${n.x > 60 ? ' ps-note--left' : ''}`} style={{ left: `${n.x}%`, top: `${n.y}%` }}>
            <span className="ps-note-dot">{i + 1}</span><span className="ps-note-text">{n.text}</span>
          </span>
        ))}
      </div>
      {notes.length > 0 && (
        <figcaption className="ps-shot-key">
          {notes.map((n, i) => <span key={i}><b>{i + 1}</b>{n.text}</span>)}
        </figcaption>
      )}
    </figure>
  )
}

export function Checklist({ items }: { items: string[] }) {
  return <ul className="ps-checks">{items.map((t) => <li key={t}><Glyph name="check" />{t}</li>)}</ul>
}
