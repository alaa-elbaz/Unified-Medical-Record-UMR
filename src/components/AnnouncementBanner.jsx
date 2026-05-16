import { Info, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePublicSettings } from './PublicSettingsProvider.jsx'

/**
 * Site-wide announcement banner controlled by /api/admin/settings.
 * Reads from PublicSettingsProvider; user can dismiss within session
 * (key changes when message text changes so a new announcement re-shows).
 */
export default function AnnouncementBanner() {
  const { settings } = usePublicSettings()
  const announcement = settings?.announcement
  const enabled = !!announcement?.enabled
  const message = announcement?.message || ''
  const level = announcement?.level || 'info'

  const dismissKey = `announcement-dismissed:${message}`
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!enabled || !message) return
    setDismissed(sessionStorage.getItem(dismissKey) === '1')
  }, [dismissKey, enabled, message])

  if (!enabled || !message || dismissed) return null

  const styles = {
    info:    { bg: 'bg-sky-50 dark:bg-sky-900/30',     text: 'text-sky-900 dark:text-sky-200',     border: 'border-sky-200 dark:border-sky-800',   icon: <Info size={16} /> },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-900 dark:text-amber-200', border: 'border-amber-200 dark:border-amber-800', icon: <AlertTriangle size={16} /> },
    success: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-900 dark:text-green-200', border: 'border-green-200 dark:border-green-800', icon: <CheckCircle2 size={16} /> },
  }
  const s = styles[level] || styles.info

  return (
    <div
      className={`relative w-full ${s.bg} ${s.border} border-b ${s.text} px-4 py-2.5`}
      dir="rtl"
      role="status"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="shrink-0">{s.icon}</span>
          <p className="text-sm font-medium truncate">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(dismissKey, '1')
            setDismissed(true)
          }}
          aria-label="إغلاق الإعلان"
          className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
