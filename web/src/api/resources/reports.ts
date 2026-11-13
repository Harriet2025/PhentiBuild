import { buildUrl, request } from '../client'
import { endpoints } from '../endpoints'

export type Report = {
  id: number
  title: string
  type: string
  project_id: number | null
  notes: string | null
  content: Record<string, unknown> | null
  created_at: string
  updated_at: string
  ownerName?: string | null
}

export type DownloadResult = { ok: true; filename: string } | { ok: false; error: string }

/** Pull the filename out of `Content-Disposition: attachment; filename="..."`. */
function filenameFrom(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^";]+)"?/i)
  return match ? match[1] : fallback
}

export const reportsApi = {
  list: (filter: { projectId?: number } = {}) => request<Report[]>('GET', endpoints.reports.list, { query: filter }),

  /**
   * Generates and downloads the Excel workbook. Uses fetch (not a page
   * navigation) so a server error is shown in the page instead of
   * replacing it with raw JSON.
   */
  async downloadExcel(projectId: number | null): Promise<DownloadResult> {
    const url = buildUrl(endpoints.exportExcel, projectId ? { projectId } : undefined)
    let response: Response
    try {
      response = await fetch(url, { credentials: 'same-origin' })
    } catch {
      return { ok: false, error: 'Could not reach the server. Check your connection and try again.' }
    }
    if (!response.ok) {
      let message = `The server returned an unexpected error (${response.status}).`
      try {
        message = (await response.json()).error || message
      } catch { /* not JSON */ }
      return { ok: false, error: message }
    }
    const blob = await response.blob()
    const filename = filenameFrom(response.headers.get('Content-Disposition'), 'PhentiBuild-Export.xlsx')
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
    return { ok: true, filename }
  },
}
