import { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import {
  TestTubes, FileText, CheckCircle, Calendar,
  Search, Upload, Eye, AlertCircle, Loader2, X, Plus, Edit, UserPlus
} from 'lucide-react'
import api from '@/services/api.js'
import { Spinner } from '@/components/ui/spinner.jsx'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext.jsx'
import ViewIdModal from '@/components/modals/ViewIdModal.jsx'
import EmptyState from '@/components/ui/EmptyState.jsx'
import LabCharts from '@/components/lab/LabCharts.jsx'
import { usePageTitle } from '@/hooks/usePageTitle.js'

/* ─── Status badge helper ──────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    pending_sample: { label: 'في انتظار السحب', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    pending_result: { label: 'في انتظار النتيجة', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    completed: { label: 'مكتمل', cls: 'bg-green-50  text-green-700  border-green-200' },
  }
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${s.cls}`}>{s.label}</span>
  )
}

/* ─── Edit Result Form (inline, per-row) ─────────────── */
function EditResultForm({ item, onSuccess, onCancel }) {
  const [resultText, setResultText] = useState(item.result || '')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const handleSubmit = async () => {
    if (!resultText.trim()) {
      toast.error('يرجى كتابة ملخص النتيجة')
      return
    }
    try {
      setLoading(true)
      const form = new FormData()
      form.append('status', 'completed')
      form.append('result', resultText)
      if (files && files.length > 0) {
        files.forEach(f => form.append('labFiles', f))
      }

      await api.put(`/labs/${item._id}/status`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('تم تعديل النتيجة بنجاح')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر تعديل النتيجة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2 bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
      <Input
        placeholder="ملخص النتيجة / التقرير..."
        value={resultText}
        onChange={e => setResultText(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5 font-bold bg-white dark:bg-slate-900"
        >
          <Upload className="w-3.5 h-3.5" />
          {files.length > 0 ? `تم اختيار ${files.length} ملف` : 'رفع ملفات (اختياري)'}
        </button>
        {files.length > 0 && (
          <button onClick={() => setFiles([])} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={e => setFiles(Array.from(e.target.files))}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          حفظ التعديلات
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="h-8 text-xs"
        >
          إلغاء
        </Button>
      </div>
    </div>
  )
}

/* ─── Upload Result form (inline, per-row) ─────────────── */
function UploadResultForm({ item, onSuccess }) {
  const [resultText, setResultText] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const handleSubmit = async () => {
    if (!resultText.trim()) {
      toast.error('يرجى كتابة ملخص النتيجة')
      return
    }
    try {
      setLoading(true)
      const form = new FormData()
      form.append('status', 'completed')
      form.append('result', resultText)
      if (files && files.length > 0) {
        files.forEach(f => form.append('labFiles', f))
      }

      await api.put(`/labs/${item._id}/status`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('تم رفع النتيجة بنجاح')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر رفع النتيجة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-2">
      <Input
        placeholder="ملخص النتيجة / التقرير..."
        value={resultText}
        onChange={e => setResultText(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5 font-bold"
        >
          <Upload className="w-3.5 h-3.5" />
          {files.length > 0 ? `تم اختيار ${files.length} ملف` : 'رفع ملفات'}
        </button>
        {files.length > 0 && (
          <button onClick={() => setFiles([])} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="hidden"
          onChange={e => setFiles(Array.from(e.target.files))}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-8 text-xs font-bold bg-green-600 hover:bg-green-700 text-white gap-1.5"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          تم / مكتمل
        </Button>
      </div>
    </div>
  )
}

/* ─── Lab Request Card ─────────────────────────────────── */
function LabCard({ item, tab, onRefresh }) {
  const [expanding, setExpanding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const patientName = item.patientId?.fullName || 'مريض غير معروف'
  const referrer = item.referredBy?.fullName || item.referredBy?.name || '—'

  const moveToNextStage = async (nextStatus) => {
    try {
      setExpanding(true)
      await api.put(`/labs/${item._id}/status`, { status: nextStatus })
      toast.success(nextStatus === 'pending_result' ? 'تم تسجيل سحب العينة ✅' : 'تم التحديث')
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر تحديث الحالة')
    } finally {
      setExpanding(false)
    }
  }

  const handleViewSecureDocument = async (e, url) => {
    e.preventDefault()
    if (!url) return
    if (!url.includes('cloudinary.com')) {
      window.open(url, '_blank')
      return
    }
    try {
      const toastId = toast.loading('جاري تجهيز الملف الآمن...')
      const { data } = await api.get(`/images/secure?url=${encodeURIComponent(url)}`)
      toast.success('تم التجهيز', { id: toastId })
      window.open(data.url, '_blank')
    } catch (err) {
      toast.error('تعذر فتح المستند', { id: 'secure-doc' })
    }
  }

  return (
    <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 hover:shadow-sm transition-shadow bg-white dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 dark:text-slate-100">{patientName}</span>
            {item.patientId?.nationalId && (
              <span className="text-[11px] text-gray-400 dark:text-slate-500 font-mono">{item.patientId.nationalId}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">{item.testName}</p>
          {referrer !== '—' && (
            <p className="text-xs text-gray-400 dark:text-slate-500">بإحالة من: <span className="text-gray-600 dark:text-slate-300 font-medium">{referrer}</span></p>
          )}
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{new Date(item.createdAt).toLocaleDateString('ar-EG')}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {/* Actions */}
      {tab === 'new' && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <Button
            size="sm"
            disabled={expanding}
            onClick={() => moveToNextStage('pending_result')}
            className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            {expanding ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTubes className="w-3 h-3" />}
            تم سحب العينة
          </Button>
        </div>
      )}

      {tab === 'pending' && (
        <UploadResultForm item={item} onSuccess={onRefresh} />
      )}

      {tab === 'completed' && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <div className="flex flex-col gap-2 mb-3">
            {item.result && (
              <span className="text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border border-gray-100 dark:border-slate-700"><strong>النتيجة:</strong> {item.result}</span>
            )}
            {/* Handle multiple files or fallback to single */}
            <div className="flex flex-wrap gap-2 mt-1">
              {(item.labFiles?.length > 0 ? item.labFiles : [item.labFile, item.filePath].filter(Boolean)).map((url, i) => (
                <a
                  key={i}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    // trigger an event to open modal, we will handle this via a prop later, or use document event
                    document.dispatchEvent(new CustomEvent('open-doc-modal', { detail: url }));
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 font-bold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> عرض المرفق {i > 0 ? i + 1 : ''}
                </a>
              ))}
            </div>
          </div>
          {!isEditing ? (
            <Button size="sm" variant="outline" className="h-7 text-xs w-full gap-1" onClick={() => setIsEditing(true)}>
              <Edit className="w-3 h-3" /> تعديل النتيجة
            </Button>
          ) : (
            <EditResultForm item={item} onSuccess={() => { setIsEditing(false); onRefresh(); }} onCancel={() => setIsEditing(false)} />
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   LabPage — Main Component
═══════════════════════════════════════════════════════ */
export default function LabPage() {
  usePageTitle('لوحة المعمل')
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('new')
  const [allResults, setAllResults] = useState([])
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAppts, setIsLoadingAppts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth() // Need to import useAuth or get user from context if we need to check profile. Wait, LabPage doesn't import useAuth. Let's add it.

  // Modals state
  const [docModal, setDocModal] = useState({ isOpen: false, url: '' })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editAppointmentItem, setEditAppointmentItem] = useState(null)

  // ── Fetch all lab requests assigned to THIS lab ──────
  const fetchLabResults = async () => {
    try {
      setIsLoading(true)
      const { data } = await api.get('/labs')
      setAllResults(data.data || [])
    } catch (err) {
      toast.error('تعذر تحميل طلبات التحاليل')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Fetch appointments for the Visits tab ────────────
  const fetchAppointments = async () => {
    try {
      setIsLoadingAppts(true)
      const res = await api.get('/appointments')
      setAppointments(res.data.data || [])
    } catch (err) {
      toast.error('تعذر تحميل المواعيد')
    } finally {
      setIsLoadingAppts(false)
    }
  }

  useEffect(() => {
    fetchLabResults()
  }, [location.pathname])

  useEffect(() => {
    if (activeTab === 'visits') fetchAppointments()
  }, [activeTab])

  useEffect(() => {
    const handleOpenDoc = (e) => {
      let url = e.detail;
      if (url) {
        if (!url.includes('cloudinary.com') && !url.includes('/uploads/')) {
           window.open(url, '_blank');
           return;
        }
        setDocModal({ isOpen: true, url });
      }
    };
    document.addEventListener('open-doc-modal', handleOpenDoc);
    return () => document.removeEventListener('open-doc-modal', handleOpenDoc);
  }, []);

  // ── Filtered by status + search ──────────────────────
  const filter = (status) => {
    return allResults.filter(r => {
      if (r.status !== status) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        r.patientId?.fullName?.toLowerCase().includes(q) ||
        r.patientId?.nationalId?.toString().includes(q) ||
        r.testName?.toLowerCase().includes(q)
      )
    })
  }

  const newRequests = filter('pending_sample')
  const pendingResult = filter('pending_result')
  const completed = filter('completed')

  // ── Update appointment status ────────────────────────
  const handleUpdateApptStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status })
      toast.success('تم تحديث حالة الموعد')
      fetchAppointments()
      fetchLabResults() // refresh lab results to show any auto-generated requests
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر التحديث')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* Banner for incomplete profile */}
        {user && (!user.address || !user.workingDays || user.workingDays.length === 0) && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">الملف الشخصي غير مكتمل</p>
                <p className="text-xs mt-0.5">يرجى إكمال بيانات العنوان ومواعيد العمل لتظهر للعملاء.</p>
              </div>
            </div>
            <Link to="/profile">
              <Button size="sm" variant="outline" className="bg-white dark:bg-slate-900 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30">تحديث الملف</Button>
            </Link>
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-6 sm:mb-8 flex justify-between items-start md:items-center flex-col md:flex-row gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 text-foreground">إدارة المختبر</h1>
            <p className="text-muted-foreground text-sm">إدارة طلبات التحاليل والعينات وتسليم النتائج</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold">
            <Plus className="w-4 h-4" /> إنشاء طلب جديد
          </Button>
        </div>

        {/* ── Search Bar ── */}
        <div className="mb-6 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <Input
            placeholder="ابحث باسم المريض أو الرقم القومي أو نوع الفحص..."
            className="pr-10 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card 
            className={`bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 ${activeTab === 'new' ? 'ring-2 ring-orange-500' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <TestTubes className="h-6 w-6 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">{allResults.filter(r => r.status === 'pending_sample').length}</div>
                <p className="text-sm text-muted-foreground">طلبات جديدة</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 ${activeTab === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{allResults.filter(r => r.status === 'pending_result').length}</div>
                <p className="text-sm text-muted-foreground">نتائج معلقة</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 ${activeTab === 'completed' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{allResults.filter(r => r.status === 'completed').length}</div>
                <p className="text-sm text-muted-foreground">نتائج مكتملة</p>
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 ${activeTab === 'visits' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveTab('visits')}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{appointments.length}</div>
                <p className="text-sm text-muted-foreground">الزيارات المجدولة</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Chart ── */}
        <LabCharts results={allResults} />

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="new" className="flex items-center gap-2 text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4" />
              <span className="hidden sm:inline">الطلبات الجديدة</span>
              {newRequests.length > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{newRequests.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">النتائج المعلقة</span>
              {pendingResult.length > 0 && (
                <span className="bg-yellow-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingResult.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">النتائج المكتملة</span>
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex items-center gap-2 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">الزيارات</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: الطلبات الجديدة */}
          <TabsContent value="new">
            <Card>
              <CardHeader>
                <CardTitle>الطلبات الجديدة</CardTitle>
                <CardDescription>طلبات تحاليل مُحالة من أطباء أو مستشفيات — في انتظار سحب العينة</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : newRequests.length > 0 ? (
                  <div className="space-y-4">
                    {newRequests.map(item => (
                      <LabCard key={item._id} item={item} tab="new" onRefresh={fetchLabResults} />
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={TestTubes} 
                    title="لا توجد طلبات جديدة حالياً" 
                    description="لا توجد أي طلبات تحاليل بانتظار سحب العينة." 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: النتائج المعلقة */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>النتائج المعلقة</CardTitle>
                <CardDescription>العينات تم سحبها — في انتظار رفع نتيجة التحليل</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : pendingResult.length > 0 ? (
                  <div className="space-y-4">
                    {pendingResult.map(item => (
                      <LabCard key={item._id} item={item} tab="pending" onRefresh={fetchLabResults} />
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={FileText} 
                    title="لا توجد نتائج معلقة حالياً" 
                    description="لم يتم العثور على عينات بانتظار إدخال نتائجها." 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: النتائج المكتملة */}
          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>النتائج المكتملة</CardTitle>
                <CardDescription>تحاليل تم رفع نتائجها وإرسالها للمرضى والأطباء</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : completed.length > 0 ? (
                  <div className="space-y-4">
                    {completed.map(item => (
                      <LabCard key={item._id} item={item} tab="completed" onRefresh={fetchLabResults} />
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={CheckCircle} 
                    title="لا توجد نتائج مكتملة بعد" 
                    description="لم تقم بإكمال أي تقارير تحاليل حتى الآن." 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: الزيارات */}
          <TabsContent value="visits">
            <Card>
              <CardHeader>
                <CardTitle>زيارات المرضى المجدولة</CardTitle>
                <CardDescription>مواعيد المرضى القادمين لسحب العينات</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAppts ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt._id} className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-slate-100">{apt.patientId?.fullName || 'غير معروف'}</h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">تاريخ: {apt.date ? new Date(apt.date).toLocaleDateString('en-CA').replace(/-/g, '/') : '—'}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">الوقت: {apt.time || '—'}</p>
                          <p className="text-xs text-blue-600 mt-1 font-bold">{apt.type || 'فحص معملي'}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {(() => {
                            const s = (apt.status || '').toLowerCase()
                            const badgeCls =
                              s === 'confirmed' ? 'bg-green-50 text-green-700 border-green-300' :
                              s === 'cancelled' ? 'bg-red-50 text-red-700 border-red-300' :
                              s === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                              'bg-yellow-50 text-yellow-700 border-yellow-300'
                            const badgeIcon =
                              s === 'confirmed' ? <CheckCircle size={12} strokeWidth={2.5} /> :
                              s === 'cancelled' ? <X size={12} strokeWidth={2.5} /> :
                              s === 'completed' ? <CheckCircle size={12} strokeWidth={2.5} /> :
                              <AlertCircle size={12} strokeWidth={2.5} />
                            const badgeLabel =
                              s === 'pending' ? 'قيد الانتظار' :
                              s === 'confirmed' ? 'مؤكد' :
                              s === 'cancelled' ? 'ملغي' :
                              s === 'completed' ? 'مكتمل' :
                              apt.status || 'قيد الانتظار'
                            return <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 ${badgeCls}`}>{badgeIcon}{badgeLabel}</span>
                          })()}
                          {(apt.status === 'Pending' || apt.status === 'pending') && (
                            <div className="flex gap-2">
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                onClick={() => handleUpdateApptStatus(apt._id, 'Confirmed')}>تأكيد</Button>
                              <Button size="sm" variant="destructive" className="h-7 text-xs"
                                onClick={() => handleUpdateApptStatus(apt._id, 'Cancelled')}>إلغاء</Button>
                            </div>
                          )}
                          {(apt.status === 'Confirmed' || apt.status === 'confirmed') && (
                            <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleUpdateApptStatus(apt._id, 'Completed')}>إتمام السحب</Button>
                          )}
                          {(apt.status === 'Pending' || apt.status === 'pending') && (
                            <Button size="sm" variant="outline" className="h-7 text-xs w-full gap-1 mt-1"
                              onClick={() => setEditAppointmentItem(apt)}>
                              <Edit className="w-3 h-3" /> تعديل الموعد
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Calendar} 
                    title="لا توجد مواعيد مجدولة حالياً" 
                    description="لا يوجد أي مرضى مسجلين لزيارة المختبر في الوقت الحالي." 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Create Request Modal ── */}
      {isCreateModalOpen && (
        <CreateRequestModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            fetchLabResults()
          }}
        />
      )}

      {/* ── Edit Appointment Modal ── */}
      {editAppointmentItem && (
        <EditAppointmentModal
          appointment={editAppointmentItem}
          onClose={() => setEditAppointmentItem(null)}
          onSuccess={() => {
            setEditAppointmentItem(null)
            fetchAppointments()
          }}
        />
      )}

      {/* ── View Document Modal ── */}
      <ViewIdModal 
        isOpen={docModal.isOpen} 
        onClose={() => setDocModal({ isOpen: false, url: '' })} 
        documentPath={docModal.url} 
      />

    </div>
  )
}

/* ─── Create Request Modal Component ────────────────────── */
function CreateRequestModal({ onClose, onSuccess }) {
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [testName, setTestName] = useState('')
  const [date, setDate] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSearchPatient = async () => {
    if (!patientSearch.trim()) return
    setIsSearching(true)
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(patientSearch)}`)
      setPatients(res.data.data || [])
      if (res.data.data?.length === 0) toast.error('لم يتم العثور على مريض')
    } catch (err) {
      toast.error('حدث خطأ أثناء البحث')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedPatient) return toast.error('يرجى اختيار مريض')
    if (!testName.trim()) return toast.error('يرجى كتابة اسم التحليل')
    setIsSubmitting(true)
    try {
      await api.post('/labs', {
        patientId: selectedPatient._id,
        testName,
        date: date || new Date().toISOString()
      })
      toast.success('تم إنشاء طلب التحليل بنجاح')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إنشاء الطلب')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-md overflow-hidden" dir="rtl">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            إنشاء طلب تحليل جديد
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {!selectedPatient ? (
            <>
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-slate-200">ابحث عن المريض (بالرقم القومي أو الاسم)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="رقم قومي..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchPatient()}
                  />
                  <Button onClick={handleSearchPatient} disabled={isSearching}>
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {patients.length > 0 && (
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                  {patients.map(p => (
                    <div key={p._id} className="p-3 border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800 flex justify-between items-center cursor-pointer" onClick={() => setSelectedPatient(p)}>
                      <div>
                        <div className="font-bold text-sm text-gray-900 dark:text-slate-100">{p.fullName}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{p.nationalId}</div>
                      </div>
                      <Button size="sm" variant="secondary" className="h-7 text-xs">اختيار</Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-3 rounded-lg flex justify-between items-center">
              <div>
                <div className="text-xs text-blue-500 font-bold mb-1">المريض المختار</div>
                <div className="font-bold text-blue-900 dark:text-blue-300">{selectedPatient.fullName}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedPatient(null)} className="h-7 text-xs text-blue-600">تغيير</Button>
            </div>
          )}

          {selectedPatient && (
            <>
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-slate-200">اسم التحليل المطلوب</label>
                <Input
                  placeholder="مثال: CBC, Lipid Profile..."
                  value={testName}
                  onChange={e => setTestName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-slate-200">تاريخ الطلب</label>
                <Input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2 bg-gray-50 dark:bg-slate-800">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!selectedPatient || !testName || isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            إنشاء الطلب
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Edit Appointment Modal Component ──────────────────── */
function EditAppointmentModal({ appointment, onClose, onSuccess }) {
  const [date, setDate] = useState(appointment.date ? appointment.date.split('T')[0] : '')
  const [time, setTime] = useState(appointment.time || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await api.put(`/appointments/${appointment._id}`, { date, time })
      toast.success('تم تعديل الموعد بنجاح')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر تعديل الموعد')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg w-full max-w-sm overflow-hidden" dir="rtl">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            تعديل الموعد
          </h3>
          <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700 mb-2">
            <div className="font-bold text-sm mb-1 text-gray-900 dark:text-slate-100">{appointment.patientId?.fullName}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">{appointment.type || 'سحب عينة'}</div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-slate-200">التاريخ الجديد</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-gray-800 dark:text-slate-200">الوقت الجديد</label>
            <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-2 bg-gray-50 dark:bg-slate-800">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !date || !time} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            حفظ التعديل
          </Button>
        </div>
      </div>
    </div>
  )
}
