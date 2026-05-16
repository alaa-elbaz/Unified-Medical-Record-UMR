import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Heart, Droplets, AlertTriangle, Activity, Phone, User, Search, QrCode, X, Shield, Pill, FileText, Radiation } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { usePageTitle } from '@/hooks/usePageTitle.js'

// Use VITE_API_URL when set; in dev we fall back to the same-origin proxy
// (`/api`). Never silently route production traffic to a hard-coded Render
// URL — that hid env-misconfiguration bugs and made forks/preview deploys
// leak data to the prod backend.
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// Trusted hosts for QR-decoded URLs. We only ever follow `?token=...` query
// params from these hosts; anything else is treated as a phishing attempt.
const TRUSTED_QR_HOSTS = new Set([
  'umr-project.vercel.app',
  'umr-project.onrender.com',
  typeof window !== 'undefined' ? window.location.host : '',
])
const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/

export default function EmergencyView() {
  usePageTitle('وصول الطوارئ')
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchId, setSearchId] = useState(id || '')
  const [showScanner, setShowScanner] = useState(false)

  useEffect(() => {
    let scanner = null;
    if (showScanner && !id) {
      scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 });
      scanner.render((decodedText) => {
        scanner.clear(); setShowScanner(false);

        // Strict QR handling — never blindly navigate to a URL pulled from
        // a printed QR. Three accepted shapes:
        //   1. A bare 24-hex Mongo ObjectId  → emergency lookup
        //   2. A medcore:// deep link        → extract the id
        //   3. An HTTPS URL on a trusted host with `?token=` → use that token
        // Anything else is rejected.
        try {
          if (OBJECT_ID_RE.test(decodedText.trim())) {
            const id = decodedText.trim()
            setSearchId(id)
            fetchEmergencyData(id)
            return
          }

          const deepMatch = decodedText.match(/^medcore:\/\/emergency\/([a-fA-F0-9]{24})$/)
          if (deepMatch?.[1]) {
            setSearchId(deepMatch[1])
            fetchEmergencyData(deepMatch[1])
            return
          }

          if (/^https?:\/\//i.test(decodedText)) {
            const u = new URL(decodedText)
            if (!TRUSTED_QR_HOSTS.has(u.hostname)) {
              setError('رمز QR غير موثوق. تم رفض الرابط.')
              return
            }
            const token = u.searchParams.get('token')
            if (token) {
              window.history.pushState({}, '', `/emergency?token=${token}`)
              fetchEmergencyData(null, token)
              return
            }
            const m = u.pathname.match(/\/emergency\/([a-fA-F0-9]{24})/)
            if (m?.[1]) {
              setSearchId(m[1])
              fetchEmergencyData(m[1])
              return
            }
          }

          setError('رمز QR غير صالح')
        } catch {
          setError('رمز QR غير صالح')
        }
      }, () => {});
    }
    return () => { if (scanner) scanner.clear().catch(console.error); }
  }, [showScanner, id])

  const fetchEmergencyData = async (queryId, passedToken = null) => {
    if (!queryId?.trim() && !passedToken && !new URLSearchParams(window.location.search).get('token')) return
    try {
      setIsLoading(true); setError(null);
      const token = passedToken || new URLSearchParams(window.location.search).get('token')
      let json;
      if (token) {
        const res = await fetch(`${API_BASE}/patients/verify-qr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
        json = await res.json()
      } else { const res = await fetch(`${API_BASE}/emergency/${queryId.trim()}`); json = await res.json() }
      if (!json.success) throw new Error(json.message)
      if (token && json.data.patient) {
        let age = null;
        if (json.data.patient.dateOfBirth) { const diff = Date.now() - new Date(json.data.patient.dateOfBirth).getTime(); age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)); }
        setData({ isFullAccess: true, fullName: json.data.patient.fullName, nationalId: json.data.patient.nationalId, gender: json.data.patient.gender === "male" ? "ذكر" : "أنثى", age, bloodType: json.data.patient.bloodType || "غير محدد", allergies: json.data.patient.allergies || [], chronicDiseases: json.data.patient.chronicDiseases || [], emergencyContact: json.data.patient.emergencyContact, medications: json.data.prescriptions, records: json.data.records, labs: json.data.labs, radiology: json.data.radiology })
      } else { setData({ ...json.data, isFullAccess: false }) }
    } catch (err) { setError(err.message || 'لم يتم العثور على المريض أو الرابط منتهي الصلاحية'); setData(null) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { if (id) fetchEmergencyData(id) }, [id])

  // Reusable section card
  const Section = ({ icon: Icon, iconColor, title, borderColor = 'border-gray-100', children }) => (
    <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <Icon size={18} className={iconColor} strokeWidth={2.2} />
        <h3 className="font-black text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* ── Top emergency bar ── */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-rose-500 text-white">
        <div className="max-w-lg mx-auto px-4 py-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center"><Heart size={18} className="text-white" /></div>
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-[10px]">MC</div>
          </div>
          <h1 className="text-2xl font-black">🚑 وصول طوارئ</h1>
          <p className="text-red-100 text-xs mt-1 font-medium">Emergency Access — MedCore UMR</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Search ── */}
        {!id && !data && (
          <div className="space-y-3">
            <form onSubmit={(e) => { e.preventDefault(); fetchEmergencyData(searchId) }} className="flex gap-2">
              <input type="text" value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="أدخل الرقم القومي للمريض..."
                className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 text-sm font-medium shadow-sm" />
              <button type="submit" disabled={isLoading}
                className="px-5 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-sm disabled:opacity-50"><Search size={18} /></button>
            </form>
            <div className="flex justify-center">
              <button onClick={() => setShowScanner(!showScanner)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm text-sm">
                {showScanner ? <><X size={16} /> إغلاق الماسح</> : <><QrCode size={16} /> مسح QR Code</>}
              </button>
            </div>
            {showScanner && (
              <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 overflow-hidden"><div id="qr-reader" className="w-full"></div></div>
            )}
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
            <p className="text-gray-500 mt-4 font-bold text-sm">جاري البحث...</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <AlertTriangle className="mx-auto text-red-400 mb-3" size={36} />
            <p className="text-red-700 font-bold text-sm">{error}</p>
          </div>
        )}

        {/* ═════════ PATIENT DATA ═════════ */}
        {data && !isLoading && (
          <div className="space-y-4 animate-in fade-in">

            {/* Identity Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center"><User size={20} className="text-white" /></div>
                  <div><p className="text-white font-black text-lg">{data.fullName}</p><p className="text-slate-300 text-xs font-medium">{data.nationalId || '—'}</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-x-reverse divide-gray-100">
                <div className="p-4 text-center"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">النوع</p><p className="text-sm font-black text-gray-800">{data.gender}</p></div>
                <div className="p-4 text-center"><p className="text-[10px] text-gray-400 font-bold uppercase mb-1">العمر</p><p className="text-sm font-black text-gray-800">{data.age || '—'}</p></div>
              </div>
            </div>

            {/* Blood Type — HERO CARD */}
            <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-500" />
              <Droplets className="mx-auto text-red-500 mb-2" size={30} />
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">فصيلة الدم</p>
              <p className="text-5xl font-black text-red-600" dir="ltr">{data.bloodType !== 'unknown' ? data.bloodType : '⚠️'}</p>
              {data.bloodType === 'unknown' && <p className="text-xs text-gray-400 mt-1">غير محدد</p>}
            </div>

            {/* Allergies */}
            <Section icon={AlertTriangle} iconColor="text-amber-500" title="الحساسيات" borderColor="border-amber-200">
              {data.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-2">{data.allergies.map((a, i) => (
                  <span key={`allergy-${a}-${i}`} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold">⚠️ {a}</span>
                ))}</div>
              ) : <p className="text-gray-400 text-sm">لا توجد حساسيات مسجلة</p>}
            </Section>

            {/* Chronic Diseases */}
            <Section icon={Activity} iconColor="text-blue-500" title="الأمراض المزمنة" borderColor="border-blue-200">
              {data.chronicDiseases?.length > 0 ? (
                <div className="flex flex-wrap gap-2">{data.chronicDiseases.map((d, i) => (
                  <span key={`chronic-${d}-${i}`} className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full text-xs font-bold">{d}</span>
                ))}</div>
              ) : <p className="text-gray-400 text-sm">لا توجد أمراض مزمنة مسجلة</p>}
            </Section>

            {/* Active Medications */}
            {data.medications?.length > 0 && (
              <Section icon={Pill} iconColor="text-purple-500" title="الأدوية الحالية" borderColor="border-purple-200">
                <div className="space-y-2">{data.medications.map((med, i) => (
                  <div key={med._id || `med-${med.medication}-${i}`} className="flex justify-between items-center bg-purple-50 rounded-xl p-3 border border-purple-100">
                    <span className="text-gray-800 font-bold text-sm">{med.medication}</span>
                    <span className="text-purple-600 text-xs font-medium">{med.dose} — {med.duration}</span>
                  </div>
                ))}</div>
              </Section>
            )}

            {/* Emergency Contact */}
            {data.emergencyContact?.phone && (
              <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-green-100 bg-green-50">
                  <Phone size={18} className="text-green-600" strokeWidth={2.2} />
                  <h3 className="font-black text-green-800 text-sm">جهة اتصال الطوارئ</h3>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">الاسم</p><p className="text-sm font-bold text-gray-800">{data.emergencyContact.name}</p></div>
                    <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">القرابة</p><p className="text-sm font-bold text-gray-800">{data.emergencyContact.relation}</p></div>
                  </div>
                  <a href={`tel:${data.emergencyContact.phone}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition text-sm shadow-sm">
                    <Phone size={16} /> اتصال: {data.emergencyContact.phone}
                  </a>
                </div>
              </div>
            )}

            {/* PUBLIC records */}
            {(!data.isFullAccess && data.records?.length > 0) && (
              <Section icon={FileText} iconColor="text-gray-500" title="التشخيصات السابقة">
                <div className="space-y-2">{data.records.map((r, i) => (
                  <div key={r._id || `rec-${i}`} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start"><span className="text-gray-800 font-bold text-sm">{r.diagnosis}</span><span className="text-gray-400 text-[10px] shrink-0">{new Date(r.visitDate || r.createdAt).toLocaleDateString('ar-EG')}</span></div>
                    {r.notes && <p className="text-gray-500 text-xs mt-1">{r.notes}</p>}
                  </div>
                ))}</div>
              </Section>
            )}

            {/* FULL ACCESS */}
            {data.isFullAccess && (
              <div className="space-y-4">
                <div className="flex justify-center"><span className="inline-block px-4 py-1.5 bg-green-50 text-green-700 font-bold rounded-full text-xs border border-green-200">✅ وصول كامل للسجل الطبي (مؤقت)</span></div>
                {data.records?.length > 0 && (
                  <Section icon={FileText} iconColor="text-sky-500" title="التشخيصات السابقة" borderColor="border-sky-200">
                    <div className="space-y-2">{data.records.map((r, i) => (
                      <div key={r._id || `full-rec-${i}`} className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                        <div className="flex justify-between items-start"><span className="text-gray-800 font-bold text-sm">{r.diagnosis}</span><span className="text-gray-400 text-[10px]">{new Date(r.visitDate || r.createdAt).toLocaleDateString('ar-EG')}</span></div>
                        {r.notes && <p className="text-gray-500 text-xs mt-1">{r.notes}</p>}
                      </div>
                    ))}</div>
                  </Section>
                )}
                {data.labs?.length > 0 && (
                  <Section icon={Shield} iconColor="text-emerald-500" title="تحاليل نُفِّذَت" borderColor="border-emerald-200">
                    <div className="space-y-2">{data.labs.map((l, i) => (
                      <div key={l._id || `lab-${i}`} className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 flex justify-between">
                        <span className="text-gray-800 font-bold text-sm">{l.testName}</span>
                        <span className="text-gray-400 text-[10px]">{new Date(l.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                    ))}</div>
                  </Section>
                )}
                {data.radiology?.length > 0 && (
                  <Section icon={Radiation} iconColor="text-indigo-500" title="تقارير أشعة" borderColor="border-indigo-200">
                    <div className="space-y-2">{data.radiology.map((r, i) => (
                      <div key={r._id || `rad-${i}`} className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <div className="flex justify-between"><span className="text-gray-800 font-bold text-sm">{r.scanType}</span><span className="text-gray-400 text-[10px]">{new Date(r.createdAt).toLocaleDateString('ar-EG')}</span></div>
                        {r.report && <p className="text-gray-500 text-xs mt-1">{r.report}</p>}
                      </div>
                    ))}</div>
                  </Section>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-center text-gray-400 text-[10px] pb-4">هذه البيانات للاستخدام الطبي الطارئ فقط — MedCore UMR System</p>
          </div>
        )}
      </div>
    </div>
  )
}
