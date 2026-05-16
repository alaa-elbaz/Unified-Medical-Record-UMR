import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { usePublicSettings } from './PublicSettingsProvider.jsx'

/**
 * RegistrationGate — wraps a registration page and shows a "registration
 * disabled" notice when the relevant toggle is off.
 *
 * Usage:  <RegistrationGate role="patient"> <RegisterPatientForm /> </RegistrationGate>
 *
 * roles: 'patient' | 'doctor' | 'organization' (or 'any' to only check master toggle)
 */
export default function RegistrationGate({ role = 'any', children }) {
  const { settings } = usePublicSettings()

  // While settings haven't loaded, show children (we'll re-render once data arrives)
  if (!settings) return children

  const masterOff = !settings.registrationEnabled
  const roleOff =
    (role === 'patient' && !settings.patientRegistrationEnabled) ||
    (role === 'doctor' && !settings.doctorRegistrationEnabled) ||
    (role === 'organization' && !settings.organizationRegistrationEnabled)

  if (!masterOff && !roleOff) return children

  const labels = {
    patient: 'تسجيل المرضى',
    doctor: 'تسجيل الأطباء',
    organization: 'تسجيل المنظمات',
    any: 'التسجيل',
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/30 p-6" dir="rtl">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-800 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mx-auto mb-5">
          <Lock size={32} className="text-amber-600 dark:text-amber-400" strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
          {labels[role]} موقوف مؤقتاً
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6 text-sm leading-relaxed">
          {masterOff
            ? 'التسجيل في المنصة موقوف حالياً من قِبل الإدارة. يرجى المحاولة لاحقاً.'
            : `${labels[role]} موقوف حالياً من قِبل الإدارة. يرجى المحاولة لاحقاً.`}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/">
            <Button variant="outline" className="w-full sm:w-auto">العودة للرئيسية</Button>
          </Link>
          <Link to="/login">
            <Button className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white">
              لديك حساب؟ سجّل دخولك
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
