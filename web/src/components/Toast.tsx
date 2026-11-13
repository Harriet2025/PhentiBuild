import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Port of frontend/js/toast.js: one toast at a time (a new one replaces
 * the previous), auto-hides after 3.2s, same .phb-toast classes so
 * styles/components/toast.css styles it identically.
 */
export type ToastVariant = 'success' | 'danger' | undefined
type ToastState = { id: number; message: string; variant: ToastVariant } | null
type ToastFn = (message: string, variant?: ToastVariant) => void

const ToastContext = createContext<ToastFn>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ToastFn>((message, variant) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), message, variant })
    timer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.id} className={`phb-toast${toast.variant ? ` phb-toast-${toast.variant}` : ''}`} role="status">
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
