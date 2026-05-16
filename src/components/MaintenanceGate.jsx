import { Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Link } from 'react-router-dom'
import { usePublicSettings } from './PublicSettingsProvider.jsx'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * MaintenanceGate — full-screen takeover when system is under maintenance.
 * Admins (super_admin / sub_admin) bypass; everyone else sees the screen.
 * Wraps the routed app, so once active the user can only see this screen
 * (plus a login link to let admins sign in).
 */
export default function MaintenanceGate({ children }) {
  const { settings, refresh } = usePublicSettings()
  const { user } = useAuth()

  const inMaintenance = !!settings?.maintenanceMode
  const isAdmin = user?.role === 'super_admin' || user?.role === 'sub_admin'

  if (!inMaintenance || isAdmin) return children

  const message =
    settings?.maintenanceMessage ||
    'النظام تحت الصيانة، نعتذر عن الإزعاج. سنعود قريباً.'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/30 p-6"
      dir="rtl"
    >
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-800 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-5">
          <Lock size={36} className="text-amber-600 dark:text-amber-400" strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">
          النظام تحت الصيانة
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6 leading-relaxed text-sm sm:text-base whitespace-pre-line">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            type="button"
            onClick={refresh}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <RefreshCw size={16} />
            تحقّق من الحالة
          </Button>
          {!user && (
            <Link to="/login">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                دخول الإدارة
              </Button>
            </Link>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-6">
          نقدر صبركم وتفهمكم 🙏
        </p>
      </div>
    </div>
  )
}
