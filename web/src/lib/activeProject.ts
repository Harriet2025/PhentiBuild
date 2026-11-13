import { useSyncExternalStore } from 'react'

/**
 * The project new work is saved to — chosen once with <ActiveProjectPicker>
 * and remembered (per browser), so Calculators, Manual Input and the
 * Scanner all save into the same project until you pick another one.
 *
 * Only a convenience: the server re-checks every projectId it receives.
 */
const KEY = 'phb.activeProject.v1'
const listeners = new Set<() => void>()

function read(): number | null {
  try {
    const n = Number(localStorage.getItem(KEY))
    return Number.isInteger(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function setActiveProjectId(id: number | null): void {
  try {
    if (id) localStorage.setItem(KEY, String(id))
    else localStorage.removeItem(KEY)
  } catch { /* storage blocked — the choice just isn't remembered */ }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) listener() } // other tabs
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useActiveProjectId(): number | null {
  return useSyncExternalStore(subscribe, read, () => null)
}
