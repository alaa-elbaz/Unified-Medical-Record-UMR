import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'

const roleRedirect = {
  patient:     '/patient',
  doctor:      '/doctor',
  hospital:    '/hospital',
  lab:         '/lab',
  pharmacy:    '/pharmacy',
  super_admin: '/admin',
  sub_admin:   '/admin',
  admin:       '/admin',
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !user) return navigate('/login', { replace: true })
    if (!isLoading && user) {
      const target = roleRedirect[user.role] || '/profile'
      navigate(target, { replace: true })
    }
  }, [isLoading, user, navigate])

  // Skeleton loader while redirecting
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center gap-6 p-8" dir="rtl">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-lg animate-pulse">MC</div>
      <div className="space-y-3 w-full max-w-sm">
        <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded-full w-3/4 mx-auto animate-pulse" />
        <div className="h-3 bg-gray-100 dark:bg-slate-800/60 rounded-full w-1/2 mx-auto animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
