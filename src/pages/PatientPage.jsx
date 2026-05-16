import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import {
  Calendar, FileText, Pill, TestTubes, Plus, Upload, Brain, CloudUpload, X,
  Image as ImageIcon, AlertTriangle, ShieldCheck, ShieldAlert, CheckCircle2,
  Bell, Search, Heart, Droplets, Activity, Trash2, Ban, Clock, UserCheck, QrCode, Download, Share2, ExternalLink,
  Store, MapPin, Phone
} from 'lucide-react'
import api from '@/services/api.js'
import { Spinner } from '@/components/ui/spinner.jsx'
import BookAppointmentModal from '@/components/modals/BookAppointmentModal.jsx'
import AiAnalysisModal from '@/components/modals/AiAnalysisModal.jsx'
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input.jsx'
import Notifications from '@/components/Notifications.jsx'
import MedicalTimeline from '@/components/patient/MedicalTimeline.jsx'
import DataCharts from '@/components/patient/DataCharts.jsx'
import EmptyState from '@/components/ui/EmptyState.jsx'
import { usePageTitle } from '@/hooks/usePageTitle.js'

const statusLabels = {
  Pending: 'قيد الانتظار', Confirmed: 'مؤكد', 'In-Progress': 'قيد التنفيذ',
  Completed: 'مكتمل', Cancelled: 'ملغى', 'Follow-up': 'متابعة'
}
const statusColors = {
  Confirmed: 'bg-green-100 text-green-800 border-green-200',
  Completed: 'bg-blue-100 text-blue-800 border-blue-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
  'In-Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Follow-up': 'bg-purple-100 text-purple-800 border-purple-200',
  Pending: 'bg-gray-100 text-gray-700 border-gray-200'
}

export default function PatientPage() {
  usePageTitle('لوحة المريض')
  const { user, refreshUserData } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('timeline')
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [qrToken, setQrToken] = useState(null)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)
  const notifRef = useRef(null)
  const qrRef = useRef(null)
  const [docModal, setDocModal] = useState({ isOpen: false, url: '', isPdf: false })
  const [prefilledAppointment, setPrefilledAppointment] = useState(null)

  // Single shared ConfirmDialog state — replaces native window.confirm() calls
  // for delete actions so the UX matches the rest of the app (admin uses the
  // same dialog) and is accessible / focus-trapped / keyboard-friendly.
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'حذف',
    onConfirm: null,
  })
  const askConfirm = (opts) =>
    setConfirmState({
      isOpen: true,
      confirmLabel: 'حذف',
      ...opts,
    })
  const closeConfirm = () => setConfirmState((s) => ({ ...s, isOpen: false }))

  const [appointments, setAppointments] = useState([])
  const [medicalRecords, setMedicalRecords] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [labResults, setLabResults] = useState([])
  const [radiologyResults, setRadiologyResults] = useState([])
  const [dbNotifications, setDbNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Self-report AI state
  const [selfReport, setSelfReport] = useState({ diagnosis: '', notes: '', visitDate: '' })
  const [selfFile, setSelfFile] = useState(null)
  const [submittingSelf, setSubmittingSelf] = useState(false)
  const [isFormatting, setIsFormatting] = useState(false)
  const [aiProcessedState, setAiProcessedState] = useState(null)
  const fileInputRef = useRef()

  // Medication state
  const [selfMed, setSelfMed] = useState({ medication: '', dose: '', duration: '', isChronic: false })
  const [editingMed, setEditingMed] = useState(null)
  const [isCheckingDrug, setIsCheckingDrug] = useState(false)
  const [drugCheckResult, setDrugCheckResult] = useState(null)
  const [submittingMed, setSubmittingMed] = useState(false)
  const [isCheckingAllDrugs, setIsCheckingAllDrugs] = useState(false)
  const [allDrugsCheckResult, setAllDrugsCheckResult] = useState(null)

  // Lab Upload state
  const [labUpload, setLabUpload] = useState({ testName: '' })
  const [labFile, setLabFile] = useState(null)
  const [submittingLab, setSubmittingLab] = useState(false)
  const labInputRef = useRef()

  // Radiology Upload state
  const [radUpload, setRadUpload] = useState({ scanType: '' })
  const [radFile, setRadFile] = useState(null)
  const [submittingRad, setSubmittingRad] = useState(false)
  const radInputRef = useRef()

  // Editing state
  const [editingRecord, setEditingRecord] = useState(null)
  const [editingLab, setEditingLab] = useState(null)
  const [editingRad, setEditingRad] = useState(null)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // New States for Pharmacy
  const [showPharmacyModal, setShowPharmacyModal] = useState(false)
  const [selectedPrescriptionForPharmacy, setSelectedPrescriptionForPharmacy] = useState(null)
  const [pharmaciesList, setPharmaciesList] = useState([])
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(false)
  const [requestingPharmacyFor, setRequestingPharmacyFor] = useState(null)

  // ============== Helpers ==============

  const handleViewSecureDocument = async (e, url) => {
    e.preventDefault()
    if (!url) return
    let finalUrl = url;
    if (url.includes('cloudinary.com')) {
      try {
        const toastId = toast.loading('جاري تجهيز الملف الآمن...')
        const { data } = await api.get(`/images/secure?url=${encodeURIComponent(url)}`)
        toast.dismiss(toastId)
        finalUrl = data.url;
      } catch { return toast.error('تعذر فتح المستند') }
    }
    const isPdf = finalUrl.toLowerCase().includes('.pdf') || url.toLowerCase().includes('.pdf');
    setDocModal({ isOpen: true, url: finalUrl, isPdf });
  }

  // useCallback so the dependency arrays of effects can list `fetchData`
  // explicitly (closes the previously-suppressed exhaustive-deps warning).
  const fetchData = useCallback(async () => {
    if (!user?.id) return
    try {
      setIsLoading(true)
      const [appRes, recRes, presRes, labRes, radRes, notifsRes] = await Promise.all([
        api.get('/appointments'),
        api.get(`/records/patient/${user.id}`),
        api.get(`/prescriptions/${user.id}`),
        api.get('/labs'),
        api.get('/radiology'),
        api.get('/notifications'),
      ])
      setAppointments(appRes.data.data || [])
      setMedicalRecords(recRes.data.data || [])
      setPrescriptions(presRes.data.data || [])
      setLabResults(labRes.data.data || [])
      setRadiologyResults(radRes.data.data || [])
      setDbNotifications(notifsRes.data.data || [])
    } catch (err) {
      console.error('Error fetching:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    refreshUserData().catch(console.error)
  }, [refreshUserData])

  useEffect(() => {
    fetchData()
  }, [fetchData, location.pathname])

  // Profile completeness check
  const profileWarnings = useMemo(() => {
    const w = []
    if (!user?.bloodType || user.bloodType === 'unknown') w.push('فصيلة الدم')
    if (!user?.allergies?.length) w.push('الحساسيات')
    if (!user?.chronicDiseases?.length) w.push('الأمراض المزمنة')
    if (!user?.dateOfBirth) w.push('تاريخ الميلاد')
    return w
  }, [user])

  const upcomingAppointments = useMemo(() =>
    appointments.filter(a => ['Pending', 'Confirmed'].includes(a.status) && new Date(a.date) >= new Date()),
    [appointments])

  // Build smart notifications from existing data
  const notifications = useMemo(() => {
    const notifs = []
    const now = new Date()

    // 1. Upcoming appointments
    upcomingAppointments.forEach(apt => {
      const d = new Date(apt.date)
      const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
      const providerName = apt.doctorId ? `د. ${apt.doctorId.fullName}` : apt.organizationId?.name || 'الجهة'
      if (diffDays <= 0) {
        notifs.push({ id: `apt-today-${apt._id}`, icon: Calendar, color: 'text-red-500 bg-red-50', text: `موعدك مع ${providerName} اليوم!`, action: () => setActiveTab('appointments') })
      } else if (diffDays <= 3) {
        notifs.push({ id: `apt-soon-${apt._id}`, icon: Clock, color: 'text-orange-500 bg-orange-50', text: `موعدك مع ${providerName} بعد ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`, action: () => setActiveTab('appointments') })
      } else {
        notifs.push({ id: `apt-${apt._id}`, icon: Calendar, color: 'text-blue-500 bg-blue-50', text: `لديك موعد مع ${providerName} بتاريخ ${d.toLocaleDateString('ar-EG')}`, action: () => setActiveTab('appointments') })
      }
    })

    // 2. Profile incomplete
    if (profileWarnings.length > 0) {
      notifs.push({ id: 'profile-warn', icon: UserCheck, color: 'text-amber-500 bg-amber-50', text: `ملفك الطبي ناقص: ${profileWarnings.join('، ')}. أكمله الآن!`, action: () => window.location.href = '/profile' })
    }

    // 3. Recent lab results (last 7 days)
    labResults.filter(l => l.status === 'completed' && (now - new Date(l.createdAt)) < 7 * 24 * 60 * 60 * 1000).forEach(lab => {
      notifs.push({
        id: `lab-${lab._id}`, icon: TestTubes, color: 'text-emerald-600 bg-emerald-50',
        text: `نتيجة مختبر جديدة: ${lab.testName}`, action: () => setActiveTab('labs')
      })
    })

    // 4. DB Notifications (OTPs, dispense, etc) — only unread, dismissible
    dbNotifications.forEach(n => {
      if (!n.isRead) {
        notifs.push({
          id: n._id,
          isDb: true, // makes the row dismissible in the dropdown UI
          icon: n.type === 'otp' ? ShieldCheck : Bell,
          color: n.type === 'otp' ? 'text-indigo-600 bg-indigo-50 border border-indigo-200' : 'text-blue-600 bg-blue-50',
          text: n.message,
          // Mark just THIS one as read (was previously marking every unread
          // notification as read on any click — too aggressive).
          action: () => {
            api.patch(`/notifications/${n._id}/read`).then(() => fetchData())
          },
        })
      }
    })

    return notifs
  }, [upcomingAppointments, profileWarnings, labResults, dbNotifications])

  // SEARCH FILTERING logic
  const filteredRecords = useMemo(() => {
    if (!globalSearch) return medicalRecords;
    const q = globalSearch.toLowerCase()
    return medicalRecords.filter(r => r.diagnosis?.toLowerCase().includes(q) || r.notes?.toLowerCase().includes(q))
  }, [medicalRecords, globalSearch])

  const filteredPrescriptions = useMemo(() => {
    if (!globalSearch) return prescriptions;
    const q = globalSearch.toLowerCase()
    return prescriptions.filter(p => p.medication?.toLowerCase().includes(q) || p.dose?.toLowerCase().includes(q))
  }, [prescriptions, globalSearch])

  const filteredLabs = useMemo(() => {
    if (!globalSearch) return labResults;
    const q = globalSearch.toLowerCase()
    return labResults.filter(l => l.testName?.toLowerCase().includes(q) || l.result?.toLowerCase().includes(q))
  }, [labResults, globalSearch])

  const filteredRadiology = useMemo(() => {
    if (!globalSearch) return radiologyResults;
    const q = globalSearch.toLowerCase()
    return radiologyResults.filter(r => r.scanType?.toLowerCase().includes(q) || r.notes?.toLowerCase().includes(q))
  }, [radiologyResults, globalSearch])

  // EXTRACED REQUESTS
  const requestedLabsList = useMemo(() => {
    const list = [];
    medicalRecords.forEach(rec => {
      (rec.requestedLabs || []).forEach(lab => list.push({ name: lab, recordId: rec._id, doctor: rec.doctorId?.fullName, date: rec.visitDate || rec.createdAt }))
    });
    return list;
  }, [medicalRecords]);

  const requestedRadList = useMemo(() => {
    const list = [];
    medicalRecords.forEach(rec => {
      (rec.requestedRadiology || []).forEach(rad => list.push({ name: rad, recordId: rec._id, doctor: rec.doctorId?.fullName, date: rec.visitDate || rec.createdAt }))
    });
    return list;
  }, [medicalRecords]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ============== Actions ==============

  const handleCancelAppointment = async (id) => {
    try {
      setCancellingId(id)
      await api.patch(`/appointments/${id}/status`, { status: 'Cancelled' })
      toast.success('تم إلغاء الموعد بنجاح')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إلغاء الموعد')
    } finally { setCancellingId(null) }
  }

  const handleFormatAi = async () => {
    if (!selfReport.diagnosis.trim()) return toast.error('يرجى كتابة الشكوى أولاً')
    try {
      setIsFormatting(true)
      const { data } = await api.post('/ai/format-record', { rawText: selfReport.diagnosis })
      if (data.success) {
        setSelfReport(prev => ({ ...prev, diagnosis: data.data.structuredText }))
        setAiProcessedState(data.data)
        toast.success("تم تنقيح الصياغة بنجاح")
      }
    } catch (err) { toast.error(err.response?.data?.message || "فشل الاتصال بالذكاء الاصطناعي") }
    finally { setIsFormatting(false) }
  }

  const handleSelfReportSubmit = async (e) => {
    e.preventDefault()
    if (!selfReport.diagnosis.trim()) return toast.error('يرجى كتابة وصف أو تشخيص')
    try {
      setSubmittingSelf(true)
      const formData = new FormData()
      formData.append('diagnosis', selfReport.diagnosis)
      formData.append('notes', selfReport.notes)
      if (selfReport.visitDate) formData.append('visitDate', selfReport.visitDate)
      if (selfFile) formData.append('file', selfFile)
      if (aiProcessedState) formData.append('aiProcessed', JSON.stringify(aiProcessedState))
      await api.post('/records/self-report', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('تم رفع سجلك الطبي بنجاح')
      setSelfReport({ diagnosis: '', notes: '', visitDate: '' })
      setAiProcessedState(null); setSelfFile(null)
      fetchData(); setActiveTab('records')
    } catch (err) { toast.error(err.response?.data?.message || 'تعذر رفع السجل') }
    finally { setSubmittingSelf(false) }
  }

  const handleCheckDrug = async () => {
    if (!selfMed.medication.trim()) return toast.error('يرجى كتابة اسم الدواء')
    try {
      setIsCheckingDrug(true)
      const currentDrugs = prescriptions.map(p => p.medication)
      const allergies = user?.allergies || []
      const { data } = await api.post('/ai/check-interactions', { newDrug: selfMed.medication, currentDrugs, allergies })
      setDrugCheckResult(data.data)
    } catch (err) { toast.error(err.response?.data?.message || "فشل الفحص") }
    finally { setIsCheckingDrug(false) }
  }

  const handleCheckAllDrugs = async () => {
    if (prescriptions.length < 2) return toast.info("تحتاج إلى دوائين على الأقل لفحص التعارض بينهما");
    try {
      setIsCheckingAllDrugs(true);
      const currentDrugs = prescriptions.map(p => p.medication);
      const allergies = user?.allergies || [];
      const { data } = await api.post('/ai/check-interactions', { newDrug: '', currentDrugs, allergies });
      setAllDrugsCheckResult(data.data);
    } catch (err) { toast.error("فشل الفحص"); }
    finally { setIsCheckingAllDrugs(false); }
  }

  const handleSaveMed = async (e) => {
    e.preventDefault()
    if (!selfMed.medication.trim()) return toast.error("اسم الدواء مطلوب")
    if (!drugCheckResult) return toast.error("يجب فحص التعارض الدوائي أولاً")
    if (!selfMed.dose.trim() || !selfMed.duration.trim()) return toast.error("الجرعة والمدة مطلوبان لحفظ الدواء")
    try {
      setSubmittingMed(true)
      await api.post('/prescriptions', selfMed)
      toast.success("تم إضافة الدواء")
      setSelfMed({ medication: '', dose: '', duration: '', isChronic: false }); setDrugCheckResult(null); fetchData()
    } catch (err) { toast.error(err.response?.data?.message || "تعذر الحفظ") }
    finally { setSubmittingMed(false) }
  }

  const handleUpdateMed = async (e) => {
    e.preventDefault()
    if (!editingMed?.medication?.trim()) return toast.error("اسم الدواء مطلوب")
    try {
      setSubmittingEdit(true)
      await api.put(`/prescriptions/${editingMed.id}`, { medication: editingMed.medication, dose: editingMed.dose, duration: editingMed.duration, isChronic: editingMed.isChronic })
      toast.success("تم تحديث الدواء بنجاح")
      setEditingMed(null)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || "تعذر التعديل") }
    finally { setSubmittingEdit(false) }
  }

  const handleOpenPharmacyModal = async (prescriptionId) => {
    setSelectedPrescriptionForPharmacy(prescriptionId)
    setShowPharmacyModal(true)
    if (pharmaciesList.length === 0) {
      setIsLoadingPharmacies(true)
      try {
        const { data } = await api.get('/prescriptions/pharmacies/active')
        setPharmaciesList(data.data)
      } catch (err) {
        toast.error('تعذر جلب قائمة الصيدليات')
      } finally {
        setIsLoadingPharmacies(false)
      }
    }
  }

  const handleRequestPharmacy = async (pharmacyId) => {
    setRequestingPharmacyFor(pharmacyId)
    try {
      await api.put(`/prescriptions/${selectedPrescriptionForPharmacy}/request-pharmacy`, { pharmacyId })
      toast.success('تم إرسال الطلب للصيدلية بنجاح! بانتظار موافقتهم.')
      setShowPharmacyModal(false)
      fetchData() // refresh to update prescription status
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إرسال الطلب')
    } finally {
      setRequestingPharmacyFor(null)
    }
  }

  const handleLabUpload = async (e) => {
    e.preventDefault()
    if (!labFile) return toast.error("يجب إرفاق ملف النتيجة")
    try {
      setSubmittingLab(true)
      const fd = new FormData();
      fd.append('testName', labUpload.testName);
      if (labUpload.date) fd.append('date', labUpload.date);
      // Field name MUST match the multer config on the server
      // (`upload.array('labFiles', 10)`); using 'labFile' (singular) makes
      // multer reject the request as "Unexpected field".
      fd.append('labFiles', labFile)

      await api.post('/labs', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success("تم رفع نتيجة المختبر"); setLabUpload({ testName: '', date: '' }); setLabFile(null); fetchData()
    } catch (err) { toast.error(err.response?.data?.message || "تعذر الرفع") }
    finally { setSubmittingLab(false) }
  }

  const handleRadUpload = async (e) => {
    e.preventDefault()
    if (!radFile) return toast.error("يجب إرفاق ملف الأشعة")
    try {
      setSubmittingRad(true)
      const fd = new FormData(); 
      fd.append('scanType', radUpload.scanType); 
      if (radUpload.date) fd.append('date', radUpload.date);
      fd.append('radiologyFile', radFile)

      await api.post('/radiology', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success("تم رفع تقرير الأشعة"); setRadUpload({ scanType: '', date: '' }); setRadFile(null); fetchData()
    } catch (err) { toast.error(err.response?.data?.message || "تعذر الرفع") }
    finally { setSubmittingRad(false) }
  }

  const handleDeleteLab = (id) => {
    askConfirm({
      title: 'حذف التحليل',
      description: 'هل أنت متأكد من حذف هذا التحليل؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        closeConfirm()
        try {
          setDeletingId(id)
          await api.delete(`/labs/${id}`)
          toast.success('تم حذف التحليل بنجاح')
          fetchData()
        } catch (err) { toast.error(err.response?.data?.message || 'تعذر الحذف') }
        finally { setDeletingId(null) }
      },
    })
  }

  const handleDeleteRadiology = (id) => {
    askConfirm({
      title: 'حذف تقرير الأشعة',
      description: 'هل أنت متأكد من حذف تقرير الأشعة؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        closeConfirm()
        try {
          setDeletingId(id)
          await api.delete(`/radiology/${id}`)
          toast.success('تم حذف تقرير الأشعة بنجاح')
          fetchData()
        } catch (err) { toast.error(err.response?.data?.message || 'تعذر الحذف') }
        finally { setDeletingId(null) }
      },
    })
  }

  const handleUpdateLab = async (e) => {
    e.preventDefault()
    if (!editingLab?.testName?.trim()) return toast.error("اسم التحليل مطلوب")
    try {
      setSubmittingEdit(true)
      const fd = new FormData();
      fd.append('testName', editingLab.testName);
      if (editingLab.date) fd.append('date', editingLab.date);
      // Field name MUST be 'labFiles' (matches upload.array on server)
      if (editingLab.file) fd.append('labFiles', editingLab.file);

      await api.put(`/labs/${editingLab.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success("تم تحديث التحليل بنجاح")
      setEditingLab(null)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || "تعذر التعديل") }
    finally { setSubmittingEdit(false) }
  }

  const handleUpdateRadiology = async (e) => {
    e.preventDefault()
    if (!editingRad?.scanType?.trim()) return toast.error("نوع الأشعة مطلوب")
    try {
      setSubmittingEdit(true)
      const fd = new FormData();
      fd.append('scanType', editingRad.scanType);
      if (editingRad.date) fd.append('date', editingRad.date);
      if (editingRad.file) fd.append('radiologyFile', editingRad.file);

      await api.put(`/radiology/${editingRad.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success("تم تحديث الأشعة بنجاح")
      setEditingRad(null)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || "تعذر التعديل") }
    finally { setSubmittingEdit(false) }
  }

  const handleUpdateRecord = async (e) => {
    e.preventDefault()
    if (!editingRecord?.diagnosis?.trim()) return toast.error("وصف السجل مطلوب")
    try {
      setSubmittingEdit(true)
      await api.put(`/records/${editingRecord.id}`, { diagnosis: editingRecord.diagnosis, notes: editingRecord.notes || '' })
      toast.success("تم تحديث السجل بنجاح")
      setEditingRecord(null)
      fetchData()
    } catch (err) { toast.error(err.response?.data?.message || "تعذر التعديل") }
    finally { setSubmittingEdit(false) }
  }

  const handleDeleteRecord = (id) => {
    askConfirm({
      title: 'حذف السجل الطبي',
      description: 'هل أنت متأكد من حذف هذا السجل الطبي؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        closeConfirm()
        try {
          setDeletingId(id)
          await api.delete(`/records/${id}`)
          toast.success('تم حذف السجل بنجاح')
          fetchData()
        } catch (err) { toast.error(err.response?.data?.message || 'تعذر الحذف') }
        finally { setDeletingId(null) }
      },
    })
  }

  const handleDeletePrescription = (id) => {
    askConfirm({
      title: 'حذف الدواء',
      description: 'هل أنت متأكد من حذف هذا الدواء؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        closeConfirm()
        try {
          setDeletingId(id)
          await api.delete(`/prescriptions/${id}`)
          toast.success('تم حذف الدواء بنجاح')
          fetchData()
        } catch (err) { toast.error(err.response?.data?.message || 'تعذر الحذف') }
        finally { setDeletingId(null) }
      },
    })
  }

  const handleDownloadPDF = async () => {
    // Open the new print layout in a new tab.
    window.open(`/report/${user?.id}`, '_blank')
  }

  // ============== RENDER ==============

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50/50 dark:bg-slate-950 transition-colors duration-300" dir="rtl"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23cbd5e1' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    >
      <div className="max-w-7xl mx-auto">

        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold mb-1 text-gray-900 dark:text-white truncate">مرحباً، {user?.fullName || 'المريض'}</h1>
            <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm">أدر صحتك في مكان واحد</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button onClick={handleDownloadPDF} variant="outline" className="gap-1.5 min-h-[44px] border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-bold px-3 sm:px-4">
              <Download size={18} />
              <span className="hidden sm:inline">تصدير السجل (PDF)</span>
            </Button>
            
            <Notifications
              notifications={notifications}
              onDeleteOne={async (id) => {
                try { await api.delete(`/notifications/${id}`); fetchData() }
                catch { toast.error('تعذر حذف الإشعار') }
              }}
              onClearAll={async () => {
                try {
                  await api.delete('/notifications')
                  fetchData()
                  toast.success('تم مسح كل الإشعارات')
                } catch { toast.error('تعذر مسح الإشعارات') }
              }}
              onMarkAllRead={async () => {
                try { await api.patch('/notifications/read'); fetchData() }
                catch { toast.error('تعذر التعليم كمقروء') }
              }}
            />

            <Button onClick={() => setIsAiModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-xs sm:text-sm px-3 sm:px-4">
              <Brain size={18} />
              <span className="hidden sm:inline">تحليل ذكي</span>
            </Button>
          </div>
        </div>

        <div className="relative mb-6 group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
          <input
            type="text" placeholder="ابحث في سجلاتك، أدويتك، أو تحاليلك..."
            value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500/50 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none shadow-sm dark:shadow-none text-gray-900 dark:text-white transition-all duration-300"
          />
        </div>

        {/* ═══════════════ EMERGENCY CARD ═══════════════ */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={20} className="text-red-500" />
            <h3 className="font-bold text-red-800 dark:text-red-300 text-base">بطاقة الحالة الطارئة</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-red-100 dark:border-red-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Droplets size={16} className="text-red-500" />
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400">فصيلة الدم</span>
              </div>
              <p className="text-xl font-black text-red-600 dark:text-red-400" dir="ltr">
                {user?.bloodType && user.bloodType !== 'unknown' ? user.bloodType : '⚠️ غير محدد'}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-red-100 dark:border-red-800/30">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={16} className="text-orange-500" />
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400">الحساسيات</span>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                {user?.allergies?.length > 0 ? user.allergies.join('، ') : 'لا توجد حساسيات مسجلة'}
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/60 rounded-xl p-3 border border-red-100 dark:border-red-800/30">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} className="text-purple-500" />
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400">الأمراض المزمنة</span>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-slate-200">
                {user?.chronicDiseases?.length > 0 ? user.chronicDiseases.join('، ') : 'لا توجد أمراض مزمنة'}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════ PROFILE WARNING ═══════════════ */}
        {profileWarnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">ملفك الطبي غير مكتمل!</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">البيانات الناقصة: {profileWarnings.join('، ')}. <Link to="/profile" className="underline font-bold hover:text-amber-900 dark:hover:text-amber-200">أكمل ملفك الآن</Link></p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { icon: Calendar, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/50', iconColor: 'text-blue-600 dark:text-blue-400', value: appointments.length, label: 'المواعيد', cta: upcomingAppointments.length === 0 ? 'احجز أول موعد' : null, action: () => setIsBookingModalOpen(true) },
            { icon: FileText, bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50', iconColor: 'text-emerald-600 dark:text-emerald-400', value: medicalRecords.length, label: 'السجلات', action: () => setActiveTab('timeline') },
            { icon: Pill, bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800/50', iconColor: 'text-purple-600 dark:text-purple-400', value: prescriptions.length, label: 'الأدوية', action: () => setActiveTab('timeline') },
            { icon: TestTubes, bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800/50', iconColor: 'text-rose-600 dark:text-rose-400', value: labResults.length, label: 'التحاليل', action: () => setActiveTab('timeline') },
          ].map(({ icon: Icon, bg, border, iconColor, value, label, cta, action }, i) => (
            <Card key={i} className={`${bg} ${border} hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer`} onClick={action}>
              <CardContent className="pt-5 pb-4">
                <div className="text-center flex flex-col items-center justify-center h-full">
                  <Icon className={`h-6 w-6 ${iconColor} mb-2`} />
                  <div className={`text-2xl font-black ${iconColor} mb-0.5`}>{value}</div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 font-bold mb-2">{label}</p>
                  {cta ? (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-[10px] px-3 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 text-indigo-700 dark:text-indigo-400 rounded-full font-bold shadow-sm transition-all border border-indigo-100 dark:border-indigo-800/50 hover:border-indigo-300 w-full max-w-[120px] mx-auto mt-auto"
                      onClick={(e) => { e.stopPropagation(); action(); }}
                    >
                      {cta} <span className="ml-1 mr-1">←</span>
                    </Button>
                  ) : (
                    <div className="h-7 mt-auto"></div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══════════════ TABS ═══════════════ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl h-auto p-1.5 shadow-sm">
            <TabsTrigger value="timeline" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm rounded-xl data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 transition-all font-bold">
              <Activity className="h-4 w-4" /><span className="hidden sm:inline">السجل الشامل</span>
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm rounded-xl data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 transition-all font-bold">
              <Calendar className="h-4 w-4" /><span className="hidden sm:inline">المواعيد</span>
            </TabsTrigger>
            <TabsTrigger value="uploads" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm rounded-xl data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 transition-all font-bold">
              <CloudUpload className="h-4 w-4" /><span className="hidden sm:inline">إدخال بيانات</span>
            </TabsTrigger>
            <TabsTrigger value="qr-code" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm rounded-xl data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400 transition-all font-bold">
              <QrCode className="h-4 w-4" /><span className="hidden sm:inline">طوارئ (QR)</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════ APPOINTMENTS ═══════ */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div><CardTitle>مواعيدك</CardTitle><CardDescription>عرض وإدارة المواعيد</CardDescription></div>
                <Button size="sm" className="gap-2 min-h-[44px] px-4" onClick={() => setIsBookingModalOpen(true)}>
                  <Plus className="h-4 w-4" />حجز موعد
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? <div className="flex justify-center p-8"><Spinner /></div> : appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map(apt => (
                      <div key={apt._id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-start gap-3 hover:shadow-sm transition-shadow bg-white dark:bg-slate-900">
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-gray-900 dark:text-slate-100">{apt.doctorId ? `د. ${apt.doctorId.fullName}` : apt.organizationId?.name || 'جهة غير معروفة'}</h3>
                          {apt.doctorId?.specialty && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{apt.doctorId.specialty}</p>}
                          <p className="text-sm mt-2 font-medium text-gray-700 dark:text-slate-300">{new Date(apt.date).toLocaleDateString('ar-EG')} — {apt.time || apt.timeSlot}</p>
                          {apt.reason && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{apt.reason}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${statusColors[apt.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[apt.status] || apt.status}
                          </span>
                          {apt.status === 'Pending' && (
                            <div className="flex bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
                                <Button
                                  size="sm" variant="ghost"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-8 px-3 rounded-md gap-1.5 transition-colors"
                                  onClick={() => setEditingAppointment(apt)}
                                >
                                  تعديل
                                </Button>
                                <div className="w-px bg-gray-200 dark:bg-slate-700 my-1 mx-0.5"></div>
                                <Button
                                  size="sm" variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-100 h-8 px-3 rounded-md gap-1.5 transition-colors"
                                  disabled={cancellingId === apt._id}
                                  onClick={() => handleCancelAppointment(apt._id)}
                                >
                                  {cancellingId === apt._id ? <Spinner className="w-3 h-3" /> : <Ban size={14} />}
                                  إلغاء
                                </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Calendar} title="لا توجد مواعيد" description="لم تقم بحجز أي مواعيد طبية بعد." actionLabel="احجز موعدك الأول" onAction={() => setIsBookingModalOpen(true)} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ TIMELINE ═══════ */}
          <TabsContent value="timeline">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MedicalTimeline 
                  records={filteredRecords}
                  prescriptions={filteredPrescriptions}
                  labs={filteredLabs}
                  radiology={filteredRadiology}
                  onEdit={(type, item) => {
                    if(type === 'record') setEditingRecord({id: item._id, diagnosis: item.diagnosis, notes: item.notes})
                    if(type === 'prescription') setEditingMed({id: item._id, medication: item.medication, dose: item.dose, duration: item.duration, isChronic: item.isChronic})
                    if(type === 'lab') setEditingLab({id: item._id, testName: item.testName, date: item.date || item.createdAt})
                    if(type === 'radiology') setEditingRad({id: item._id, scanType: item.scanType, date: item.date || item.createdAt})
                  }}
                  onDelete={(type, id) => {
                    if(type === 'record') handleDeleteRecord(id)
                    if(type === 'prescription') handleDeletePrescription(id)
                    if(type === 'lab') handleDeleteLab(id)
                    if(type === 'radiology') handleDeleteRadiology(id)
                  }}
                  onViewDoc={handleViewSecureDocument}
                  onOpenPharmacy={handleOpenPharmacyModal}
                />
              </div>
              <div className="space-y-6">
                <DataCharts records={medicalRecords} prescriptions={prescriptions} labs={labResults} radiology={radiologyResults} />
                
                {/* ── Smart Card for Pharmacy ── */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950 border-blue-200 dark:border-indigo-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                      <QrCode size={18} className="text-blue-600 dark:text-blue-400" />
                      بطاقة الصيدلية الذكية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-3">
                    {isGeneratingQr ? (
                      <div className="flex justify-center items-center min-h-[160px]"><Spinner className="w-8 h-8 text-blue-500" /></div>
                    ) : qrToken ? (
                      <>
                        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                          <QRCodeSVG value={`${window.location.origin}/emergency/${user.id || user._id}?token=${qrToken}`} size={150} />
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 text-center">صالح لمدة 24 ساعة — اعرضه للصيدلي</p>
                      </>
                    ) : (
                      <Button onClick={async () => {
                        setIsGeneratingQr(true)
                        try {
                          const { data } = await api.get(`/patients/${user.id || user._id}/qr-token`)
                          setQrToken(data.data.qrToken)
                        } catch { toast.error('تعذر إنشاء الكود') }
                        finally { setIsGeneratingQr(false) }
                      }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                        <QrCode size={16} /> إنشاء كود للصيدلية
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══════ UPLOADS & DATA ENTRY ═══════ */}
          <TabsContent value="uploads">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Record Input */}
              <Card className="border-indigo-100 dark:border-indigo-900 overflow-hidden h-full">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white text-center">
                  <Brain className="w-8 h-8 mx-auto mb-1 opacity-90" />
                  <h2 className="text-lg font-bold mb-0.5">إضافة تشخيص / أعراض</h2>
                  <p className="text-indigo-100 text-xs">صياغة وتلخيص الشكوى بالذكاء الاصطناعي</p>
                </div>
                <CardContent className="p-4 bg-white dark:bg-slate-900">
                  <form onSubmit={handleSelfReportSubmit} className="space-y-4">
                    <div className="space-y-2 relative">
                      <textarea
                        rows="3"
                        className={`w-full p-3 rounded-xl border text-sm resize-none bg-transparent dark:text-white transition-colors ${aiProcessedState ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-slate-700 focus:border-indigo-500'}`}
                        placeholder="الشكوى أو الوصف..."
                        value={selfReport.diagnosis}
                        onChange={e => { setSelfReport(prev => ({ ...prev, diagnosis: e.target.value })); if (aiProcessedState) setAiProcessedState(null) }}
                        required
                      />
                      <div className="flex flex-col gap-2 mt-1">
                        {aiProcessedState && <span className="text-[10px] font-bold text-green-600 self-start bg-green-100 px-2 py-0.5 rounded-full">✓ تم التنقيح</span>}
                        <Button type="button" size="sm" className="w-full gap-1 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 h-8 text-[11px]"
                          onClick={handleFormatAi} disabled={isFormatting || !selfReport.diagnosis || aiProcessedState !== null}>
                          {isFormatting ? <Spinner className="w-3 h-3" /> : <Brain size={12} />} إعادة صياغة
                        </Button>
                      </div>
                    </div>
                    <Input type="date" value={selfReport.visitDate} onChange={e => setSelfReport(prev => ({ ...prev, visitDate: e.target.value }))} className="w-full text-sm h-9 dark:bg-slate-800 dark:text-white" dir="ltr" />
                    
                    <div className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${selfFile ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300'}`} onClick={() => fileInputRef.current?.click()}>
                      <input type="file" hidden ref={fileInputRef} accept=".pdf,.jpg,.jpeg,.png" onChange={e => setSelfFile(e.target.files[0] || null)} />
                      {selfFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 text-xs truncate max-w-[150px]">{selfFile.name}</span>
                          <button type="button" onClick={e => { e.stopPropagation(); setSelfFile(null) }} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                        </div>
                      ) : (
                        <div><span className="text-xs text-gray-500 dark:text-slate-400">إرفاق مستند طبي (اختياري)</span></div>
                      )}
                    </div>
                    <Button type="submit" disabled={submittingSelf} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10">
                      {submittingSelf ? <Spinner className="w-4 h-4" /> : 'حفظ السجل'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Medication Input */}
              <Card className="border-purple-100 dark:border-purple-900 overflow-hidden h-full">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white text-center">
                  <ShieldCheck className="w-8 h-8 mx-auto mb-1 opacity-90" />
                  <h2 className="text-lg font-bold mb-0.5">فحص وإضافة دواء</h2>
                  <p className="text-purple-100 text-xs">احمِ نفسك من التعارضات الدوائية</p>
                </div>
                <CardContent className="p-4 bg-white dark:bg-slate-900">
                  <form onSubmit={handleSaveMed} className="space-y-3">
                    <Input placeholder="اسم الدواء (مطلوب)" className="dark:bg-slate-800 dark:text-white" value={selfMed.medication} onChange={e => setSelfMed({ ...selfMed, medication: e.target.value })} required />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="الجرعة (مطلوب)" className="dark:bg-slate-800 dark:text-white" value={selfMed.dose} onChange={e => setSelfMed({ ...selfMed, dose: e.target.value })} />
                      <Input placeholder="المدة (مطلوب)" className="dark:bg-slate-800 dark:text-white" value={selfMed.duration} onChange={e => setSelfMed({ ...selfMed, duration: e.target.value })} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={selfMed.isChronic} onChange={e => setSelfMed({ ...selfMed, isChronic: e.target.checked })} className="rounded text-purple-600 focus:ring-purple-500 bg-transparent" />
                      هذا دواء مزمن (مستمر)
                    </label>
                    {drugCheckResult && (
                      <div className={`p-3 rounded-lg text-sm font-bold flex items-start gap-2 ${drugCheckResult.status === 'Danger' ? 'bg-red-100 text-red-800' : drugCheckResult.status === 'Warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {drugCheckResult.status === 'Danger' && <ShieldAlert className="shrink-0 w-5 h-5" />}
                        {drugCheckResult.status === 'Warning' && <AlertTriangle className="shrink-0 w-5 h-5" />}
                        {drugCheckResult.status === 'Safe' && <ShieldCheck className="shrink-0 w-5 h-5" />}
                        <span>{drugCheckResult.message}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" className="flex-1 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 min-h-[44px]" disabled={isCheckingDrug || !selfMed.medication} onClick={handleCheckDrug}>
                        {isCheckingDrug ? <Spinner className="w-4 h-4" /> : 'فحص التعارض'}
                      </Button>
                      <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700 text-white min-h-[44px]" disabled={submittingMed || !drugCheckResult || drugCheckResult.status === 'Danger' || !selfMed.dose || !selfMed.duration}>
                        {submittingMed ? <Spinner className="w-4 h-4" /> : 'حفظ بسجلي'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Lab & Rad Upload */}
              <div className="space-y-6">
                <Card className="bg-gray-50/80 dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                  <CardHeader className="py-3 px-4 border-b border-gray-100 dark:border-slate-800"><CardTitle className="text-sm">رفع نتيجة تحليل</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleLabUpload} className="space-y-3">
                      <Input placeholder="اسم التحليل (مثال: CBC)" className="dark:bg-slate-800 dark:text-white" required value={labUpload.testName || ''} onChange={e => setLabUpload({ ...labUpload, testName: e.target.value })} />
                      <Input type="date" value={labUpload.date || ''} className="dark:bg-slate-800 dark:text-white" onChange={e => setLabUpload({ ...labUpload, date: e.target.value })} />
                      <div className="border border-dashed p-3 text-center rounded-xl bg-white dark:bg-slate-800 cursor-pointer hover:border-sky-300 transition" onClick={() => labInputRef.current?.click()}>
                        <input type="file" hidden ref={labInputRef} accept=".pdf,image/*" onChange={e => setLabFile(e.target.files[0])} />
                        {labFile ? <span className="text-sm font-bold text-sky-600">{labFile.name}</span> : <span className="text-sm text-gray-500">اختر ملف التحليل</span>}
                      </div>
                      <Button type="submit" disabled={submittingLab} className="w-full h-10 bg-sky-600 hover:bg-sky-700">{submittingLab ? <Spinner className="w-4 h-4" /> : 'رفع التحليل'}</Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="bg-gray-50/80 dark:bg-slate-900/80 border-gray-200 dark:border-slate-800">
                  <CardHeader className="py-3 px-4 border-b border-gray-100 dark:border-slate-800"><CardTitle className="text-sm">رفع تقرير أشعة</CardTitle></CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleRadUpload} className="space-y-3">
                      <Input placeholder="نوع الأشعة (مثال: MRI Brain)" className="dark:bg-slate-800 dark:text-white" required value={radUpload.scanType || ''} onChange={e => setRadUpload({ ...radUpload, scanType: e.target.value })} />
                      <Input type="date" value={radUpload.date || ''} className="dark:bg-slate-800 dark:text-white" onChange={e => setRadUpload({ ...radUpload, date: e.target.value })} />
                      <div className="border border-dashed p-3 text-center rounded-xl bg-white dark:bg-slate-800 cursor-pointer hover:border-teal-300 transition" onClick={() => radInputRef.current?.click()}>
                        <input type="file" hidden ref={radInputRef} accept=".pdf,image/*" onChange={e => setRadFile(e.target.files[0])} />
                        {radFile ? <span className="text-sm font-bold text-teal-600">{radFile.name}</span> : <span className="text-sm text-gray-500">اختر ملف الأشعة</span>}
                      </div>
                      <Button type="submit" disabled={submittingRad} className="w-full h-10 bg-teal-600 hover:bg-teal-700">{submittingRad ? <Spinner className="w-4 h-4" /> : 'رفع الأشعة'}</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>


          {/* ═══════ QR CODE ═══════ */}
          <TabsContent value="qr-code">
            <div className="max-w-md mx-auto">
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/40 border-indigo-200 dark:border-indigo-800/50">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl text-gray-900 dark:text-slate-100">البطاقة الذكية QR</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-slate-400">اعرض هذا الكود للطبيب أو المسعف للوصول لسجلك الطبي</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  {/* QR Display */}
                  <div ref={qrRef} className="bg-white p-6 rounded-2xl shadow-lg border-2 border-indigo-100">
                    <QRCodeSVG
                      value={qrToken || `${window.location.origin}/emergency/${user?.id}`}
                      size={220}
                      bgColor="#ffffff"
                      fgColor="#312e81"
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  {/* Patient Name under QR */}
                  <div className="text-center">
                    <p className="font-bold text-gray-800 dark:text-slate-100 text-lg">{user?.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1" dir="ltr">
                      {qrToken ? '✅ كود مؤمّن (15 دقيقة)' : '🚨 رابط طوارئ عام'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col w-full gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          setIsGeneratingQr(true)
                          const { data } = await api.get(`/patients/${user.id}/qr-token`)
                          const fullUrl = `${window.location.origin}/emergency/${user.id}?token=${data.data.qrToken}`
                          setQrToken(fullUrl)
                          toast.success('تم توليد كود مؤمّن لمدة 15 دقيقة')
                        } catch (err) { toast.error(err.response?.data?.message || 'تعذر التوليد') }
                        finally { setIsGeneratingQr(false) }
                      }}
                      disabled={isGeneratingQr}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white min-h-[48px] gap-2"
                    >
                      {isGeneratingQr ? <Spinner className="w-4 h-4" /> : <QrCode size={18} />}
                      توليد كود مؤمّن (15 دقيقة)
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] gap-2 border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        const svg = qrRef.current?.querySelector('svg')
                        if (!svg) return
                        const svgData = new XMLSerializer().serializeToString(svg)
                        const canvas = document.createElement('canvas')
                        canvas.width = 300; canvas.height = 300
                        const ctx = canvas.getContext('2d')
                        const img = new Image()
                        img.onload = () => {
                          ctx.fillStyle = '#fff'
                          ctx.fillRect(0, 0, 300, 300)
                          ctx.drawImage(img, 40, 40, 220, 220)
                          const a = document.createElement('a')
                          a.download = `MedCore-QR-${user?.fullName || 'patient'}.png`
                          a.href = canvas.toDataURL('image/png')
                          a.click()
                        }
                        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
                      }}
                    >
                      <Download size={16} /> تحميل الكود كصورة
                    </Button>
                  </div>

                  {/* Info box */}
                  <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/50 w-full text-sm">
                    <h4 className="font-bold text-gray-800 dark:text-slate-200 mb-2">💡 كيف يعمل؟</h4>
                    <ul className="space-y-1.5 text-gray-600 dark:text-slate-400 text-xs">
                      <li>• <strong>الرابط العام:</strong> يعرض فقط فصيلة الدم + الحساسيات + الأمراض المزمنة (للطوارئ)</li>
                      <li>• <strong>الكود المؤمّن (15د):</strong> يمنح الطبيب صلاحية كاملة لسجلك الطبي لمدة محدودة</li>
                      <li>• اطبع الكود واحفظه في محفظتك لحالات الطوارئ</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>

      <BookAppointmentModal 
        isOpen={isBookingModalOpen || editingAppointment !== null || prefilledAppointment !== null} 
        onClose={() => { setIsBookingModalOpen(false); setEditingAppointment(null); setPrefilledAppointment(null); }} 
        onSuccess={() => fetchData()} 
        editAppointment={editingAppointment}
        prefilledAppointment={prefilledAppointment}
      />
      <AiAnalysisModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} patientId={user?.id} patientName={user?.fullName} />

      {/* Pharmacy Selection Modal */}
      {showPharmacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in border border-gray-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                <Store className="text-indigo-600" />
                اختر صيدلية للصرف
              </h3>
              <button onClick={() => setShowPharmacyModal(false)} className="text-gray-400 dark:text-slate-500 hover:text-red-500">
                <X size={20} />
              </button>
            </div>
            
            {isLoadingPharmacies ? (
              <div className="flex flex-col items-center py-8">
                <Spinner className="w-8 h-8 text-indigo-500 mb-2" />
                <p className="text-sm text-gray-500 dark:text-slate-400">جاري البحث عن صيدليات...</p>
              </div>
            ) : pharmaciesList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-slate-400 font-medium">لا توجد صيدليات متاحة حالياً</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pl-2">
                {pharmaciesList.map(pharmacy => (
                  <div key={pharmacy._id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition bg-white dark:bg-slate-800">
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-1">{pharmacy.name}</h4>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mb-3 space-y-1">
                      {pharmacy.address && <p className="flex items-center gap-1.5"><MapPin size={12}/> {pharmacy.address}</p>}
                      {pharmacy.phoneNumber && <p className="flex items-center gap-1.5"><Phone size={12}/> {pharmacy.phoneNumber}</p>}
                    </div>
                    <Button 
                      onClick={() => handleRequestPharmacy(pharmacy._id)} 
                      disabled={requestingPharmacyFor === pharmacy._id}
                      className="w-full bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold transition-colors"
                    >
                      {requestingPharmacyFor === pharmacy._id ? <Spinner className="w-4 h-4" /> : 'إرسال الطلب لهذه الصيدلية'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {docModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 rounded-t-2xl">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="text-indigo-600" size={20} />
                عرض المستند الطبي
              </h3>
              <div className="flex items-center gap-2">
                <a href={docModal.url} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400" title="فتح في نافذة جديدة">
                  <ExternalLink size={16} />
                </a>
                <button onClick={() => setDocModal({ isOpen: false, url: '', isPdf: false })} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 p-2 overflow-auto relative bg-gray-100 dark:bg-slate-950 flex items-center justify-center min-h-[50vh]">
              {docModal.isPdf ? (
                <iframe src={docModal.url} className="w-full h-[70vh] rounded-lg" title="Document Viewer" />
              ) : (
                <img src={docModal.url} alt="Medical Document" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shared confirm dialog for delete actions */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        variant="danger"
        onCancel={closeConfirm}
        onConfirm={() => confirmState.onConfirm?.()}
      />
    </div>
  )
}