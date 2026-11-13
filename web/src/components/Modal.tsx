import { useEffect, type ReactNode } from 'react'

/**
 * The .modal-overlay / .modal markup from the PHP pages (styled by
 * components/modals.css). Always rendered; `open` toggles .is-open so the
 * original CSS transition still plays. Escape and a click on the dimmed
 * backdrop close it (unless `locked`, e.g. while saving), and page scroll
 * is locked while it is open — same behaviour as before.
 */
export function Modal({
  open, onClose, title, size, locked = false, children, footer, titleId,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  size?: 'sm' | 'lg'
  locked?: boolean
  children: ReactNode
  footer?: ReactNode
  titleId: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, locked, onClose])

  return (
    <div
      className={`modal-overlay${open ? ' is-open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !locked) onClose()
      }}
    >
      <div className={`modal${size ? ` modal-${size}` : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="modal-close" onClick={() => !locked && onClose()} aria-label="Close">&times;</button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}
