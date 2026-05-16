import { useState, useEffect } from 'react'
import { Bell, Mail, CalendarCheck, Pill, FlaskConical, ShieldCheck, Megaphone, Loader2 } from 'lucide-react'
import api from '@/services/api.js'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext.jsx'

/**
 * NotificationPreferences — settings card the user drops into their profile
 * page to control which kinds of platform events they receive by email.
 *
 * Behaviour:
 *  - Reads initial state from user.notificationPrefs (loaded by AuthContext).
 *  - Master toggle (`emailEnabled`) disables all child toggles when off.
 *  - Each toggle saves to PUT /api/auth/notification-prefs immediately
 *    with optimistic UI; reverts on failure.
 */

const ITEMS = [
  { key: 'emailAppointments',  label: 'مواعيد الكشف',         desc: 'إشعار عند تأكيد موعد أو إلغائه أو تغيير حالته', icon: CalendarCheck, color: 'text-blue-600 dark:text-blue-400' },
  { key: 'emailPrescriptions', label: 'الروشتات',             desc: 'إشعار عند كتابة روشتة جديدة أو تحديثها',       icon: Pill,           color: 'text-purple-600 dark:text-purple-400' },
  { key: 'emailLabResults',    label: 'نتائج التحاليل',       desc: 'إشعار فور رفع نتائج تحاليلك',                  icon: FlaskConical,   color: 'text-teal-600 dark:text-teal-400' },
  { key: 'emailAccount',       label: 'حسابك والأمان',        desc: 'اعتماد الحساب، تسجيل الدخول، أكواد التحقق',    icon: ShieldCheck,    color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'emailAnnouncements', label: 'الإعلانات والعروض',    desc: 'تحديثات المنصة والعروض الجديدة (اختياري)',     icon: Megaphone,      color: 'text-amber-600 dark:text-amber-400' },
]

export default function NotificationPreferences() {
  const { user, refreshUserData } = useAuth()
  const initial = user?.notificationPrefs || {
    emailEnabled: true, emailAppointments: true, emailPrescriptions: true,
    emailLabResults: true, emailAccount: true, emailAnnouncements: false,
  }
  const [prefs, setPrefs] = useState(initial)
  const [saving, setSaving] = useState(null) // key currently saving

  useEffect(() => {
    if (user?.notificationPrefs) setPrefs(user.notificationPrefs)
  }, [user?.notificationPrefs])

  const save = async (patch, key) => {
    const previous = prefs
    setPrefs((p) => ({ ...p, ...patch }))
    setSaving(key)
    try {
      await api.put('/auth/notification-prefs', patch)
      toast.success('تم الحفظ')
      // Re-fetch user so context stays in sync
      refreshUserData?.().catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الحفظ')
      setPrefs(previous)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
            <Mail size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">إشعارات البريد الإلكتروني</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">اختر أنواع الإشعارات التي تصلك على بريدك</p>
          </div>
        </div>
      </div>

      {/* Master toggle */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
        <PrefRow
          icon={Bell}
          color="text-indigo-600 dark:text-indigo-400"
          label="استلام الإشعارات على البريد"
          desc={user?.email ? `سيتم إرسالها إلى ${user.email}` : 'سيتم استخدام البريد المسجل في حسابك'}
          checked={prefs.emailEnabled !== false}
          loading={saving === 'emailEnabled'}
          onChange={(v) => save({ emailEnabled: v }, 'emailEnabled')}
        />
      </div>

      {/* Per-category toggles */}
      <div className="p-2">
        {ITEMS.map((item) => (
          <PrefRow
            key={item.key}
            icon={item.icon}
            color={item.color}
            label={item.label}
            desc={item.desc}
            checked={prefs[item.key] !== false}
            loading={saving === item.key}
            disabled={prefs.emailEnabled === false}
            onChange={(v) => save({ [item.key]: v }, item.key)}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
        <p className="text-[11px] text-gray-500 dark:text-slate-500 leading-relaxed">
          الإشعارات داخل المنصة تظل مفعّلة دائماً للأمور المهمة. هذه الإعدادات تتحكم فقط في رسائل البريد الإلكتروني.
        </p>
      </div>
    </div>
  )
}

function PrefRow({ icon: Icon, color, label, desc, checked, loading, disabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && !loading && onChange(!checked)}
      disabled={disabled || loading}
      className={`w-full flex items-start gap-3 p-3 rounded-xl text-right transition-colors ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer'
      }`}
    >
      <div className={`shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <div className="shrink-0 mt-1.5">
        {loading ? (
          <Loader2 size={18} className="text-gray-400 animate-spin" />
        ) : (
          <span
            role="switch"
            aria-checked={checked}
            className={`relative inline-block w-10 h-5 rounded-full transition-colors ${
              checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'
            }`}
          >
            <span className={`absolute top-0.5 ${checked ? 'left-0.5' : 'right-0.5'} w-4 h-4 rounded-full bg-white shadow transition-all`} />
          </span>
        )}
      </div>
    </button>
  )
}
