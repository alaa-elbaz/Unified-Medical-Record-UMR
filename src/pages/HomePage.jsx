import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import {
  QrCode, Brain, Building2, Stethoscope, TestTubes, Pill,
  ArrowLeft, Shield, Heart, Zap, Mail, Phone, MapPin,
  ChevronDown, Sparkles, Activity, Users, Sun, Moon, Search, SearchX
} from 'lucide-react'
import { useDarkMode } from '@/hooks/useDarkMode.js'
import { usePageTitle } from '@/hooks/usePageTitle.js'

/* ── Color tokens ─────────────────────────────────────────── */
const BLUE   = '#0369a1'   // Trust Blue
const TEAL   = '#0d9488'   // Health Teal
const LIGHT  = '#f8fafc'   // Off-white

/* ── Roles ────────────────────────────────────────────────── */
const roles = [
  {
    icon: Heart, color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', border: 'border-rose-200',
    title: 'مريض', desc: 'سجّل بياناتك الصحية، احجز مواعيدك، وتابع أدويتك وسجلاتك في مكان واحد.',
    features: ['QR ذكي للطوارئ', 'حجز مواعيد', 'فحص تعارض الأدوية', 'تصدير PDF'],
    href: '/register?role=patient',
  },
  {
    icon: Stethoscope, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', border: 'border-blue-200',
    title: 'طبيب', desc: 'أدر مرضاك، اكتب الروشتات، واستخدم الذكاء الاصطناعي في التشخيص.',
    features: ['إدارة المرضى', 'كتابة الروشتات', 'تشخيص ذكي بالـ AI', 'جدولة المواعيد'],
    href: '/register?role=doctor',
  },
  {
    icon: Building2, color: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50', border: 'border-indigo-200',
    title: 'مستشفى', desc: 'أدر أقسامك وأطبائك، وتابع المرضى والعمليات من لوحة تحكم شاملة.',
    features: ['إدارة الأقسام', 'تنسيق الأطباء', 'تتبع المرضى', 'إحصائيات شاملة'],
    href: '/register/hospital',
  },
  {
    icon: TestTubes, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200',
    title: 'معمل تحاليل', desc: 'أرسل نتائج التحاليل مباشرة لسجل المريض الإلكتروني بضغطة واحدة.',
    features: ['رفع النتائج', 'ربط بالأطباء', 'تتبع العينات', 'أرشفة إلكترونية'],
    href: '/register/lab',
  },
  {
    icon: Pill, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-200',
    title: 'صيدلية', desc: 'استقبل الروشتات إلكترونياً، تابع صرف الأدوية، واحفظ سجل عملاء الصيدلية.',
    features: ['استقبال الروشتات', 'صرف الأدوية', 'فحص التعارضات', 'إيصالات إلكترونية'],
    href: '/register/pharmacy',
  },
]

/* ── Features ─────────────────────────────────────────────── */
const features = [
  {
    icon: QrCode, color: 'text-rose-600 bg-rose-100',
    title: 'كارت QR للطوارئ',
    desc: 'يصل المسعف لبياناتك الحيوية (فصيلة الدم، الحساسيات، الأمراض المزمنة) فوراً بمسح الكارت — حتى بدون إنترنت مسبق.',
  },
  {
    icon: Brain, color: 'text-indigo-600 bg-indigo-100',
    title: 'ذكاء اصطناعي طبي',
    desc: 'فحص تعارض الأدوية تلقائياً، تشخيص ذكي، وتحليل الصور الطبية (OCR) — كل هذا مدمج بنظامك.',
  },
  {
    icon: Zap, color: 'text-teal-600 bg-teal-100',
    title: 'ربط مباشر بين الهيئات',
    desc: 'الطبيب يكتب الروشتة → الصيدلية تصرفها → المعمل يرفع النتيجة → كل شيء يظهر فوراً في سجل المريض.',
  },
]

export default function HomePage() {
  usePageTitle('الرئيسية')
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles
    const q = searchQuery.trim().toLowerCase()
    return roles.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.desc.toLowerCase().includes(q) ||
      r.features.some(f => f.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return features
    const q = searchQuery.trim().toLowerCase()
    return features.filter(f =>
      f.title.toLowerCase().includes(q) ||
      f.desc.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const noResults = searchQuery.trim() && filteredRoles.length === 0 && filteredFeatures.length === 0

  return (
    <main className="w-full bg-white dark:bg-slate-950 transition-colors duration-300" dir="rtl">

      {/* Dark Mode Toggle */}
      <button onClick={toggleDarkMode} className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-gray-600 dark:text-slate-300 hover:scale-110 transition-all" title="تغيير المظهر">
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-black text-xs tracking-tight shadow-md group-hover:shadow-lg transition-shadow">
                MC
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">MedCore</span>
                <span className="text-[9px] font-semibold text-teal-600 dark:text-teal-400 tracking-widest">UMR SYSTEM</span>
              </div>
            </Link>

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-slate-400">
              <a href="#about" className="hover:text-sky-700 transition-colors">من نحن</a>
              <a href="#features" className="hover:text-sky-700 transition-colors">المميزات</a>
              <a href="#roles" className="hover:text-sky-700 transition-colors">الأدوار</a>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link to="/login">
                <Button variant="ghost" className="text-xs sm:text-sm font-bold text-gray-600 hover:text-sky-700 px-2 sm:px-4">تسجيل الدخول</Button>
              </Link>
              <Link to="/register">
                <Button className="text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all px-3 sm:px-6">أنشئ حسابك</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-24 sm:pt-36 pb-16 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 -right-32 w-[500px] h-[500px] rounded-full bg-sky-100/60 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-40 w-[400px] h-[400px] rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold mb-6 animate-fade-in">
            <Sparkles size={14} />
            منظومة صحية متكاملة مدعومة بالذكاء الاصطناعي
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-5 leading-[1.15] tracking-tight">
            منظومة صحية متكاملة
            <br />
            <span className="bg-gradient-to-l from-sky-600 to-teal-500 bg-clip-text text-transparent">
              في كارت ذكي واحد
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            نحن لا نبني مجرد موقع طبي، بل نبني النظام البيئي الصحي الأول الذي يربط المريض بالطبيب والمستشفى والمعمل في لحظة واحدة، مدعوماً بالذكاء الاصطناعي لحمايتك وتشخيصك بدقة.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto text-base font-bold bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white shadow-xl hover:shadow-2xl transition-all px-8 py-6 rounded-xl gap-2">
                أنشئ حسابك مجاناً
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base font-bold border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 px-8 py-6 rounded-xl">
                تسجيل الدخول
              </Button>
            </Link>
          </div>

          {/* Search bar */}
          <div className="mt-10 max-w-lg mx-auto relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن خدمة أو دور... (مثال: طبيب، تحاليل، روشتة)"
              className="w-full h-12 pr-11 pl-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all"
            />
          </div>

          {noResults && (
            <div className="mt-8 flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
              <SearchX size={48} strokeWidth={1.5} />
              <p className="text-lg font-bold">لا توجد نتائج</p>
              <p className="text-sm">لم يتم العثور على نتائج لـ "{searchQuery}" — جرب كلمة أخرى.</p>
            </div>
          )}

          {/* Scroll hint */}
          {!searchQuery.trim() && (
          <div className="mt-14 flex justify-center animate-bounce">
            <ChevronDown size={28} className="text-gray-300" />
          </div>
          )}
        </div>
      </section>

      {/* ═══════════ ABOUT (من نحن) ═══════════ */}
      <section id="about" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold mb-4">من نحن</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">ليش <span className="text-sky-600">MedCore</span>؟</h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
              تخيّل عالماً يكون فيه كل سجلك الطبي — تحاليلك، روشتاتك، مواعيدك، حساسياتك — متاحاً فوراً لأي طبيب أو مسعف يحتاجه. هذا هو MedCore.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: '🔒', label: 'تشفير طبي كامل', sub: 'بياناتك آمنة 100%' },
              { value: '⚡', label: 'وصول فوري', sub: 'QR Code ذكي للطوارئ' },
              { value: '🤖', label: 'ذكاء اصطناعي', sub: 'تحليل وتشخيص دقيق' },
              { value: '🔗', label: 'نظام متكامل', sub: 'ربط كل الهيئات الصحية' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 text-center border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl sm:text-4xl mb-2">{s.value}</div>
                <p className="font-bold text-gray-800 dark:text-white text-sm sm:text-base mb-0.5">{s.label}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES (كيف نعمل) ═══════════ */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-4">المميزات</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">ثلاث ركائز تحمي <span className="text-teal-600">صحتك</span></h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-xl mx-auto">كل ميزة صُمّمت لحل مشكلة حقيقية في النظام الصحي التقليدي.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {filteredFeatures.map((f, i) => (
              <div key={i} className="group relative bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300">
                {/* Accent line */}
                <div className="absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r from-sky-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5`}>
                  <f.icon size={26} className="text-current" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ ROLES (اختر دورك) ═══════════ */}
      <section id="roles" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1 rounded-full bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold mb-4">التسجيل</span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4">اختر <span className="text-sky-600">دورك</span> وابدأ الآن</h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-xl mx-auto">كل دور مصمم بلوحة تحكم مخصصة وأدوات احترافية تناسب احتياجاتك.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {filteredRoles.map((r, i) => (
              <div key={i} className={`relative bg-white dark:bg-slate-900 rounded-2xl border ${r.border} dark:border-slate-800 p-6 sm:p-7 hover:shadow-xl transition-all duration-300 group overflow-hidden`}>
                {/* Gradient accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-gradient-to-bl ${r.color} opacity-[0.07] group-hover:opacity-[0.12] transition-opacity`} />
                
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl ${r.bg} dark:bg-opacity-20 flex items-center justify-center mb-4`}>
                    <r.icon size={24} className="text-current" />
                  </div>
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">{r.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 leading-relaxed">{r.desc}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-5">
                    {r.features.map((f, j) => (
                      <span key={j} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${r.bg} ${r.border} border text-slate-700 dark:text-slate-200`}>{f}</span>
                    ))}
                  </div>

                  <Link to={r.href}>
                    <Button className={`w-full font-bold bg-gradient-to-r ${r.color} text-white shadow-md hover:shadow-lg transition-all rounded-xl py-5 gap-2`}>
                      سجّل كـ{r.title}
                      <ArrowLeft size={16} />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-teal-600 p-10 sm:p-14 text-center shadow-2xl">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-teal-400/20 blur-2xl" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              صحتك تستحق نظاماً أذكى
            </h2>
            <p className="text-sky-100 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              انضم لمنظومة MedCore المتكاملة وابدأ بإدارة ملفك الصحي بكل سهولة وأمان.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto bg-white text-sky-700 hover:bg-sky-50 font-extrabold px-8 py-6 rounded-xl shadow-lg text-base gap-2">
                  ابدأ مجاناً الآن
                  <ArrowLeft size={18} />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-white/30 !bg-transparent text-white hover:bg-white/10 hover:text-white font-bold px-8 py-6 rounded-xl text-base">
                  لديك حساب؟ سجّل دخولك
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-black text-[10px]">MC</div>
                <span className="font-extrabold text-gray-900 dark:text-white">MedCore</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs">منظومة صحية متكاملة تربط المريض بالطبيب والمستشفى والمعمل والصيدلية — في كارت ذكي واحد.</p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-3 text-sm">روابط سريعة</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-slate-400">
                <li><a href="#about" className="hover:text-sky-600 transition-colors">من نحن</a></li>
                <li><a href="#features" className="hover:text-sky-600 transition-colors">المميزات</a></li>
                <li><a href="#roles" className="hover:text-sky-600 transition-colors">التسجيل</a></li>
                <li><Link to="/login" className="hover:text-sky-600 transition-colors">تسجيل الدخول</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-gray-800 dark:text-white mb-3 text-sm">تواصل معنا</h4>
              <ul className="space-y-2.5 text-sm text-gray-500 dark:text-slate-400">
                <li className="flex items-center gap-2"><Mail size={14} className="text-sky-500 shrink-0" /> mohamedallan007@gmail.com</li>
                <li className="flex items-center gap-2"><Phone size={14} className="text-sky-500 shrink-0" /> +20 1140894775</li>
                <li className="flex items-center gap-2"><MapPin size={14} className="text-sky-500 shrink-0" /> القليوبية، مصر</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 dark:text-slate-500 gap-2">
            <p>© {new Date().getFullYear()} MedCore (UMR). جميع الحقوق محفوظة.</p>
            <p className="flex items-center gap-1">صنع بـ <Heart size={12} className="text-rose-400 fill-rose-400" /> لصحة أفضل</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
