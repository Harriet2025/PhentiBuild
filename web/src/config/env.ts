/**
 * Central frontend configuration — the ONLY place the backend is chosen.
 *
 *   VITE_BACKEND=django  (default) → Django REST API at /api
 *   VITE_BACKEND=php                → legacy PHP API at /PhentiBuild/backend/api
 *
 * In development the Vite proxy (vite.config.ts) forwards /api to Django
 * on :8000 and /PhentiBuild/backend to XAMPP's Apache. In production,
 * Vercel forwards /api to the Django server on Coolify (web/vercel.json),
 * so the browser only ever talks to ONE origin and the session cookie
 * stays first-party.
 *
 * Vite only exposes variables that start with VITE_ to the browser —
 * never put secrets in them.
 */

export type BackendKind = 'django' | 'php'

export const BACKEND: BackendKind = import.meta.env.VITE_BACKEND === 'php' ? 'php' : 'django'

const DEFAULT_API_BASE_URL = BACKEND === 'php' ? '/PhentiBuild/backend/api' : '/api'

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || DEFAULT_API_BASE_URL

export const APP_NAME = 'PhentiBuild'

/**
 * The original PHP app. Modules not yet migrated to React link here so
 * no existing functionality is ever out of reach during the migration.
 * Leave VITE_CLASSIC_APP_URL empty in production to hide those links.
 */
export const CLASSIC_APP_URL: string =
  import.meta.env.VITE_CLASSIC_APP_URL ?? (import.meta.env.DEV ? 'http://localhost/PhentiBuild/frontend/pages/app.php' : '')
