import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '@/services/api.js'

/**
 * PublicSettingsProvider — fetches & polls /api/settings/public so the entire
 * app can react live to maintenance mode, registration toggles, and the
 * announcement banner. The endpoint is unauthenticated and whitelisted by
 * the maintenance middleware so it always responds.
 *
 * Polling: every 60s. Also invalidates on focus.
 */

const PublicSettingsCtx = createContext({
  settings: null,
  refresh: () => {},
})

export function PublicSettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/settings/public')
      setSettings(data.data)
    } catch {
      // Network/server down — keep last-known settings, don't crash UI
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60_000)
    const onFocus = () => refresh()
    const onMaintenanceDetected = () => refresh()
    window.addEventListener('focus', onFocus)
    window.addEventListener('umr-maintenance-detected', onMaintenanceDetected)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('umr-maintenance-detected', onMaintenanceDetected)
    }
  }, [refresh])

  return (
    <PublicSettingsCtx.Provider value={{ settings, refresh }}>
      {children}
    </PublicSettingsCtx.Provider>
  )
}

export function usePublicSettings() {
  return useContext(PublicSettingsCtx)
}
