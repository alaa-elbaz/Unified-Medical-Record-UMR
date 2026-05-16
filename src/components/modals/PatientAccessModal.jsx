import { useState, useEffect, useRef, useCallback } from 'react'
import {
  X, ShieldCheck, KeyRound, AlertTriangle, Clock, Loader2,
  FileText, Pill, User, ShieldAlert, CheckCircle, LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import api from '@/services/api.js'
import { toast } from 'sonner'

/* ─────────────────────────────────────────────
   SESSION TIMEOUT: 30 minutes = 1800 seconds
───────────────────────────────────────────── */
const SESSION_DURATION_SECONDS = 30 * 60

export default function PatientAccessModal({ isOpen, onClose, patient }) {
  /* ── Flow States: 'idle' | 'requesting' | 'awaiting_otp' | 'granted' | 'emergency_form' | 'loading_emergency' ── */
  const [flow, setFlow] = useState('idle')
  const [sessionId, setSessionId] = useState(null)
  const [devOtp, setDevOtp] = useState(null) // REMOVE IN PRODUCTION
  const [otpCode, setOtpCode] = useState('')
  const [patientData, setPatientData] = useState(null)
  const [emergencyReason, setEmergencyReason] = useState('')

  // Session timeout state
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_DURATION_SECONDS)
  const timeoutRef = useRef(null)
  const intervalRef = useRef(null)

  /* ── Start / clear session timer ── */
  const startSessionTimer = useCallback(() => {
    setSessionTimeLeft(SESSION_DURATION_SECONDS)

    // Clear any existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Countdown every second
    intervalRef.current = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Auto-expire session after 30 min
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current)
      setFlow('idle')
      setPatientData(null)
      setSessionId(null)
      toast.warning('انتهت صلاحية الجلسة لحماية خصوصية المريض', {
        duration: 6000,
        icon: '🔒'
      })
    }, SESSION_DURATION_SECONDS * 1000)
  }, [])

  const clearSessionTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  /* ─────────────────────────────────────────────
     Auto-Load Doctor's Own Records if requested
  ───────────────────────────────────────────── */
  const fetchOwnRecords = useCallback(async () => {
    try {
      setFlow('requesting')
      const { data } = await api.get(`/records/doctor-patient/${patient._id}`)
      setPatientData({ data: data.data || data })
      setFlow('granted')
      startSessionTimer()
      toast.success('تم جلب ملفاتك الخاصة بالمريض بنجاح')
    } catch (err) {
      toast.error('لم يتم العثور على سجلات سابقة للمريض معك')
      setFlow('idle')
    }
  }, [patient?._id, startSessionTimer])

  /* ── Reset everything on close ── */
  const handleClose = () => {
    clearSessionTimer()
    setFlow('idle')
    setSessionId(null)
    setDevOtp(null)
    setOtpCode('')
    setPatientData(null)
    setEmergencyReason('')
    setSessionTimeLeft(SESSION_DURATION_SECONDS)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      clearSessionTimer()
    } else if (patient?.__autoOwn) {
      fetchOwnRecords()
    }
    return () => clearSessionTimer()
  }, [isOpen, patient, clearSessionTimer, fetchOwnRecords])

  /* ─────────────────────────────────────────────
     STEP 1: Request OTP
  ───────────────────────────────────────────── */
  const handleRequestOtp = async () => {
    if (!patient?._id) return
    try {
      setFlow('requesting')
      const { data } = await api.post('/records/request-access', { patientId: patient._id })
      setSessionId(data.sessionId)
      // Only display the dev OTP in actual development builds — defends against
      // a misconfigured production build accidentally leaving DEV=true and
      // against the backend ever leaking `__dev_otp` outside dev.
      if (import.meta.env.DEV && data.__dev_otp) {
        setDevOtp(data.__dev_otp)
      }
      setFlow('awaiting_otp')
      toast.success('تم إرسال رمز التحقق (OTP) للمريض')
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إرسال الطلب')
      setFlow('idle')
    }
  }

  /* ─────────────────────────────────────────────
     STEP 2: Verify OTP → Get Records
  ───────────────────────────────────────────── */
  const handleVerifyOtp = async () => {
    if (!sessionId || !otpCode.trim()) return
    try {
      setFlow('requesting')
      const { data } = await api.post('/records/verify-otp', { sessionId, code: otpCode.trim() })
      setPatientData(data)
      setFlow('granted')
      startSessionTimer()
      toast.success('تم التحقق بنجاح ✅ — الجلسة نشطة لمدة 30 دقيقة')
    } catch (err) {
      toast.error(err.response?.data?.message || 'رمز التحقق غير صحيح')
      setFlow('awaiting_otp')
    }
  }

  /* ─────────────────────────────────────────────
     EMERGENCY: Break-the-Glass Override
  ───────────────────────────────────────────── */
  const handleEmergencyAccess = async () => {
    if (!emergencyReason.trim() || emergencyReason.trim().length < 10) {
      toast.error('يجب تقديم سبب واضح لا يقل عن 10 أحرف')
      return
    }
    try {
      setFlow('loading_emergency')
      const { data } = await api.post(`/records/emergency-access/${patient._id}`, {
        reason: emergencyReason.trim()
      })
      setPatientData(data)
      setFlow('granted')
      startSessionTimer()
      toast.warning('⚠️ تم فتح سجل الطوارئ وتسجيل الدخول الأمني بالكامل', { duration: 8000 })
    } catch (err) {
      const msg = err.response?.data?.message || 'تعذر الوصول الطارئ'
      toast.error(msg)
      setFlow('emergency_form')
    }
  }

  if (!isOpen || !patient) return null

  /* ——————————————————————————————————————————
     FORMAT session time remaining
  —————————————————————————————————————————— */
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }
  const sessionPct = (sessionTimeLeft / SESSION_DURATION_SECONDS) * 100
  const sessionUrgent = sessionTimeLeft < 5 * 60 // less than 5 min

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className={`flex items-center justify-between p-5 border-b shrink-0 ${flow === 'granted' ? 'bg-gradient-to-l from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-l from-indigo-50 to-blue-50 border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${flow === 'granted' ? 'bg-green-600' : 'bg-indigo-600'}`}>
              {flow === 'granted' ? <CheckCircle size={22} className="text-white" /> : <ShieldCheck size={22} className="text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {flow === 'granted' ? 'جلسة مشاركة السجل نشطة' : 'طلب الوصول للسجل الطبي'}
              </h3>
              <p className="text-xs text-gray-500">{patient.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {flow === 'granted' && (
              <button
                onClick={handleClose}
                title="إنهاء الجلسة"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-bold text-gray-600"
              >
                <LogOut size={14} /> إنهاء الجلسة
              </button>
            )}
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* ─── IDLE: Choose access method ─── */}
          {flow === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center mb-6">
                للوصول للسجل الطبي للمريض <strong>{patient.fullName}</strong>، يلزم التحقق من هويته أولاً.
              </p>

              {/* Standard OTP Button */}
              <button
                onClick={handleRequestOtp}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-400 hover:bg-indigo-100 transition-all text-right group"
              >
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <KeyRound size={24} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-indigo-900">طلب رمز OTP</p>
                  <p className="text-xs text-indigo-600 mt-0.5">سيُرسل رمز التحقق للمريض ويشاركه معك</p>
                </div>
              </button>

              {/* Emergency Override Button */}
              <button
                onClick={() => setFlow('emergency_form')}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-red-200 bg-red-50 hover:border-red-400 hover:bg-red-100 transition-all text-right group"
              >
                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <ShieldAlert size={24} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-red-900">وصول طارئ (بدون رمز)</p>
                  <p className="text-xs text-red-600 mt-0.5">للحالات الحرجة فقط — يُسجَّل بالكامل في سجل التدقيق الأمني</p>
                </div>
              </button>

              <p className="text-[11px] text-gray-400 text-center mt-4">
                جميع عمليات الوصول للسجلات الطبية مسجلة ومراقبة وفقاً لمعايير الامتثال الطبي
              </p>
            </div>
          )}

          {/* ─── REQUESTING / LOADING ─── */}
          {(flow === 'requesting' || flow === 'loading_emergency') && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={44} className="animate-spin text-indigo-500 mb-4" />
              <p className="text-gray-600 font-semibold">
                {flow === 'loading_emergency' ? 'جاري فتح الوصول الطارئ وتسجيل العملية...' : 'جاري المعالجة...'}
              </p>
            </div>
          )}

          {/* ─── AWAITING OTP INPUT ─── */}
          {flow === 'awaiting_otp' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <KeyRound size={32} className="text-indigo-600" />
                </div>
                <h4 className="font-bold text-gray-800 text-lg mb-1">أدخل رمز التحقق (OTP)</h4>
                <p className="text-sm text-gray-500">اطلب من المريض <strong>{patient.fullName}</strong> مشاركة رمز OTP المرسل إليه</p>
              </div>

              {/* ⚠️ وضع التطوير فقط — لن يظهر في Vercel Production */}
              {import.meta.env.DEV && devOtp && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 text-center">
                  <p className="text-xs text-yellow-700 font-bold mb-1">⚠️ Dev Mode — يُحذف تلقائياً في الإنتاج</p>
                  <p className="text-2xl font-black text-yellow-800 tracking-widest" dir="ltr">{devOtp}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="أدخل الرمز المكون من 6 أرقام"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/, ''))}
                  className="text-center text-2xl tracking-widest font-bold h-14 border-2 border-indigo-200 focus:border-indigo-500"
                  dir="ltr"
                  onKeyDown={e => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                />
                <Button
                  id="verify-otp-btn"
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-base font-bold"
                >
                  <CheckCircle size={18} className="ml-2" />
                  تحقق وافتح السجل
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setFlow('idle'); setOtpCode(''); setSessionId(null); setDevOtp(null) }} className="text-gray-500">
                  عودة
                </Button>
              </div>
            </div>
          )}

          {/* ─── EMERGENCY REASON FORM ─── */}
          {flow === 'emergency_form' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={24} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-800 mb-1">تحذير: وصول طارئ بدون موافقة OTP</p>
                  <p className="text-sm text-red-700">
                    هذه العملية تحت التدقيق الأمني الكامل. سيُحفظ اسمك ووقت الدخول والسبب في سجل التدقيق.
                    يُستخدم فقط في الحالات الطارئة التي يكون فيها الاتصال بالمريض مستحيلاً.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  سبب الوصول الطارئ <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-500 mr-2">(10 أحرف على الأقل)</span>
                </label>
                <textarea
                  id="emergency-reason-input"
                  rows={4}
                  value={emergencyReason}
                  onChange={e => setEmergencyReason(e.target.value)}
                  placeholder="مثال: مريض فاقد الوعي في غرفة الطوارئ ويحتاج الفريق لمعرفة حساسيته وأدويته الحالية بشكل عاجل"
                  className="w-full p-3 rounded-xl border-2 border-red-200 focus:border-red-400 focus:outline-none text-sm resize-none transition-colors"
                />
                <p className={`text-xs mt-1 font-bold ${emergencyReason.trim().length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                  {emergencyReason.trim().length} / 10 حرف (الحد الأدنى)
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  id="emergency-access-btn"
                  onClick={handleEmergencyAccess}
                  disabled={emergencyReason.trim().length < 10}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white h-11 font-bold gap-2"
                >
                  <ShieldAlert size={18} />
                  تأكيد الوصول الطارئ
                </Button>
                <Button variant="outline" onClick={() => setFlow('idle')} className="px-6">
                  عودة
                </Button>
              </div>
            </div>
          )}

          {/* ─── GRANTED: Show patient records ─── */}
          {flow === 'granted' && patientData && (
            <div className="space-y-5">

              {/* Session Timer Bar */}
              <div className={`rounded-xl p-3 border ${sessionUrgent ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className={sessionUrgent ? 'text-red-600' : 'text-emerald-600'} />
                    <span className={`text-sm font-bold ${sessionUrgent ? 'text-red-700' : 'text-emerald-700'}`}>
                      انتهت صلاحية الجلسة خلال
                    </span>
                  </div>
                  <span className={`text-lg font-black tabular-nums ${sessionUrgent ? 'text-red-700' : 'text-emerald-700'}`} dir="ltr">
                    {formatTime(sessionTimeLeft)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-1000 ${sessionUrgent ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${sessionPct}%` }}
                  />
                </div>
                {sessionUrgent && (
                  <p className="text-xs text-red-600 font-bold mt-1">⚠️ ستنتهي جلسة الوصول قريباً ويُقفل السجل تلقائياً</p>
                )}
              </div>

              {/* Patient Info */}
              {patientData.data?.patient && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={18} className="text-indigo-600" />
                    <h4 className="font-bold text-indigo-800">بيانات المريض</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">الاسم:</span> <span className="font-bold">{patientData.data.patient.fullName}</span></div>
                    <div><span className="text-gray-500">الجنس:</span> <span className="font-bold">{patientData.data.patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span></div>
                    <div><span className="text-gray-500">فصيلة الدم:</span> <span className="font-bold text-red-600" dir="ltr">{patientData.data.patient.bloodType || '—'}</span></div>
                    {patientData.data.patient.allergies?.length > 0 && (
                      <div className="col-span-2"><span className="text-gray-500">الحساسيات:</span> <span className="font-bold text-orange-600">{patientData.data.patient.allergies.join('، ')}</span></div>
                    )}
                    {patientData.data.patient.chronicDiseases?.length > 0 && (
                      <div className="col-span-2"><span className="text-gray-500">الأمراض المزمنة:</span> <span className="font-bold text-purple-700">{patientData.data.patient.chronicDiseases.join('، ')}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Records */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-gray-600" />
                  <h4 className="font-bold text-gray-800">السجلات الطبية ({(patientData.data?.records || patientData.data || []).length})</h4>
                </div>
                {(patientData.data?.records || []).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(patientData.data.records).map((rec, i) => (
                      <div key={rec._id || `rec-${i}`} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-gray-800">{rec.diagnosis}</span>
                          <span className="text-xs text-gray-400" dir="ltr">{new Date(rec.visitDate || rec.createdAt).toLocaleDateString('en-GB')}</span>
                        </div>
                        {rec.notes && <p className="text-xs text-gray-500">{rec.notes}</p>}
                        {rec.requestedLabs?.length > 0 && <p className="text-xs text-blue-600 mt-1 font-medium">التحاليل المطلوبة: {rec.requestedLabs.join('، ')}</p>}
                        {rec.requestedRadiology?.length > 0 && <p className="text-xs text-indigo-600 mt-1 font-medium">الأشعة المطلوبة: {rec.requestedRadiology.join('، ')}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">لا توجد سجلات طبية</p>
                )}
              </div>

              {/* Prescriptions */}
              {patientData.data?.prescriptions?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pill size={18} className="text-purple-600" />
                    <h4 className="font-bold text-gray-800">الأدوية الحالية ({patientData.data.prescriptions.length})</h4>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {patientData.data.prescriptions.map((presc, i) => (
                      <div key={presc._id || `presc-${i}`} className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-sm flex justify-between">
                        <span className="font-bold text-purple-900">{presc.medication}</span>
                        <span className="text-xs text-purple-600">{presc.dose} — {presc.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
