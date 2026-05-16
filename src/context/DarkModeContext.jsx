import { createContext, useContext, useEffect, useState, useCallback } from 'react'

/**
 * DarkModeContext — single source of truth for theme.
 *
 * - Reads initial state from localStorage('theme'), falling back to OS preference.
 * - Toggling syncs three things at once: React state, localStorage, and the
 *   `dark` class on <html>.
 * - Listens to OS preference changes for users who haven't picked a theme
 *   manually (still on system default).
 * - Listens to storage events so multiple tabs stay in sync.
 *
 * Replaces the per-component useDarkMode hook that had each consumer keep
 * its own copy of state — toggling in one component left the others stale.
 */

const DarkModeContext = createContext({
  isDarkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
})

const STORAGE_KEY = 'theme'

function readInitial() {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(isDark) {
  const root = document.documentElement
  if (isDark) root.classList.add('dark')
  else root.classList.remove('dark')
}

export function DarkModeProvider({ children }) {
  const [isDarkMode, setIsDarkModeState] = useState(readInitial)

  // Apply theme on mount + whenever it changes
  useEffect(() => {
    applyTheme(isDarkMode)
  }, [isDarkMode])

  // Cross-tab sync via storage events
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return
      setIsDarkModeState(e.newValue === 'dark')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Follow OS preference if user hasn't explicitly picked a theme
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => {
      const explicit = localStorage.getItem(STORAGE_KEY)
      if (explicit === 'dark' || explicit === 'light') return
      setIsDarkModeState(e.matches)
    }
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  const setDarkMode = useCallback((value) => {
    setIsDarkModeState((prev) => {
      const next = typeof value === 'function' ? value(prev) : !!value
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      return next
    })
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev)
  }, [setDarkMode])

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

export function useDarkModeContext() {
  return useContext(DarkModeContext)
}
