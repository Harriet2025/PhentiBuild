/**
 * Per-device preferences in localStorage — the SAME keys the PHP app used,
 * so values a user already saved carry over. Every access is guarded:
 * storage can be unavailable (private mode, blocked site data).
 */
const CONTINGENCY_KEY = 'phb.boq.contingency.v1'
const UNIT_SYSTEM_KEY = 'phb.settings.unitSystem.v1'
const DEFAULT_CONTINGENCY_PERCENT = 5

export type UnitSystem = 'metric' | 'imperial'

export function getContingencyPercent(): number {
  try {
    const raw = window.localStorage.getItem(CONTINGENCY_KEY)
    const value = raw !== null ? JSON.parse(raw) : null
    return typeof value === 'number' ? value : DEFAULT_CONTINGENCY_PERCENT
  } catch {
    return DEFAULT_CONTINGENCY_PERCENT
  }
}

export function setContingencyPercent(value: string | number): number {
  const parsed = parseFloat(String(value))
  const clean = isFinite(parsed) ? parsed : 0
  try {
    window.localStorage.setItem(CONTINGENCY_KEY, JSON.stringify(clean))
  } catch { /* storage unavailable — value just won't persist */ }
  return getContingencyPercent()
}

export function getUnitSystem(): UnitSystem {
  try {
    return window.localStorage.getItem(UNIT_SYSTEM_KEY) === 'imperial' ? 'imperial' : 'metric'
  } catch {
    return 'metric'
  }
}

export function setUnitSystem(value: UnitSystem): void {
  try {
    window.localStorage.setItem(UNIT_SYSTEM_KEY, value)
  } catch { /* ignore */ }
}
