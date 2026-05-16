import { useState, useEffect, useMemo } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Users, Calendar, FileText, Plus, FolderOpen, Brain, Search, Stethoscope, CheckCircle, Clock, XCircle, Activity, User, AlertTriangle, ChevronLeft } from 'lucide-react'
import api from '@/services/api.js'
import AddPatientModal from '@/components/modals/AddPatientModal.jsx'
import AddPrescriptionModal from '@/components/modals/AddPrescriptionModal.jsx'
import AddVisitModal from '@/components/modals/AddVisitModal.jsx'
import PatientAccessModal from '@/components/modals/PatientAccessModal.jsx'
import AiAnalysisModal from '@/components/modals/AiAnalysisModal.jsx'
import ExamModeModal from '@/components/modals/ExamModeModal.jsx'
import EmptyState from '@/components/ui/EmptyState.jsx'
import DoctorCharts from '@/components/doctor/DoctorCharts.jsx'
import { Spinner } from '@/components/ui/spinner.jsx'
import { toast } from 'sonner'
import { usePageTitle } from '@/hooks/usePageTitle.js'

/* ── خريطة الحالات (الباك إند يحفظ إنجليزي — نعرضها عربي) ── */
const STATUS_MAP = {
  Pending:     { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Confirmed:   { label: 'مؤكد',          color: 'bg-green-100  text-green-800  border-green-200'  },
  'In-Progress': { label: 'جارٍ',        color: 'bg-blue-100   text-blue-800   border-blue-200'   },
  Completed:   { label: 'مكتمل',         color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  Cancelled:   { label: 'ملغي',          color: 'bg-red-100    text-red-800    border-red-200'    },
  'Follow-up': { label: 'متابعة',        color: 'bg-purple-100 text-purple-800 border-purple-200' },
}

export default function DoctorPage() {
  usePageTitle('لوحة الطبيب')
  const { user } = useAuth()
  const location = useLocation()

  /* ── State ── */
  const [activeTab, setActiveTab] = useState('overview')
  const [appointments, setAppointments] = useState([])
  const [patients, setPatients] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [recentPatients, setRecentPatients] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  /* ── Search / Filter ── */
  const [patientSearch, setPatientSearch] = useState('')
  const [apptFilter, setApptFilter] = useState('all')   // 'all' | 'today' | 'pending'

  /* ── Modals ── */
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false)
  const [isAddPrescriptionOpen, setIsAddPrescriptionOpen] = useState(false)
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false)
  const [addVisitPatient, setAddVisitPatient] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiPatient, setAiPatient] = useState(null)
  
  /* ── Exam Mode ── */
  const [isExamModalOpen, setIsExamModalOpen] = useState(false)
  const [activeAppointment, setActiveAppointment] = useState(null)

  /* ── Data Fetch ── */
  const [scheduleForm, setScheduleForm] = useState({
    workingDays: user?.workingDays || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],

    start: user?.workingHours?.start || '09:00',
    end: user?.workingHours?.end || '17:00',
    slotDuration: user?.slotDuration || 10
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (user) {
      setScheduleForm({
        workingDays: user.workingDays || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        start: user.workingHours?.start || '09:00',
        end: user.workingHours?.end || '17:00',
        slotDuration: user.slotDuration || 10
      });
    }
  }, [user]);

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      setSavingSchedule(true);
      await api.put('/auth/profile', {
        workingDays: scheduleForm.workingDays,
        workingHours: { start: scheduleForm.start, end: scheduleForm.end },
        slotDuration: Number(scheduleForm.slotDuration)
      });
      toast.success('تم تحديث إعدادات المواعيد بنجاح');
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر حفظ الإعدادات');
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleWorkingDay = (day) => {
    setScheduleForm(prev => {
      const days = [...prev.workingDays];
      if (days.includes(day)) {
        return { ...prev, workingDays: days.filter(d => d !== day) };
      } else {
        return { ...prev, workingDays: [...days, day] };
      }
    });
  };

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [appRes, patRes, presRes, recentRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/patients/my-patients'),
        api.get('/prescriptions'),
        api.get('/records/doctor/my-patients'),
      ])
      setAppointments(appRes.data.data || [])
      setPatients(patRes.data.data || patRes.data.patients || [])
      const presList = presRes.data.data || presRes.data.prescriptions || []
      // Sort prescriptions by date descending (newest first) — TC-3.6
      setPrescriptions([...presList].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      setRecentPatients(recentRes.data.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('تعذر تحميل البيانات')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [location.pathname])

  /* ── Appointment Status Change ── */
  const handleUpdateStatus = async (appointmentId, status) => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status })
      toast.success('تم تحديث حالة الموعد')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'تعذر تحديث الحالة')
    }
  }

  /* ── Computed Stats ──
     `todayStr` was previously computed at the top of every render. The
     useMemos that referenced it didn't list it in their deps arrays, so
     after a date rollover (or any rerender that changed the closure) the
     memos returned stale values. Compute it inside each memo so the
     comparison is always against the current day. */
  const todayAppointments = useMemo(() => {
    const todayStr = new Date().toDateString()
    return appointments.filter(a => new Date(a.date).toDateString() === todayStr)
  }, [appointments])
  const pendingCount = useMemo(
    () => appointments.filter(a => a.status === 'Pending').length,
    [appointments]
  )
  const completedCount = useMemo(
    () => appointments.filter(a => a.status === 'Completed').length,
    [appointments]
  )

  /* ── Filtered Appointments ── */
  const filteredAppointments = useMemo(() => {
    const todayStr = new Date().toDateString()
    let list = appointments
    if (apptFilter === 'today')   list = list.filter(a => new Date(a.date).toDateString() === todayStr)
    if (apptFilter === 'pending') list = list.filter(a => a.status === 'Pending')
    return list
  }, [appointments, apptFilter])

  /* ── Filtered Patients ── */
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients
    const q = patientSearch.toLowerCase()
    return patients.filter(p =>
      p.fullName?.toLowerCase().includes(q) ||
      p.nationalId?.includes(q) ||
      p.phoneNumber?.includes(q)
    )
  }, [patients, patientSearch])

  const startExam = async (apt) => {
    try {
      if (apt.status === 'Confirmed') {
        // Change to In-Progress
        await api.patch(`/appointments/${apt._id}/status`, { status: 'In-Progress' })
        fetchData()
      }
      setActiveAppointment(apt)
      setIsExamModalOpen(true)
    } catch (error) {
      toast.error('لم نتمكن من بدء الكشف')
    }
  }

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            د. {user?.fullName || 'الطبيب'}
          </h1>
          <p className="text-muted-foreground">{user?.specialty || 'إدارة مرضاك وجدول مواعيدك'}</p>
        </div>

        {/* Profile warning removed by user request */}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setActiveTab('patients')}>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{patients.length}</div>
                <p className="text-sm text-muted-foreground">المرضى النشطون</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setActiveTab('appointments')}>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                {/* ✅ إحصائية حقيقية — مواعيد اليوم فقط */}
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{todayAppointments.length}</div>
                <p className="text-sm text-muted-foreground">مواعيد اليوم</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setActiveTab('appointments')}>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                {/* ✅ إحصائية حقيقية — انتظار الموافقة */}
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{pendingCount}</div>
                <p className="text-sm text-muted-foreground">بانتظار الموافقة</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setActiveTab('prescriptions')}>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">{prescriptions.length}</div>
                <p className="text-sm text-muted-foreground">روشتات وأدوية</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" /><span className="hidden sm:inline">نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /><span className="hidden sm:inline">المواعيد</span>
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="h-4 w-4" /><span className="hidden sm:inline">المرضى</span>
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /><span className="hidden sm:inline">الروشتات</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" /><span className="hidden sm:inline">إعدادات المواعيد</span>
            </TabsTrigger>
          </TabsList>

          {/* ════════ OVERVIEW ════════ */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DoctorCharts appointments={appointments} />
              </div>
              
              {/* أقرب 5 مواعيد */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">مواعيد اليوم</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayAppointments.slice(0, 5).map(apt => (
                      <div key={apt._id} className="flex flex-col p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-slate-100">{apt.patientId?.fullName}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5">{apt.appointmentType || 'كشف'}</p>
                            {(apt.reason || apt.notes) && (
                              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 line-clamp-1">سبب الزيارة: {apt.reason || apt.notes}</p>
                            )}
                          </div>
                          <div className="text-left flex flex-col items-end gap-1">
                            <p className="font-bold text-indigo-600 text-sm">{apt.time}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_MAP[apt.status]?.color}`}>{STATUS_MAP[apt.status]?.label}</span>
                          </div>
                        </div>
                        {/* Quick Actions */}
                        <div className="flex gap-1.5 pt-1 border-t border-gray-100 dark:border-slate-700">
                          {apt.status === 'Pending' && (
                            <>
                              <Button size="sm" className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-700 gap-1" onClick={() => handleUpdateStatus(apt._id, 'Confirmed')}>
                                <CheckCircle size={11} /> قبول
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs flex-1 gap-1" onClick={() => handleUpdateStatus(apt._id, 'Cancelled')}>
                                <XCircle size={11} /> رفض
                              </Button>
                            </>
                          )}
                          {(apt.status === 'Confirmed' || apt.status === 'In-Progress') && (
                            <Button size="sm" className="h-7 text-xs flex-1 bg-indigo-600 hover:bg-indigo-700 gap-1" onClick={() => startExam(apt)}>
                              <Stethoscope size={11} /> {apt.status === 'In-Progress' ? 'استئناف' : 'بدء الكشف'}
                            </Button>
                          )}
                          {apt.status === 'Completed' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-purple-700 border-purple-200 hover:bg-purple-50 gap-1" onClick={() => handleUpdateStatus(apt._id, 'Follow-up')}>
                              <Clock size={11} /> متابعة
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {todayAppointments.length === 0 && (
                      <EmptyState 
                        icon={Calendar} 
                        title="لا توجد مواعيد اليوم" 
                        description="يبدو أن جدولك فارغ اليوم. يمكنك متابعة أعمال أخرى أو إضافة مواعيد يدوياً." 
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ════════ APPOINTMENTS ════════ */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>جدولك</CardTitle>
                  <CardDescription>إدارة مواعيدك مع المرضى</CardDescription>
                </div>
                {/* ✅ فلاتر حقيقية */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all',     label: 'الكل' },
                    { key: 'today',   label: 'اليوم' },
                    { key: 'pending', label: 'انتظار' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setApptFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${apptFilter === f.key ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                    >
                      {f.label}
                      {f.key === 'pending' && pendingCount > 0 && (
                        <span className="mr-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{pendingCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : filteredAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {filteredAppointments.map((apt) => {
                      /* ✅ استخدام apt.patientId وليس apt.patient */
                      const patientName = apt.patientId?.fullName || 'مريض غير معروف'
                      const statusCfg = STATUS_MAP[apt.status] || STATUS_MAP.Pending

                      return (
                        <div key={apt._id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-start gap-3 hover:shadow-sm transition-shadow bg-white dark:bg-slate-900">
                          <div className="flex-1">
                            {/* ✅ الاسم يظهر الآن من patientId */}
                            <h3 className="font-bold text-base text-gray-900 dark:text-slate-100">{patientName}</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{apt.appointmentType || apt.type || 'كشف'}</p>
                            {apt.reason && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{apt.reason}</p>}
                            <p className="text-sm mt-2 font-medium text-gray-700 dark:text-slate-300">
                              {new Date(apt.date).toLocaleDateString('ar-EG')} — {apt.time}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {/* ✅ Badge مع الحالة الصحيحة */}
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.color}`}>
                              {statusCfg.label}
                            </span>

                            {/* ✅ الأزرار تعمل الآن — مقارنة صحيحة بالإنجليزي */}
                            {apt.status === 'Pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs bg-green-600 hover:bg-green-700 gap-1"
                                  onClick={() => handleUpdateStatus(apt._id, 'Confirmed')}
                                >
                                  <CheckCircle size={12} /> قبول
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 text-xs gap-1"
                                  onClick={() => handleUpdateStatus(apt._id, 'Cancelled')}
                                >
                                  <XCircle size={12} /> رفض
                                </Button>
                              </div>
                            )}
                            {/* ✅ الأزرار معتمدة على Exam Mode الجديد */}
                            {(apt.status === 'Confirmed' || apt.status === 'In-Progress') && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 gap-1"
                                  onClick={() => startExam(apt)}
                                >
                                  <Stethoscope size={12} /> {apt.status === 'In-Progress' ? 'استئناف الكشف' : 'بدء الكشف'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Calendar} 
                    title={apptFilter === 'today' ? 'لا توجد مواعيد اليوم' : apptFilter === 'pending' ? 'لا توجد مواعيد في الانتظار' : 'لا توجد مواعيد'} 
                    description="لم يتم العثور على أي مواعيد تطابق الفلتر الحالي." 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ PATIENTS ════════ */}
          <TabsContent value="patients">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>مرضاك</CardTitle>
                  <CardDescription>إدارة قائمة مرضاك</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsAddPatientOpen(true)}>
                  <Plus className="h-4 w-4" />إضافة مريض
                </Button>
              </CardHeader>
              <CardContent>
                {/* ✅ Search bar حقيقي */}
                <div className="relative mb-4">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                  <input
                    type="text"
                    placeholder="ابحث بالاسم أو الرقم القومي أو الهاتف..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500/50 focus:outline-none"
                  />
                </div>

                {isLoading ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : filteredPatients.length > 0 ? (
                  <div className="space-y-3">
                    {filteredPatients.map((p) => (
                      <div key={p._id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-sm transition-shadow bg-white dark:bg-slate-900">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{p.fullName}</h3>
                            <p className="text-xs text-gray-400 dark:text-slate-500">انضم: {new Date(p.createdAt).toLocaleDateString('ar-EG')}</p>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-slate-400 font-mono bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg" dir="ltr">{p.nationalId}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3" dir="ltr">{p.phoneNumber}</p>
                        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
                          {/* ✅ فتح السجل عبر OTP */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 flex-1"
                            onClick={() => { setSelectedPatient({ ...p, __autoOwn: true }); setIsAccessModalOpen(true) }}
                          >
                            <FolderOpen size={14} /> سجلاتي مع المريض
                          </Button>
                          {/* ✅ تحليل ذكي */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                            onClick={() => { setAiPatient(p); setIsAiModalOpen(true) }}
                            title="تحليل ذكي"
                          >
                            <Brain size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Users} 
                    title={patientSearch ? 'لا توجد نتائج للبحث' : 'لا يوجد مرضى مسجلين'} 
                    description="يمكنك إضافة مريض جديد للبدء في متابعة حالته." 
                    actionLabel="إضافة مريض"
                    onAction={() => setIsAddPatientOpen(true)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ PRESCRIPTIONS ════════ */}
          <TabsContent value="prescriptions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>وصفات طبية (روشتات)</CardTitle>
                  <CardDescription>إنشاء ومتابعة الأدوية والروشتات للمرضى</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsAddPrescriptionOpen(true)}>
                  <Plus className="h-4 w-4" />إضافة روشتة
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : prescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {prescriptions.map((presc) => (
                      <div key={presc._id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-sm transition-shadow bg-white dark:bg-slate-900">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-slate-100">{presc.patientId?.fullName || 'مريض غير معروف'}</h3>
                            {/* ✅ عرض الرقم القومي لتمييز المرضى المتشابهين */}
                            {presc.patientId?.nationalId && (
                              <span className="text-xs text-gray-400 dark:text-slate-500 font-mono" dir="ltr">{presc.patientId.nationalId}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const isDispensed = presc.status === 'dispensed' || presc.status === 'Dispensed'
                              return (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${
                                  isDispensed
                                    ? 'bg-green-100 text-green-700 border-green-300'
                                    : 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                }`}>
                                  {isDispensed
                                    ? <><CheckCircle size={12} strokeWidth={2.5} /> صُرفت</>
                                    : <><Clock size={12} strokeWidth={2.5} /> بانتظار الصرف</>}
                                </span>
                              )
                            })()}
                            <span className="text-xs text-muted-foreground">{new Date(presc.createdAt).toLocaleDateString('ar-EG')}</span>
                          </div>
                        </div>
                        <p className="text-sm mb-1"><strong>الدواء:</strong> {presc.medication}</p>
                        <p className="text-sm text-muted-foreground">
                          <strong>الجرعة:</strong> {presc.dose} &nbsp;|&nbsp; <strong>المدة:</strong> {presc.duration}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={FileText} 
                    title="لا توجد روشتات حالياً" 
                    description="لم تقم بإضافة أي روشتة طبية لأي مريض حتى الآن." 
                    actionLabel="إضافة روشتة"
                    onAction={() => setIsAddPrescriptionOpen(true)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ SCHEDULE SETTINGS ════════ */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات المواعيد وجدول العمل</CardTitle>
                <CardDescription>اضبط الأيام والأوقات التي تستقبل فيها المرضى</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateSchedule} className="space-y-6">
                  {/* Working Days */}
                  <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-3 block">أيام العمل</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'Saturday', label: 'السبت' },
                        { value: 'Sunday', label: 'الأحد' },
                        { value: 'Monday', label: 'الإثنين' },
                        { value: 'Tuesday', label: 'الثلاثاء' },
                        { value: 'Wednesday', label: 'الأربعاء' },
                        { value: 'Thursday', label: 'الخميس' },
                        { value: 'Friday', label: 'الجمعة' }
                      ].map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleWorkingDay(day.value)}
                          className={`px-4 py-2 text-sm rounded-xl font-semibold transition-all ${
                            scheduleForm.workingDays.includes(day.value)
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Working Hours & Slot Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300">بداية الدوام</label>
                      <input
                        type="time"
                        required
                        placeholder="09:00 AM"
                        value={scheduleForm.start}
                        onChange={e => setScheduleForm(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300">نهاية الدوام</label>
                      <input
                        type="time"
                        required
                        placeholder="05:00 PM"
                        value={scheduleForm.end}
                        onChange={e => setScheduleForm(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-slate-300">مدة الكشف (بالدقائق)</label>
                      <input 
                        type="number" 
                        min="5" 
                        max="120" 
                        required
                        value={scheduleForm.slotDuration}
                        onChange={e => setScheduleForm(prev => ({ ...prev, slotDuration: e.target.value }))}
                        className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                    <Button type="submit" disabled={savingSchedule} className="px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2">
                      {savingSchedule ? <Spinner className="w-4 h-4" /> : <CheckCircle size={16} />}
                      حفظ التعديلات
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Modals ── */}
      <AddPatientModal
        isOpen={isAddPatientOpen}
        onClose={() => { setIsAddPatientOpen(false); fetchData() }}
      />
      <AddPrescriptionModal
        isOpen={isAddPrescriptionOpen}
        onClose={() => setIsAddPrescriptionOpen(false)}
        onSuccess={fetchData}
      />
      {/* ✅ AddVisitModal — إضافة تشخيص */}
      <AddVisitModal
        isOpen={isAddVisitOpen}
        onClose={() => { setIsAddVisitOpen(false); setAddVisitPatient(null) }}
        patient={addVisitPatient}
        onSuccess={fetchData}
      />
      <PatientAccessModal
        isOpen={isAccessModalOpen}
        onClose={() => { setIsAccessModalOpen(false); setSelectedPatient(null) }}
        patient={selectedPatient}
      />
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => { setIsAiModalOpen(false); setAiPatient(null) }}
        patientId={aiPatient?._id}
        patientName={aiPatient?.fullName}
      />
      <ExamModeModal
        isOpen={isExamModalOpen}
        onClose={() => { setIsExamModalOpen(false); setActiveAppointment(null) }}
        appointment={activeAppointment}
        onSuccess={fetchData}
      />
    </div>
  )
}
