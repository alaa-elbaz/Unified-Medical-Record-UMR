import { Link } from 'react-router-dom'
import { Home, ArrowLeft, Heart } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'

export default function NotFoundPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors duration-300" dir="rtl">
      <div className="text-center max-w-md w-full">

        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md">MC</div>
          <div className="flex flex-col leading-none text-right">
            <span className="text-xl font-extrabold text-gray-900 dark:text-white">MedCore</span>
            <span className="text-[9px] font-semibold text-teal-600 dark:text-teal-400 tracking-widest">UMR SYSTEM</span>
          </div>
        </Link>

        {/* 404 Visual */}
        <div className="relative mb-6">
          <div className="text-[120px] sm:text-[160px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-sky-200 to-teal-200 dark:from-sky-800 dark:to-teal-800 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-800 shadow-lg flex items-center justify-center">
              <span className="text-4xl">🔍</span>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-slate-800 p-8 mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">الصفحة غير موجودة</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها. تأكد من صحة الرابط أو عُد للصفحة الرئيسية.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/" className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-600 to-teal-500 text-white font-bold rounded-xl hover:from-sky-700 hover:to-teal-600 transition shadow-md text-sm">
              <Home size={16} /> الصفحة الرئيسية
            </Link>
            {user && (
              <Link to="/dashboard" className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition text-sm">
                لوحة التحكم <ArrowLeft size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center justify-center gap-1">
          © {new Date().getFullYear()} MedCore — صنع بـ <Heart size={10} className="text-rose-400 fill-rose-400" /> لصحة أفضل
        </p>
      </div>
    </div>
  )
}
