import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Modal } from './Modal'

/**
 * Port of the shared confirm dialog (window.PhB.confirmAction in
 * projects.js). Any screen calls:
 *   const confirm = useConfirm()
 *   confirm({ title, message, acceptLabel: 'Delete', danger: true, onAccept })
 */
type ConfirmOptions = {
  title: string
  message: string
  acceptLabel: string
  danger?: boolean
  onAccept: () => void | Promise<void>
}

const ConfirmContext = createContext<(options: ConfirmOptions) => void>(() => {})

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null)
  const close = useCallback(() => setPending(null), [])

  return (
    <ConfirmContext.Provider value={setPending}>
      {children}
      <Modal
        open={pending !== null}
        onClose={close}
        title={pending?.title ?? 'Confirm'}
        size="sm"
        titleId="confirmTitle"
        footer={
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={close}>Cancel</button>
            <button
              type="button"
              className={`btn ${pending?.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => {
                const action = pending?.onAccept
                close()
                void action?.()
              }}
            >
              {pending?.acceptLabel ?? 'Confirm'}
            </button>
          </div>
        }
      >
        <div className="modal-body">
          <p>{pending?.message}</p>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => useContext(ConfirmContext)
