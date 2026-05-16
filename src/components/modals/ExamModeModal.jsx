import { useState, useEffect } from 'react'
import { X, User, Activity, CheckCircle, FileText, Pill, FileSymlink, Stethoscope, Clock, KeyRound, Brain, Sparkles, ShieldCheck, ShieldAlert, AlertTriangle, History } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import api from '@/services/api.js'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner.jsx'

export default function ExamModeModal({ isOpen, onClose, appointment, onSuccess }) {
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('record')

  // FormData corresponding to all sections
  const [formData, setFormData] = useState({
    diagnosis: '',
    notes: '',
    medications: [],
    requestedLabs: '',
    requestedRadiology: '',
    doctorNotes: '',
  })

  // State for new medication input
  const [newMed, setNewMed] = useState({ medication: '', dose: '', duration: '', isChronic: false })

  // AI states
  const [isSimplifying, setIsSimplifying] = useState(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const [isCheckingInteraction, setIsCheckingInteraction] = useState(false)
  const [interactionResult, setInteractionResult] = useState(null)

  // History state — dual mode: own records (no OTP) OR full OTP access
  const [historyMode, setHistoryMode] = useState('idle') // 'idle' | 'own' | 'otp'
  const [historyFlow, setHistoryFlow] = useState('idle') // for OTP: 'idle'|'requesting'|'awaiting_otp'|'granted'
  const [sessionId, setSessionId] = useState(null)
  const [otpCode, setOtpCode] = useState('')
  const [patientData, setPatientData] = useState(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        diagnosis: '',
        notes: '',
        medications: [],
        requestedLabs: '',
        requestedRadiology: '',
        doctorNotes: appointment?.doctorNotes || '',
      })
      setNewMed({ medication: '', dose: '', duration: '', isChronic: false })
      setActiveTab('record')
      setHistoryMode('idle')
      setHistoryFlow('idle')
      setSessionId(null)
      setOtpCode('')
      setPatientData(null)
      setInteractionResult(null)
      setInteractionResult(null)
      setIsSimplifying(false)
      setIsFormatting(false)
    }
  }, [isOpen, appointment])

  if (!isOpen || !appointment) return null

  const patient = appointment.patientId

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMedChange = (e) => {
    const { name, value, type, checked } = e.target
    setNewMed(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // ── AI: Simplify diagnosis for patient notes
  const handleSimplifyDiagnosis = async () => {
    if (!formData.diagnosis.trim()) {
      toast.error('يرجى كتابة التشخيص الطبي أولاً')
      return
    }
    try {
      setIsSimplifying(true)
      const { data } = await api.post('/ai/simplify-diagnosis', { diagnosis: formData.diagnosis })
      if (data.success && data.data.simplifiedNotes) {
        setFormData(prev => ({ ...prev, notes: data.data.simplifiedNotes }))
        toast.success('✨ تم توليد الملاحظات للمريض بنجاح')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر الاتصال بالذكاء الاصطناعي')
    } finally {
      setIsSimplifying(false)
    }
  }

  // ── AI: Format/restructure medical diagnosis
  const handleFormatAi = async () => {
    if (!formData.diagnosis.trim()) {
      toast.error('يرجى كتابة الشكوى أو مبدأ التشخيص أولاً')
      return
    }
    try {
      setIsFormatting(true)
      const { data } = await api.post('/ai/format-record', { rawText: formData.diagnosis })
      if (data.success && data.data.structuredText) {
        setFormData(prev => ({ ...prev, diagnosis: data.data.structuredText }))
        toast.success('✨ تم تحويل صياغة التشخيص طبياً بنجاح')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر الاتصال بالذكاء الاصطناعي')
    } finally {
      setIsFormatting(false)
    }
  }

  // ── AI: Check drug interactions
  const handleCheckInteractions = async () => {
    if (formData.medications.length === 0 && !newMed.medication.trim()) {
      toast.info('يرجى إضافة دواء أولاً للفحص')
      return
    }
    try {
      setIsCheckingInteraction(true)
      const allMeds = [...formData.medications.map(m => m.medication)]
      if (newMed.medication.trim()) allMeds.push(newMed.medication.trim())

      const { data } = await api.post('/ai/check-interactions', {
        newDrug: newMed.medication.trim() || allMeds[allMeds.length - 1],
        currentDrugs: allMeds,
        allergies: patient?.allergies || []
      })
      setInteractionResult(data.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل فحص التعارض')
    } finally {
      setIsCheckingInteraction(false)
    }
  }

  // ── OTP: Request access
  const handleRequestOtp = async () => {
    try {
      setHistoryFlow('requesting')
      const { data } = await api.post('/records/request-access', { patientId: patient._id })
      // Without storing the sessionId returned here, verify-otp below would
      // ship `sessionId: null` and the backend validator would reject every
      // attempt as "Valid sessionId is required" — which surfaced as a
      // misleading "رمز التحقق غير صحيح" toast.
      setSessionId(data.sessionId)
      setHistoryFlow('awaiting_otp')
      toast.success(data?.message || 'تم إرسال رمز OTP لحساب المريض في النظام')
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إرسال الطلب')
      setHistoryFlow('idle')
    }
  }

  // ── OTP: Verify
  const handleVerifyOtp = async () => {
    try {
      setHistoryFlow('requesting')
      const { data } = await api.post('/records/verify-otp', { sessionId, code: otpCode.trim() })
      setPatientData(data)
      setHistoryFlow('granted')
      toast.success('تم فتح السجلات بنجاح')
    } catch (err) {
      // Surface the backend's actual reason (validator failures, lockout,
      // expired session, wrong code) rather than always showing "wrong code"
      // — that masked the missing-sessionId bug above for a long time.
      toast.error(err.response?.data?.message || 'رمز التحقق غير صحيح')
      setHistoryFlow('awaiting_otp')
    }
  }

  // ── Load own records (records the CURRENT doctor made, no OTP needed)
  const handleLoadOwnRecords = async () => {
    try {
      setIsLoadingHistory(true)
      const { data } = await api.get(`/records/doctor-patient/${patient._id}`)
      setPatientData(data)
      setHistoryMode('own')
      toast.success('تم تحميل سجلاتك السابقة مع هذا المريض')
    } catch (err) {
      toast.error('تعذر تحميل السجلات')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const addMedication = () => {
    if (!newMed.medication || !newMed.dose || !newMed.duration) {
      toast.error('يرجى تعبئة كافة حقول الدواء')
      return
    }
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, newMed]
    }))
    setNewMed({ medication: '', dose: '', duration: '', isChronic: false })
    setInteractionResult(null) // Reset after adding
  }

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
    setInteractionResult(null)
  }

  const handleFinishExam = async () => {
    if (!formData.diagnosis.trim()) {
      toast.error('التشخيص الطبي إلزامي (سجل الزيارة)')
      setActiveTab('record')
      return
    }

    try {
      setSubmitting(true)

      // 1. Create Record (including referrals)
      const labsArray = formData.requestedLabs.split('\n').filter(l => l.trim().length > 0)
      const radArray = formData.requestedRadiology.split('\n').filter(r => r.trim().length > 0)

      await api.post('/records', {
        patientId: patient._id,
        diagnosis: formData.diagnosis.trim(),
        notes: formData.notes.trim() || undefined,
        visitDate: new Date().toISOString().split('T')[0],
        requestedLabs: labsArray,
        requestedRadiology: radArray
      })

      // 2. Create Prescriptions (Bulk)
      if (formData.medications.length > 0) {
        const medsPayload = formData.medications.map(m => ({
          ...m,
          patientId: patient._id
        }))
        await api.post('/prescriptions/bulk', { medications: medsPayload })
      }

      // 3. Update Appointment (doctorNotes and status)
      await api.patch(`/appointments/${appointment._id}/status`, {
        status: 'Completed',
        doctorNotes: formData.doctorNotes
      })

      toast.success('تم إنهاء الكشف بنجاح وحفظ كافة البيانات ✅')
      if (onSuccess) onSuccess()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر إنهاء الكشف')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 m-0 sm:p-4 bg-gray-900/80 backdrop-blur-sm" dir="rtl">
      <div className="bg-white w-full h-full sm:rounded-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-4xl shadow-2xl overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between p-5 border-b bg-gradient-to-l from-indigo-50 to-blue-50">
          <div className="flex w-full items-start md:items-center justify-between md:justify-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <Stethoscope size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 tracking-tight">نافذة الكشف: {patient?.fullName || 'غير معروف'}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600 mt-1 font-medium">
                  <span className="bg-white/60 px-2 py-0.5 rounded-md border border-indigo-100">فصيلة الدم: {patient?.bloodType !== 'unknown' ? patient?.bloodType : '—'}</span>
                  <span className={`bg-white/60 px-2 py-0.5 rounded-md border ${patient?.allergies?.length ? 'border-red-200 text-red-600' : 'border-indigo-100'}`}>
                    حساسية: {patient?.allergies?.length ? patient.allergies.join(', ') : 'لا يوجد'}
                  </span>
                  <span className={`bg-white/60 px-2 py-0.5 rounded-md border ${patient?.chronicDiseases?.length ? 'border-orange-200 text-orange-600' : 'border-indigo-100'}`}>
                    مزمنة: {patient?.chronicDiseases?.length ? patient.chronicDiseases.join(', ') : 'لا يوجد'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex border items-center justify-center rounded-full bg-white hover:bg-gray-100 text-gray-500 transition-colors shadow-sm"
              title="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* BODY TABS */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-6">
              <TabsTrigger value="record" className="flex items-center gap-2 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <FileText size={16} /> التشخيص
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Clock size={16} /> السجل السابق
              </TabsTrigger>
              <TabsTrigger value="prescription" className="flex items-center gap-2 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <Pill size={16} /> وصفة طبية
                {formData.medications.length > 0 && <span className="bg-white text-indigo-600 rounded-full px-1.5 py-0.5 text-xs mr-1">{formData.medications.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="referrals" className="flex items-center gap-2 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <FileSymlink size={16} /> إحالات
              </TabsTrigger>
              <TabsTrigger value="secret_notes" className="flex items-center gap-2 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <User size={16} /> ملاحظات
              </TabsTrigger>
            </TabsList>

            <div className="bg-white border rounded-xl p-5 shadow-sm min-h-[300px]">

              {/* TAB 1: Record / Diagnosis */}
              <TabsContent value="record" className="space-y-4 m-0 data-[state=inactive]:hidden block">
                <h4 className="font-bold text-gray-800 mb-2 border-b pb-2">السجل الطبي والتشخيص 📄</h4>

                {/* Diagnosis field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">التشخيص الطبي <span className="text-red-500">*</span></label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                      onClick={handleFormatAi}
                      disabled={isFormatting || !formData.diagnosis.trim()}
                      title="تحسين صياغة التشخيص الطبي المهني باستخدام الذكاء الاصطناعي"
                    >
                      {isFormatting ? <Spinner className="w-3 h-3" /> : <Sparkles size={12} />}
                      {isFormatting ? 'جاري التحسين...' : 'تحسين الصياغة (AI)'}
                    </Button>
                  </div>
                  <textarea
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleChange}
                    rows={4}
                    placeholder="اكتب التشخيص التفصيلي الخاص بالزيارة هنا..."
                    className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm resize-none"
                  />
                </div>

                {/* Notes field + AI button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-gray-700">
                      ملاحظات للمريض <span className="text-gray-400 font-normal text-xs">(تظهر للمريض في السجل)</span>
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                      onClick={handleSimplifyDiagnosis}
                      disabled={isSimplifying || !formData.diagnosis.trim()}
                      title="اجعل Gemini AI يكتب ملاحظات مبسطة للمريض بناءً على تشخيصك"
                    >
                      {isSimplifying ? <Spinner className="w-3 h-3" /> : <Sparkles size={12} />}
                      {isSimplifying ? 'يكتب...' : 'AI يكتب الملاحظات'}
                    </Button>
                  </div>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="أي تعليمات خاصة للمريض، أو اضغط زر AI لتوليدها تلقائياً..."
                    className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm resize-none bg-gray-50"
                  />
                </div>
              </TabsContent>

              {/* TAB: History — own records (no OTP) + full OTP access */}
              <TabsContent value="history" className="m-0 data-[state=inactive]:hidden block">
                <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">التاريخ المرضي السابق للمريض 🕰️</h4>

                {/* Mode selector when idle */}
                {historyMode === 'idle' && historyFlow === 'idle' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Own records — fast, no OTP */}
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <History size={32} className="text-emerald-600 mx-auto mb-2" />
                      <h5 className="font-bold text-gray-800 text-sm mb-1">سجلاتي مع هذا المريض</h5>
                      <p className="text-xs text-gray-500 mb-3">عرض الزيارات التي سجلتها أنت فقط — فوري بدون OTP</p>
                      <Button
                        onClick={handleLoadOwnRecords}
                        disabled={isLoadingHistory}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 h-9 text-sm gap-1.5"
                      >
                        {isLoadingHistory ? <Spinner className="w-4 h-4" /> : <History size={14} />}
                        عرض سجلاتي
                      </Button>
                    </div>

                    {/* Full history — needs OTP */}
                    <div className="p-5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                      <KeyRound size={32} className="text-indigo-600 mx-auto mb-2" />
                      <h5 className="font-bold text-gray-800 text-sm mb-1">كامل التاريخ المرضي</h5>
                      <p className="text-xs text-gray-500 mb-3">سجلات جميع الأطباء — يتطلب OTP من المريض</p>
                      <Button
                        onClick={() => { setHistoryMode('otp'); handleRequestOtp() }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-9 text-sm gap-1.5"
                      >
                        <KeyRound size={14} /> طلب OTP من المريض
                      </Button>
                    </div>
                  </div>
                )}

                {/* Loading own records */}
                {isLoadingHistory && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Spinner className="w-8 h-8 text-indigo-600 mb-2" />
                    <p className="text-gray-500 text-sm">جاري تحميل السجلات...</p>
                  </div>
                )}

                {/* OTP flow */}
                {historyMode === 'otp' && historyFlow === 'requesting' && (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Spinner className="w-8 h-8 text-indigo-600 mb-2" />
                    <p className="text-gray-500 text-sm">جاري الإرسال...</p>
                  </div>
                )}

                {historyMode === 'otp' && historyFlow === 'awaiting_otp' && (
                  <div className="flex flex-col items-center justify-center p-6 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                    <KeyRound size={32} className="text-indigo-600 mb-3" />
                    <h4 className="font-bold text-gray-800 text-sm mb-1">أدخل الرمز</h4>
                    <p className="text-xs text-gray-500 mb-4">تم إرسال الرمز لحساب المريض في النظام. اطلبه منه وأدخله هنا.</p>
                    <div className="flex gap-2 justify-center">
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/, ''))}
                        className="w-32 text-center text-xl tracking-widest font-bold"
                        dir="ltr"
                      />
                      <Button onClick={handleVerifyOtp} disabled={otpCode.length !== 6} className="bg-indigo-600">فتح السجل</Button>
                    </div>
                  </div>
                )}

                {/* Records Display — works for both own and granted */}
                {(historyMode === 'own' || historyFlow === 'granted') && patientData && (
                  <div className="space-y-4">
                    <div className={`p-3 ${historyMode === 'own' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-indigo-50 border-indigo-200 text-indigo-800'} border rounded-lg text-xs font-bold flex items-center gap-2`}>
                      <ShieldCheck size={14} />
                      <span>
                        {historyMode === 'own'
                          ? `عرض ${patientData.data?.records?.length || 0} سجل كتبته أنت مع هذا المريض`
                          : '✅ تم فتح كامل السجل المرضي'}
                      </span>
                      <button
                        className="mr-auto text-gray-400 hover:text-gray-600"
                        onClick={() => { setHistoryMode('idle'); setHistoryFlow('idle'); setPatientData(null) }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {patientData.data?.records?.length > 0 ? (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {patientData.data.records.map((rec, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-xl border text-sm">
                            <div className="flex justify-between mb-2">
                              <span className="font-bold text-indigo-700 text-sm">{rec.diagnosis}</span>
                              <span className="text-xs text-gray-400 font-medium" dir="ltr">
                                {new Date(rec.visitDate || rec.createdAt).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            {rec.notes && <p className="text-xs text-gray-600 mb-2">الملاحظات: {rec.notes}</p>}
                            <div className="flex flex-wrap gap-1">
                              {rec.requestedLabs?.length > 0 && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                  تحاليل: {rec.requestedLabs.join('، ')}
                                </span>
                              )}
                              {rec.requestedRadiology?.length > 0 && (
                                <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                  أشعة: {rec.requestedRadiology.join('، ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">لا توجد سجلات سابقة</p>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: Prescription */}
              <TabsContent value="prescription" className="space-y-6 m-0 data-[state=inactive]:hidden block">
                <h4 className="font-bold text-gray-800 mb-2 border-b pb-2">صرف أدوية (روشتة) 💊</h4>

                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-bold text-gray-600">اسم الدواء</label>
                    <Input name="medication" value={newMed.medication} onChange={handleMedChange} placeholder="مثال: الباراسيتامول" className="bg-white" />
                  </div>
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-bold text-gray-600">الجرعة</label>
                    <Input name="dose" value={newMed.dose} onChange={handleMedChange} placeholder="حبة كل 8 ساعات" className="bg-white" />
                  </div>
                  <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-bold text-gray-600">المدة</label>
                    <Input name="duration" value={newMed.duration} onChange={handleMedChange} placeholder="5 أيام" className="bg-white" />
                  </div>
                  <div className="flex items-center gap-2 h-10 w-full md:w-auto px-2">
                    <input type="checkbox" id="isChronicMed" name="isChronic" checked={newMed.isChronic} onChange={handleMedChange} className="w-4 h-4 rounded" />
                    <label htmlFor="isChronicMed" className="text-xs font-bold text-gray-700">مزمن</label>
                  </div>
                  <Button type="button" onClick={addMedication} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 h-10">إضافة</Button>
                </div>

                {/* AI Interaction Check */}
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50"
                    onClick={handleCheckInteractions}
                    disabled={isCheckingInteraction || (formData.medications.length === 0 && !newMed.medication.trim())}
                  >
                    {isCheckingInteraction ? <Spinner className="w-3 h-3" /> : <Brain size={14} />}
                    فحص التعارض الدوائي (AI)
                  </Button>
                  {interactionResult && (
                    <button className="text-gray-400 hover:text-gray-600 text-xs" onClick={() => setInteractionResult(null)}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Interaction Result */}
                {interactionResult && (
                  <div className={`p-4 rounded-xl border text-sm font-medium ${
                    interactionResult.status === 'Danger' ? 'bg-red-50 border-red-200 text-red-800' :
                    interactionResult.status === 'Warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                    'bg-green-50 border-green-200 text-green-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 font-bold">
                      {interactionResult.status === 'Danger' && <ShieldAlert size={16} />}
                      {interactionResult.status === 'Warning' && <AlertTriangle size={16} />}
                      {interactionResult.status === 'Safe' && <ShieldCheck size={16} />}
                      نتيجة فحص التعارض: {interactionResult.status === 'Danger' ? 'خطر' : interactionResult.status === 'Warning' ? 'تحذير' : 'آمن'}
                    </div>
                    <p className="text-xs">{interactionResult.message}</p>
                  </div>
                )}

                {formData.medications.length > 0 && (
                  <div>
                    <h5 className="text-sm font-bold text-gray-700 mb-2">الأدوية المضافة:</h5>
                    <ul className="space-y-2">
                      {formData.medications.map((m, i) => (
                        <li key={i} className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-indigo-700 text-sm">
                              {m.medication} {m.isChronic && <span className="bg-red-100 text-red-700 text-[10px] px-1 rounded mr-1">مزمن</span>}
                            </span>
                            <span className="text-xs text-gray-500">الجرعة: {m.dose} | المدة: {m.duration}</span>
                          </div>
                          <button type="button" onClick={() => removeMedication(i)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-2 py-1 rounded">إزالة</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: Referrals */}
              <TabsContent value="referrals" className="space-y-4 m-0 data-[state=inactive]:hidden block">
                <h4 className="font-bold text-gray-800 mb-2 border-b pb-2">طلبات التحاليل والأشعة 🩻</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">التحاليل الطبية المطلوبة (كل تحليل في سطر)</label>
                    <textarea
                      name="requestedLabs"
                      value={formData.requestedLabs}
                      onChange={handleChange}
                      rows={5}
                      placeholder={`مثال:\nCBC\nHbA1c`}
                      className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">الأشعة المطلوبة (كل أشعة في سطر)</label>
                    <textarea
                      name="requestedRadiology"
                      value={formData.requestedRadiology}
                      onChange={handleChange}
                      rows={5}
                      placeholder={`مثال:\nX-Ray Chest\nMRI Brain`}
                      className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm resize-none"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: Secret Notes */}
              <TabsContent value="secret_notes" className="space-y-4 m-0 data-[state=inactive]:hidden block">
                <h4 className="font-bold text-gray-800 mb-2 border-b pb-2">ملاحظات الطبيب السرية 🔒</h4>
                <p className="text-xs text-gray-500 mb-2">هذه الملاحظات تحفظ في تذكرة الموعد ولا تظهر أبداً للمريض.</p>
                <textarea
                  name="doctorNotes"
                  value={formData.doctorNotes}
                  onChange={handleChange}
                  rows={6}
                  placeholder="اكتب ملاحظاتك الخاصة هنا..."
                  className="w-full p-4 rounded-xl border border-amber-200 bg-amber-50 focus:border-amber-400 focus:outline-none text-sm resize-none shadow-inner"
                />
              </TabsContent>

            </div>
          </Tabs>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t bg-white flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handleFinishExam}
            disabled={submitting}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base gap-2"
          >
            {submitting ? <Spinner className="w-5 h-5" /> : <><CheckCircle size={20} /> إنهاء وتسجيل الكشف</>}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="px-8 h-12 font-bold"
          >
            إغلاق
          </Button>
        </div>

      </div>
    </div>
  )
}
