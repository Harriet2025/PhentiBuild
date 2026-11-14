import { request } from '../client'
import { endpoints } from '../endpoints'

/** What a person does — they choose it at sign-up and can change it in Settings. */
export const PROFESSIONS = ['Contractor', 'Site Manager', 'Quantity Surveyor', 'Draftsman', 'Other'] as const
export type Profession = (typeof PROFESSIONS)[number]

/**
 * What a person may do in the app. Nobody can become Admin through the
 * website — Admin is granted on the server (`python manage.py create_admin`)
 * and the Django backend enforces it.
 */
export type AccessLevel = 'Admin' | 'Member'

export type CurrentUser = {
  id: number
  name: string
  email: string
  phone: string
  /** Django: 'Admin' | 'Member'. The classic PHP API still returns the old combined role. */
  role: AccessLevel | string
  /** Missing on the classic PHP API; null for an Admin who has not picked one yet. */
  profession?: Profession | null
  /** Django: false for accounts created with Google (no password yet). */
  hasPassword?: boolean
}

export type AuthProviders = { google: { clientId: string } | null }

/** POST auth/google/ answers with one of these. */
export type GoogleAuthResult =
  | { status: 'signed_in'; user: CurrentUser }
  | { status: 'needs_profile'; name: string; email: string }

export const isAdmin = (user: CurrentUser | null | undefined) => user?.role === 'Admin'

/** The label shown under a person's name, e.g. "Contractor" or "Quantity Surveyor · Admin". */
export function userTitle(user: CurrentUser | null | undefined): string {
  if (!user) return ''
  if (user.profession === undefined) return user.role // classic PHP backend
  const parts = [user.profession, isAdmin(user) ? 'Admin' : null].filter(Boolean)
  return parts.join(' · ') || 'Member'
}

/**
 * The classic PHP API only knows the old single "role" field, so the
 * profession is sent there too ('Other' was called 'User'). Django ignores
 * "role" completely — it can never be used to become Admin.
 */
export const legacyRole = (profession: string) => (profession === 'Other' ? 'User' : profession)

export const authApi = {
  me: () => request<CurrentUser>('GET', endpoints.auth.me),

  login: (email: string, password: string, remember: boolean) =>
    request<CurrentUser>('POST', endpoints.auth.login, { body: { email, password, remember } }),

  register: (data: { name: string; email: string; phone: string; profession: string; password: string }) =>
    request<CurrentUser>('POST', endpoints.auth.register, { body: { ...data, role: legacyRole(data.profession) } }),

  logout: () => request<null>('POST', endpoints.auth.logout, { body: {} }),

  /** Which sign-in options the server offers (Google is on only when configured). */
  providers: () => request<AuthProviders>('GET', endpoints.auth.providers),

  /** Send Google's ID token; add phone + profession to finish a brand-new account. */
  google: (body: { credential: string; remember?: boolean; phone?: string; profession?: string }) =>
    request<GoogleAuthResult>('POST', endpoints.auth.google, { body }),
}
