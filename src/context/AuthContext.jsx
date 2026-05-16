import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUserData = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      localStorage.setItem('umr_user', JSON.stringify(data.user))
      return data.user
    } catch (err) {
      console.error('[AuthContext] Failed to refresh user data', err)
      throw err;
    }
  }, [])

  // On mount: restore user from localStorage, then verify token with server
  useEffect(() => {
    const token  = localStorage.getItem('umr_token')
    const stored = localStorage.getItem('umr_user')

    if (!token) { setIsLoading(false); return }

    // Optimistically restore the user so the UI doesn't flash a loader
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
    }

    // The axios interceptor (services/api.js) already handles 401 by clearing
    // storage and dispatching `umr:unauthorized`, which the listener below
    // turns into a soft redirect. Don't duplicate that logic here — handling
    // a 401 in two places caused a race where the user briefly saw the
    // dashboard, got redirected, and the local clear ran simultaneously.
    refreshUserData()
      .catch((err) => {
        // Only handle non-auth errors here (network down, server 5xx). Auth
        // errors are owned by the interceptor.
        const status = err?.response?.status
        if (status !== 401 && status !== 403) {
          console.warn('[AuthContext] /auth/me failed (non-auth):', status || err?.code)
        }
      })
      .finally(() => setIsLoading(false))
  }, [refreshUserData])

  // Listen for auth-failed events from the axios interceptor (replaces the
  // old `window.location.href = '/login'` redirect, which destroyed unsaved
  // form state and bypassed React Router).
  useEffect(() => {
    const handler = (e) => {
      try { e.detail?.handle?.() } catch { /* noop */ }
      setUser(null)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        // Soft navigation — preserves browser history.
        window.history.pushState({}, '', '/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }
    window.addEventListener('umr:unauthorized', handler)
    return () => window.removeEventListener('umr:unauthorized', handler)
  }, [])

  /**
   * Login — supports both individual and organization login
   */
  const login = useCallback(async (email, nationalId, loginType = 'individual', healthRegNumber = null) => {
    const payload = { email, loginType }

    if (loginType === 'organization') {
      payload.healthRegNumber = healthRegNumber
    } else {
      payload.nationalId = nationalId
    }

    const { data } = await api.post('/auth/login', payload)
    localStorage.setItem('umr_token', data.token)
    localStorage.setItem('umr_user',  JSON.stringify(data.user))
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('umr_token')
    localStorage.removeItem('umr_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, setUser, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
