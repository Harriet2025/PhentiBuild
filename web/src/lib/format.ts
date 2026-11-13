import type { ProjectStatus } from '../api/resources/projects'
import type { HistoryAction } from '../api/resources/records'

/** Same wording as relativeTime() in dashboard.js. */
export function relativeTime(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return ''
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'Last week'
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export const STATUS_BADGE: Record<ProjectStatus, string> = {
  Planning: 'badge-info',
  'In Progress': 'badge-primary',
  'On Hold': 'badge-warning',
  Completed: 'badge-success',
  Archived: 'badge-neutral',
}

export const ACTION_BADGE: Record<HistoryAction, string> = {
  created: 'badge-success',
  updated: 'badge-info',
  deleted: 'badge-danger',
  deactivated: 'badge-warning',
  reactivated: 'badge-success',
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
