import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { UNAUTHORIZED_EVENT } from '../api/client'
import { authApi, type CurrentUser } from '../api/resources/auth'

/**
 * Who is logged in, for the whole app.
 *
 * In the PHP app, app.php checked the session on the SERVER before the
 * page was even sent. A React app is sent to the browser first, so on
 * start-up it asks the server "who am I?" (auth/me.php) and shows a
 * loading state until it knows. The real security still lives on the
 * server: every protected API endpoint checks the session itself, so
 * hiding a screen here is a convenience, never the only guard.
 */
type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'guest'; user: null }
  | { status: 'authenticated'; user: CurrentUser }

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>
  setUser: (user: CurrentUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })

  const refresh = useCallback(async () => {
    const result = await authApi.me()
    setState(result.ok ? { status: 'authenticated', user: result.data } : { status: 'guest', user: null })
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    // Any protected call that comes back 401 means the session ended.
    const onUnauthorized = () => setState({ status: 'guest', user: null })
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [refresh])

  const setUser = useCallback((user: CurrentUser) => setState({ status: 'authenticated', user }), [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setState({ status: 'guest', user: null })
  }, [])

  return <AuthContext.Provider value={{ ...state, refresh, setUser, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
