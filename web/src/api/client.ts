import { API_BASE_URL } from '../config/env'
import { isAuthPath, type Target } from './endpoints'

/**
 * The one HTTP helper every API call goes through.
 *
 * It replaces the request() function that was copy-pasted into ~8 of the
 * old vanilla JS store files, and keeps their exact behaviour:
 *   - never throws — every outcome becomes an ApiResult
 *   - `network: true` when the server could not be reached at all
 *   - the backend's own `error` / per-field `errors` are passed through
 *
 * Response envelope (identical for the PHP and Django backends):
 *   { success: true,  data: ..., ...meta }
 *   { success: false, error: "...", errors?: { field: "message" } }
 */

export type ApiSuccess<T> = { ok: true; data: T; status: number; meta: Record<string, unknown> }
export type ApiFailure = {
  ok: false
  status?: number
  network?: boolean
  notFound?: boolean
  error: string
  errors?: Record<string, string> | null
}
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

type Query = Record<string, string | number | undefined | null>
type RequestOptions = { query?: Query; body?: unknown; signal?: AbortSignal }
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Fired when any protected call returns 401, so the auth layer can send
 *  the user back to the login screen (session expired / logged out). */
export const UNAUTHORIZED_EVENT = 'phb:unauthorized'

const CSRF_COOKIE = 'phb_csrftoken'

/** Django's CSRF token lives in a readable cookie; it must be echoed back
 *  in the X-CSRFToken header on every state-changing request. (The SESSION
 *  cookie stays HttpOnly — JavaScript never sees it.) */
function csrfToken(): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CSRF_COOKIE}=`))
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null
}

export function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}/${path.replace(/^\/+/, '')}`
  if (!query) return url
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  })
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function request<T>(method: Method, target: string | Target, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const path = typeof target === 'string' ? target : target.path
  const query = { ...(typeof target === 'string' ? {} : target.query), ...options.query }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') {
    const token = csrfToken()
    if (token) headers['X-CSRFToken'] = token
  }
  const init: RequestInit = { method, headers, credentials: 'same-origin', signal: options.signal }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return { ok: false, network: true, error: 'Could not reach the server. Check your connection and try again.' }
  }

  let payload: ({ success?: boolean; data?: T; error?: string; errors?: Record<string, string> } & Record<string, unknown>) | null = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON body (e.g. a proxy error page) — still a server error,
    // never shown raw to the user.
  }

  if (!response.ok) {
    if (response.status === 401 && !isAuthPath(path)) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return {
      ok: false,
      status: response.status,
      notFound: response.status === 404,
      error: payload?.error || `The server returned an unexpected error (${response.status}).`,
      errors: payload?.errors ?? null,
    }
  }

  const { success: _s, data, error: _e, errors: _es, ...meta } = payload ?? {}
  return { ok: true, status: response.status, data: (data ?? null) as T, meta }
}

/** Backend dates arrive as "YYYY-MM-DD HH:MM:SS" (MySQL DATETIME). */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value.replace(' ', 'T'))
  return isNaN(date.getTime()) ? null : date
}
