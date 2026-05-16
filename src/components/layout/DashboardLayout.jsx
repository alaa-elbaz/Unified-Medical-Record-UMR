import { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import { Button } from '@/components/ui/button.jsx'
import {
  Home, User, LogOut, Menu, X, Calendar, FileText, Pill, TestTubes,
  Stethoscope, Building2, Users, ClipboardList, Microscope, Shield,
  Settings, LayoutDashboard, Heart, Sun, Moon
} from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode.js'

/* ── Role-based navigation ─────────────────────────────────── */
const roleNav = {
  patient: [
    { href: '/patient', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
  doctor: [
    { href: '/doctor', label: 'لوحة التحكم', icon: LayoutDashboard },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
  hospital: [
    { href: '/hospital', label: 'إدارة المستشفى', icon: Building2 },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
  lab: [
    { href: '/lab', label: 'إدارة المختبر', icon: Microscope },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
  pharmacy: [
    { href: '/pharmacy', label: 'إدارة الصيدلية', icon: Pill },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
  admin: [
    { href: '/admin', label: 'لوحة الإدارة', icon: Shield },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
  super_admin: [
    { href: '/admin', label: 'لوحة الإدارة', icon: Shield },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
  sub_admin: [
    { href: '/admin', label: 'لوحة الإدارة', icon: Shield },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ],
}

const roleLabels = {
  patient:     'مريض',
  doctor:      'طبيب',
  hospital:    'مستشفى',
  lab:         'مختبر',
  pharmacy:    'صيدلية',
  super_admin: 'مدير عام',
  sub_admin:   'مدير مساعد',
  admin:       'مدير',
}

const roleBadgeColors = {
  patient:     'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  doctor:      'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  hospital:    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  lab:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pharmacy:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  admin:       'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  super_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  sub_admin:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useLocation().pathname
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  const handleLogout = async () => { logout(); navigate('/') }

  const navItems = roleNav[user?.role] || [
    { href: '/dashboard', label: 'الرئيسية', icon: Home },
    { href: '/profile', label: 'الملف الشخصي', icon: User },
  ]

  return (
    <div className="flex h-screen bg-gray-50/50 dark:bg-slate-950 transition-colors duration-300" dir="rtl">

      {/* ═══════ SIDEBAR ═══════ */}
      <aside className={[
        'fixed lg:static inset-y-0 right-0 z-40 w-[260px]',
        'bg-white dark:bg-slate-900 border-l border-gray-100 dark:border-slate-800',
        'transition-transform duration-300 flex flex-col shadow-xl lg:shadow-none',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
      ].join(' ')}>

        {/* Logo */}
        <div className="p-5 pb-4 border-b border-gray-100 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-black text-xs shadow-md group-hover:shadow-lg transition-shadow">
              MC
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">MedCore</span>
              <span className="text-[8px] font-semibold text-teal-600 dark:text-teal-400 tracking-[0.2em]">UMR SYSTEM</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-auto p-3 space-y-1">
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-3 pt-2 pb-1.5">القائمة</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link key={href} to={href} onClick={() => setSidebarOpen(false)}
                className={[
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 shadow-sm border border-sky-100 dark:border-sky-800/50'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-800 dark:hover:text-slate-200',
                ].join(' ')}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-gray-100 dark:border-slate-800 p-4 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <User size={16} className="text-gray-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">{user?.fullName || user?.email}</p>
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${roleBadgeColors[user?.role] || 'bg-gray-100 text-gray-600'}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline"
            className="w-full h-10 rounded-xl text-sm font-bold border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 dark:bg-slate-800 dark:hover:bg-red-900/30 hover:bg-red-50 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/50 transition-colors gap-2">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shrink-0 transition-colors duration-300">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            {/* Hamburger (mobile) */}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              {sidebarOpen ? <X className="h-5 w-5 text-gray-600 dark:text-slate-400" /> : <Menu className="h-5 w-5 text-gray-600 dark:text-slate-400" />}
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleDarkMode} 
                className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="تغيير المظهر"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="h-5 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>
              <p className="text-sm text-gray-500 dark:text-slate-400 hidden sm:block font-medium">{user?.fullName || user?.email}</p>
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <User size={14} className="text-gray-500 dark:text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
