import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input }  from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { FieldGroup, FieldLabel } from '@/components/ui/field.jsx'
import { Spinner } from '@/components/ui/spinner.jsx'
import { toast } from 'sonner'
import api from '@/services/api.js'
import { ArrowLeft, Building2, Heart, User, KeyRound, Mail, Shield, Sun, Moon } from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode.js'
import { usePageTitle } from '@/hooks/usePageTitle.js'

export default function LoginPage() {
  usePageTitle('تسجيل الدخول')
  const navigate = useNavigate()
  const { login } = useAuth()

  const [loginType, setLoginType] = useState('individual')
  const [email, setEmail]       = useState('')
  const [nationalId, setNationalId] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [healthRegNumber, setHealthRegNumber] = useState('')

  const [showRecover, setShowRecover] = useState(false)
  const [recoverData, setRecoverData] = useState({ nationalId: '', role: 'patient', securityAnswer: '' })
  const [recoverLoading, setRecoverLoading] = useState(false)
  const [recoveredEmail, setRecoveredEmail] = useState('')

  const [error, setError]       = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const onSubmitIndividual = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true)
    try { await login(email, nationalId); toast.success('تم تسجيل الدخول بنجاح'); navigate('/dashboard') }
    catch (err) { const msg = err.response?.data?.message || 'فشل تسجيل الدخول'; setError(msg); toast.error(msg) }
    finally { setIsLoading(false) }
  }

  const onSubmitOrganization = async (e) => {
    e.preventDefault(); setError(''); setIsLoading(true)
    try { await login(orgEmail, null, 'organization', healthRegNumber); toast.success('تم تسجيل الدخول بنجاح'); navigate('/dashboard') }
    catch (err) { const msg = err.response?.data?.message || 'فشل تسجيل الدخول'; setError(msg); toast.error(msg) }
    finally { setIsLoading(false) }
  }

  const handleRecover = async (e) => {
    e.preventDefault(); setRecoverLoading(true); setRecoveredEmail('')
    try { const { data } = await api.post('/auth/recover-email', recoverData); setRecoveredEmail(data.email); toast.success('تم استرجاع البريد الإلكتروني بنجاح') }
    catch (err) { toast.error(err.response?.data?.message || 'فشل استرجاع البريد الإلكتروني') }
    finally { setRecoverLoading(false) }
  }

  const { isDarkMode, toggleDarkMode } = useDarkMode()

  return (
    <div className="min-h-screen flex relative" dir="rtl">

      {/* Dark Mode Toggle */}
      <button onClick={toggleDarkMode} className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-gray-600 dark:text-slate-300 hover:scale-110 transition-all" title="تغيير المظهر">
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* ── Left decorative panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-sky-600 via-sky-700 to-teal-600 p-10 flex-col justify-between overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl" />

        <div className="relative z-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-12 group">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-sm shadow-lg">MC</div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-extrabold text-white">MedCore</span>
              <span className="text-[9px] font-semibold text-sky-200 tracking-widest">UMR SYSTEM</span>
            </div>
          </Link>

          <h2 className="text-4xl font-black text-white mb-4 leading-tight">مرحباً بعودتك</h2>
          <p className="text-sky-100 text-base leading-relaxed max-w-sm">
            سجّل دخولك للوصول الفوري إلى سجلك الطبي الموحد — مواعيدك، أدويتك، وتحاليلك في مكان واحد.
          </p>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">بياناتك في أمان</h3>
              <p className="text-sky-200 text-xs">مشفرة ومحمية وفق أعلى المعايير الطبية</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 bg-gray-50/50 dark:bg-slate-950">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md">MC</div>
              <div className="flex flex-col leading-none text-right">
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">MedCore</span>
                <span className="text-[9px] font-semibold text-teal-600 dark:text-teal-400 tracking-widest">UMR SYSTEM</span>
              </div>
            </Link>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-slate-800 overflow-hidden">
            {/* Card header */}
            <div className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">تسجيل الدخول</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">اختر نوع الحساب للمتابعة</p>
            </div>

            <div className="p-6">
              {/* Login Type Toggle */}
              <div className="grid grid-cols-2 gap-1.5 mb-6 bg-gray-100/80 dark:bg-slate-800 p-1.5 rounded-xl">
                <button type="button" onClick={() => { setLoginType('individual'); setError('') }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                    loginType === 'individual'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-700 dark:text-sky-300 border border-gray-200/50 dark:border-slate-600'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                  }`}>
                  <User size={16} /> أفراد
                </button>
                <button type="button" onClick={() => { setLoginType('organization'); setError('') }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                    loginType === 'organization'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-700 dark:text-sky-300 border border-gray-200/50 dark:border-slate-600'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                  }`}>
                  <Building2 size={16} /> منظمة
                </button>
              </div>

              {/* Individual Login */}
              {loginType === 'individual' && (
                <form onSubmit={onSubmitIndividual} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="email" type="email" placeholder="example@email.com" value={email}
                        onChange={(e) => setEmail(e.target.value)} required className="pr-10 h-11 rounded-xl border-gray-200 focus:border-sky-500 focus:ring-sky-500/20" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">الرقم القومي</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="nationalId" type="text" placeholder="أدخل الرقم القومي (14 رقم)" value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)} maxLength={14} required dir="ltr"
                        className="pr-10 h-11 rounded-xl text-left border-gray-200 focus:border-sky-500 focus:ring-sky-500/20" />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl font-medium">{error}</div>
                  )}

                  <div className="text-left">
                    <button type="button" onClick={() => setShowRecover(true)}
                      className="text-xs text-sky-600 hover:text-sky-700 hover:underline font-bold">نسيت البريد الإلكتروني؟</button>
                  </div>

                  <Button type="submit" disabled={isLoading}
                    className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white shadow-lg shadow-sky-600/20 gap-2">
                    {isLoading ? <><Spinner className="mr-2 h-4 w-4" />جاري الدخول...</> : <>تسجيل الدخول <ArrowLeft size={16} /></>}
                  </Button>
                </form>
              )}

              {/* Organization Login */}
              {loginType === 'organization' && (
                <form onSubmit={onSubmitOrganization} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">البريد الإلكتروني الرسمي</label>
                    <div className="relative">
                      <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="orgEmail" type="email" placeholder="admin@hospital.com" value={orgEmail}
                        onChange={(e) => setOrgEmail(e.target.value)} required
                        className="pr-10 h-11 rounded-xl border-gray-200 focus:border-sky-500 focus:ring-sky-500/20" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">رقم تسجيل وزارة الصحة</label>
                    <div className="relative">
                      <KeyRound size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="healthRegNumber" type="text" placeholder="أدخل رقم التسجيل الصحي" value={healthRegNumber}
                        onChange={(e) => setHealthRegNumber(e.target.value)} required dir="ltr"
                        className="pr-10 h-11 rounded-xl text-left border-gray-200 focus:border-sky-500 focus:ring-sky-500/20" />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl font-medium">{error}</div>
                  )}

                  <Button type="submit" disabled={isLoading}
                    className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white shadow-lg shadow-sky-600/20 gap-2">
                    {isLoading ? <><Spinner className="mr-2 h-4 w-4" />جاري الدخول...</> : <>دخول المنظمة <ArrowLeft size={16} /></>}
                  </Button>
                </form>
              )}

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400 font-bold">أو</span></div>
              </div>

              <Link to="/register">
                <Button variant="outline" className="w-full h-11 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold gap-2">
                  إنشاء حساب جديد <ArrowLeft size={14} />
                </Button>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
            © {new Date().getFullYear()} MedCore — صنع بـ <Heart size={10} className="text-rose-400 fill-rose-400" /> لصحة أفضل
          </p>
        </div>
      </div>

      {/* ── Recover Email Modal ── */}
      {showRecover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-black text-gray-900">استرجاع البريد الإلكتروني</h2>
              <p className="text-sm text-gray-500 mt-1">أدخل بياناتك للبحث عن حسابك</p>
            </div>
            <div className="p-6">
              {recoveredEmail ? (
                <div className="space-y-5 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
                    <p className="text-sm text-emerald-800 mb-2 font-medium">البريد الإلكتروني المرتبط بحسابك:</p>
                    <p className="font-black text-lg text-emerald-900" dir="ltr">{recoveredEmail}</p>
                  </div>
                  <Button className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white font-bold"
                    onClick={() => { setEmail(recoveredEmail); setShowRecover(false) }}>العودة لتسجيل الدخول</Button>
                </div>
              ) : (
                <form onSubmit={handleRecover} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700">نوع الحساب</label>
                    <select className="flex h-11 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-sky-500/20 focus:ring-2 outline-none"
                      value={recoverData.role} onChange={(e) => setRecoverData({...recoverData, role: e.target.value})}>
                      <option value="patient">مريض</option>
                      <option value="doctor">طبيب</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700">الرقم القومي</label>
                    <Input type="text" maxLength={14} dir="ltr" className="text-left h-11 rounded-xl border-gray-200"
                      value={recoverData.nationalId} onChange={(e) => setRecoverData({...recoverData, nationalId: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700">
                      {recoverData.role === 'patient' ? 'اسم الأم بالكامل' : 'رقم القيد بنقابة الأطباء'}
                    </label>
                    <Input type="text" dir={recoverData.role === 'doctor' ? 'ltr' : 'rtl'}
                      className={`h-11 rounded-xl border-gray-200 ${recoverData.role === 'doctor' ? 'text-left' : ''}`}
                      value={recoverData.securityAnswer} onChange={(e) => setRecoverData({...recoverData, securityAnswer: e.target.value})} required />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={() => setShowRecover(false)}>إلغاء</Button>
                    <Button type="submit" className="flex-1 h-11 rounded-xl bg-gradient-to-r from-sky-600 to-teal-500 text-white font-bold" disabled={recoverLoading}>
                      {recoverLoading ? <Spinner className="h-4 w-4" /> : 'استرجاع'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
