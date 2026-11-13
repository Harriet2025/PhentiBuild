import { BACKEND } from '../config/env'

/**
 * Every backend path in ONE place, relative to API_BASE_URL.
 *
 * The two backends address a single record differently:
 *   PHP:    projects/index.php?id=5
 *   Django: projects/5/
 * `item()` hides that difference, so no component ever needs to know
 * which backend is running.
 */
export type Target = { path: string; query?: Record<string, string | number> }

const php = BACKEND === 'php'

/** A collection endpoint plus a way to address one record in it. */
function collection(phpPath: string, djangoPath: string) {
  return {
    list: php ? phpPath : djangoPath,
    item: (id: string | number): Target =>
      php ? { path: phpPath, query: { id } } : { path: `${djangoPath}${encodeURIComponent(String(id))}/` },
  }
}

/** A single-document endpoint (no id). */
const single = (phpPath: string, djangoPath: string) => (php ? phpPath : djangoPath)

export const endpoints = {
  ping: single('ping.php', 'ping/'),
  auth: {
    login: single('auth/login.php', 'auth/login/'),
    register: single('auth/register.php', 'auth/register/'),
    logout: single('auth/logout.php', 'auth/logout/'),
    me: single('auth/me.php', 'auth/me/'),
  },
  account: {
    profile: single('account/profile.php', 'account/profile/'),
    password: single('account/password.php', 'account/password/'),
  },
  companyProfile: single('company-profile/index.php', 'company-profile/'),
  projects: collection('projects/index.php', 'projects/'),
  measurements: collection('measurements/index.php', 'measurements/'),
  calculations: collection('calculations/index.php', 'calculations/'),
  materials: collection('materials/index.php', 'materials/'),
  boq: collection('boq/index.php', 'boq/'),
  reports: collection('reports/index.php', 'reports/'),
  history: collection('history/index.php', 'history/'),
  roofDesigns: single('roof-designs/index.php', 'roof-designs/'),
  roofAi: single('roof-ai/generate.php', 'roof-ai/generate/'),
  scannerDetect: single('scanner/detect.php', 'scanner/detect/'),
  exportExcel: single('export/excel.php', 'export/excel/'),
  contact: single('contact/submit.php', 'contact/'),
} as const

/** Auth endpoints answer 401 for a wrong password — that must not be
 *  treated as "your session expired". */
export const isAuthPath = (path: string) => path.startsWith('auth/')
