import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import axios from 'axios'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Search, Loader2, Pill, CheckCircle2, XCircle, User as UserIcon, AlertTriangle, FileText, AlertCircle, Inbox, Edit, QrCode, X, Camera, Calendar, ChevronLeft, ChevronRight, TrendingUp, Clock, Printer, ShieldCheck, CheckSquare, Square, Shield } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { toast } from 'sonner'
import api from '@/services/api.js'
import { useAuth } from '@/context/AuthContext.jsx'
import { Link } from 'react-router-dom'
import EmptyState from '@/components/ui/EmptyState.jsx'
import PharmacyCharts from '@/components/pharmacy/PharmacyCharts.jsx'
import { usePageTitle } from '@/hooks/usePageTitle.js'

export default function PharmacistPage() {
  usePageTitle('لوحة الصيدلية')
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('requests')
  
  const [incomingRequests, setIncomingRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingRequest, setEditingRequest] = useState(null)
  const [submittingEdit, setSubmittingEdit] = useState(false)
  
  const isProfileComplete = user?.phoneNumber && user?.address

  const [stats, setStats] = useState({ totalDispensed: 0, todayDispensed: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  const [qrTerm, setQrTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const scannerRef = useRef(null)
  const [patientInfo, setPatientInfo] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [dispensingId, setDispensingId] = useState(null)

  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyTotalPages, setHistoryTotalPages] = useState(0)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const HISTORY_PER_PAGE = 20

  const [manualMed, setManualMed] = useState({ medication: '', dose: '', duration: '' })
  const [manualSubmitting, setManualSubmitting] = useState(false)

  // Round 4: Bulk dispense
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDispensing, setBulkDispensing] = useState(false)

  // Round 4: Drug interaction check
  const [drugWarning, setDrugWarning] = useState(null)
  const [checkingDrug, setCheckingDrug] = useState(false)
  const drugCheckTimer = useRef(null)

  // Bug 3: Allergy-medication cross-reference helper
  const checkAllergyMatch = useCallback((medication, allergies) => {
    if (!medication || !allergies?.length) return null
    const medLower = medication.toLowerCase()
    const matched = allergies.filter(a => {
      const al = (a || '').toLowerCase()
      return al && (medLower.includes(al) || al.includes(medLower))
    })
    return matched.length > 0 ? matched : null
  }, [])

  useEffect(() => { fetchStats() }, [])
  useEffect(() => {
    if (activeTab === 'history') fetchHistory(1)
    else if (activeTab === 'requests') fetchRequests()
  }, [activeTab])
  useEffect(() => {
    if (activeTab === 'history') { setHistoryPage(1); fetchHistory(1) }
  }, [dateFrom, dateTo])

  // QR Scanner
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('pharmacy-qr-reader', { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 })
      scannerRef.current = scanner
      scanner.render((decodedText) => {
        scanner.clear()
        setShowScanner(false)
        if (decodedText.includes('token=')) {
          try { const token = new URL(decodedText).searchParams.get('token'); if (token) { setQrTerm(token); searchPatient(token) } } catch { setQrTerm(decodedText); searchPatient(decodedText) }
        } else { setQrTerm(decodedText); searchPatient(decodedText) }
      }, () => {})
    }
    return () => { if (scannerRef.current) { scannerRef.current.clear().catch(() => {}) } }
  }, [showScanner])

  const fetchStats = async () => {
    try { const { data } = await api.get('/prescriptions/pharmacy/stats'); setStats(data.data) }
    catch (err) { if (!axios.isCancel(err)) console.error('Stats error:', err) }
    finally { setLoadingStats(false) }
  }

  const fetchHistory = async (page = historyPage) => {
    setLoadingHistory(true)
    try {
      let url = `/prescriptions/pharmacy/history?page=${page}&limit=${HISTORY_PER_PAGE}`
      if (dateFrom) url += `&from=${dateFrom}`
      if (dateTo) url += `&to=${dateTo}`
      const { data } = await api.get(url)
      setHistory(data.data)
      setHistoryTotal(data.total || 0)
      setHistoryTotalPages(data.totalPages || 1)
      setHistoryPage(data.page || page)
    }
    catch (err) { if (!axios.isCancel(err)) toast.error('تعذر جلب سجل الصرف') }
    finally { setLoadingHistory(false) }
  }

  const fetchRequests = async () => {
    setLoadingRequests(true)
    try { const { data } = await api.get('/prescriptions/pharmacy/requests'); setIncomingRequests(data.data) }
    catch (err) { if (!axios.isCancel(err)) { console.error('Requests error:', err); toast.error(`تعذر جلب الطلبات الواردة: ${err.response?.status || ''} ${err.response?.data?.message || err.message}`) } }
    finally { setLoadingRequests(false) }
  }

  const handleManualDispense = async (e) => {
    e.preventDefault()
    if (!manualMed.medication || !manualMed.dose || !manualMed.duration) return toast.error("جميع الحقول مطلوبة")
    try {
      setManualSubmitting(true)
      await api.post('/prescriptions', { ...manualMed, patientId: patientInfo._id })
      toast.success("تم إضافة وصرف الدواء للمريض بنجاح")
      setManualMed({ medication: '', dose: '', duration: '' })
      const { data: presRes } = await api.get(`/prescriptions/${patientInfo._id}?limit=50`)
      setPrescriptions(presRes.data); fetchStats()
    } catch (err) { toast.error(err.response?.data?.message || 'تعذر الإضافة') }
    finally { setManualSubmitting(false) }
  }

  // Round 4: Drug interaction check (debounced)
  useEffect(() => {
    if (!manualMed.medication || manualMed.medication.trim().length < 2 || !patientInfo) {
      setDrugWarning(null); return
    }
    if (drugCheckTimer.current) clearTimeout(drugCheckTimer.current)
    drugCheckTimer.current = setTimeout(async () => {
      setCheckingDrug(true)
      try {
        const currentDrugs = prescriptions.filter(p => p.status === 'pending').map(p => p.medication).filter(Boolean)
        const allergies = Array.isArray(patientInfo.allergies) ? patientInfo.allergies : []
        const { data } = await api.post('/ai/check-interactions', {
          newDrug: manualMed.medication.trim(), currentDrugs, allergies
        })
        const result = data?.data
        if (result && result.status !== 'Safe') setDrugWarning(result)
        else setDrugWarning(null)
      } catch { /* AI unavailable */ }
      finally { setCheckingDrug(false) }
    }, 800)
    return () => { if (drugCheckTimer.current) clearTimeout(drugCheckTimer.current) }
  }, [manualMed.medication, patientInfo, prescriptions])

  // Round 4: Bulk dispense handler
  const handleBulkDispense = async () => {
    if (selectedIds.size === 0) return toast.error('اختر طلبات للصرف أولاً')
    setBulkDispensing(true)
    let success = 0, failed = 0
    for (const id of selectedIds) {
      try {
        await api.put(`/prescriptions/${id}/dispense`)
        success++
        setIncomingRequests(prev => prev.filter(r => r._id !== id))
      } catch { failed++ }
    }
    setSelectedIds(new Set())
    await fetchStats()
    if (success > 0) toast.success(`تم صرف ${success} وصفة بنجاح${failed > 0 ? ` (فشل: ${failed})` : ''}`)
    else toast.error('فشل صرف جميع الوصفات')
    setBulkDispensing(false)
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredRequests.map(r => r._id)))
  }

  // Round 4: Print receipt — built with DOM APIs to prevent HTML injection
  // (any of these strings can come from a doctor / org user, so concatenating
  // them into an HTML template via document.write is an XSS sink).
  const printReceipt = (prescription) => {
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return toast.error('تعذر فتح نافذة الطباعة')

    const patName = prescription.patientId?.fullName || patientInfo?.fullName || '—'
    const patId = prescription.patientId?.nationalId || patientInfo?.nationalId || '—'
    const docName = prescription.doctorId?.fullName || '—'
    const date = new Date(prescription.dispensedAt || prescription.updatedAt || prescription.createdAt).toLocaleString('ar-EG')
    const orgName = user?.orgName || 'الصيدلية'
    const dispensedBy = user?.fullName || 'الصيدلي'
    const medication = prescription.medication || ''
    const dose = prescription.dose || ''
    const duration = prescription.duration || ''

    const doc = w.document
    doc.open()
    // Write only the static skeleton (no interpolation).
    doc.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>إيصال صرف</title></head><body></body></html>')
    doc.close()

    const style = doc.createElement('style')
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; max-width: 380px; margin: auto; color: #1e293b; }
      .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { font-size: 18px; color: #dc2626; margin-bottom: 2px; }
      .header p { font-size: 11px; color: #64748b; }
      .info { margin-bottom: 16px; }
      .info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
      .info-row b { color: #475569; }
      .med-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; margin: 14px 0; text-align: center; }
      .med-box h2 { color: #166534; font-size: 16px; margin-bottom: 4px; }
      .med-box p { color: #15803d; font-size: 12px; }
      .footer { text-align: center; border-top: 2px dashed #cbd5e1; padding-top: 12px; margin-top: 16px; }
      .footer p { font-size: 10px; color: #94a3b8; }
      @media print { body { padding: 10px; } }
    `
    doc.head.appendChild(style)

    // Helper that builds elements safely with textContent.
    const el = (tag, className, text) => {
      const node = doc.createElement(tag)
      if (className) node.className = className
      if (text != null) node.textContent = text
      return node
    }
    const row = (label, value) => {
      const r = el('div', 'info-row')
      r.appendChild(el('span', null, label))
      r.appendChild(el('b', null, value))
      return r
    }

    const header = el('div', 'header')
    header.appendChild(el('h1', null, '⚕️ MedCore'))
    header.appendChild(el('p', null, 'إيصال صرف دواء'))
    header.appendChild(el('p', null, orgName))
    doc.body.appendChild(header)

    const info = el('div', 'info')
    info.appendChild(row('المريض', patName))
    info.appendChild(row('رقم الهوية', patId))
    info.appendChild(row('الطبيب', `د. ${docName}`))
    info.appendChild(row('تاريخ الصرف', date))
    doc.body.appendChild(info)

    const medBox = el('div', 'med-box')
    medBox.appendChild(el('h2', null, `✓ ${medication}`))
    medBox.appendChild(el('p', null, `الجرعة: ${dose} — المدة: ${duration}`))
    doc.body.appendChild(medBox)

    const footer = el('div', 'footer')
    footer.appendChild(el('p', null, 'هذا إيصال إلكتروني من نظام MedCore للسجل الطبي الموحد'))
    footer.appendChild(el('p', null, `تم الصرف بواسطة: ${dispensedBy}`))
    doc.body.appendChild(footer)

    setTimeout(() => { w.print() }, 300)
  }

  const handleUpdateRequest = async (e) => {
    e.preventDefault()
    try {
      setSubmittingEdit(true)
      await api.put(`/prescriptions/${editingRequest._id}`, { medication: editingRequest.medication, dose: editingRequest.dose, duration: editingRequest.duration })
      toast.success('تم تعديل الدواء بنجاح'); setEditingRequest(null); fetchRequests()
    } catch { toast.error('تعذر تعديل الدواء') }
    finally { setSubmittingEdit(false) }
  }

  const searchPatient = async (term) => {
    const q = (term || qrTerm).trim()
    if (!q) return toast.error('يرجى إدخال الرقم القومي أو مسح الـ QR')
    setIsSearching(true); setPatientInfo(null); setPrescriptions([])
    try {
      let patientId, patientData
      // Case 1: QR token (long string)
      if (q.length > 30) {
        const { data: qrData } = await api.post('/patients/verify-qr', { token: q })
        patientId = qrData.data._id || qrData.data.patient?._id
        patientData = qrData.data.patient || qrData.data
      }
      // Case 2: MongoDB ObjectId (exactly 24 hex chars)
      else if (/^[a-f0-9]{24}$/i.test(q)) {
        patientId = q
      }
      // Case 3: National ID or name search
      else {
        const { data: searchRes } = await api.get(`/patients?search=${encodeURIComponent(q)}&limit=1`)
        const patients = searchRes.data || searchRes.patients || []
        if (patients.length === 0) { toast.error('لم يتم العثور على مريض بهذا الرقم القومي أو الاسم'); setIsSearching(false); return }
        patientId = patients[0]._id
        patientData = patients[0]
      }
      // Fetch prescriptions
      const { data: presRes } = await api.get(`/prescriptions/${patientId}?limit=50`)
      setPrescriptions(presRes.data)
      if (patientData) { setPatientInfo(patientData) }
      else { const { data: pData } = await api.get(`/patients/${patientId}`); setPatientInfo(pData.data) }
      if (presRes.data.length === 0) toast.info('لا توجد روشتات مسجلة لهذا المريض')
    } catch (err) { toast.error(err.response?.data?.message || 'تعذر جلب بيانات المريض') }
    finally { setIsSearching(false) }
  }

  const handleSearch = (e) => { e?.preventDefault(); searchPatient() }

  const handleDispense = async (prescriptionId) => {
    try {
      setDispensingId(prescriptionId)
      await api.put(`/prescriptions/${prescriptionId}/dispense`)
      toast.success('تم صرف الدواء بنجاح')
      setPrescriptions(prev => prev.map(p => p._id === prescriptionId ? { ...p, status: 'dispensed' } : p))
      setIncomingRequests(prev => prev.filter(r => r._id !== prescriptionId))
      await fetchStats()
      if (activeTab === 'history') await fetchHistory()
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ أثناء الصرف'
      toast.error(msg)
      await fetchStats()
    }
    finally { setDispensingId(null) }
  }

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return incomingRequests
    const q = searchTerm.toLowerCase()
    return incomingRequests.filter(r => r.patientId?.fullName?.toLowerCase().includes(q) || r.patientId?.nationalId?.includes(q))
  }, [incomingRequests, searchTerm])

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return history
    const q = searchTerm.toLowerCase()
    return history.filter(h => h.patientId?.fullName?.toLowerCase().includes(q) || h.patientId?.nationalId?.includes(q))
  }, [history, searchTerm])

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0 min-h-screen dark:bg-slate-950 p-4 sm:p-8 transition-colors duration-300" dir="rtl">
      {!isProfileComplete && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-r-4 border-amber-500 p-3 sm:p-4 rounded-lg shadow-sm flex items-start gap-3">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <h3 className="text-amber-800 dark:text-amber-300 font-bold text-sm">بيانات الصيدلية غير مكتملة</h3>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">يرجى استكمال بيانات العنوان ومواعيد العمل.</p>
            <Link to="/profile" className="inline-block mt-2 text-xs font-bold text-amber-600 hover:text-amber-800 hover:underline">تحديث الملف الشخصي &larr;</Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">لوحة تحكم الصيدلية</h1>
        <p className="text-gray-500 dark:text-slate-400 text-xs sm:text-sm truncate">أهلاً بك، {user?.fullName}</p>
      </div>

      {/* Tab Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <button onClick={() => setActiveTab('requests')}
          className={`relative flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border-2 transition-all min-h-[120px] sm:min-h-[140px] ${activeTab === 'requests' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-lg shadow-blue-500/10' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:shadow-md hover:border-blue-200'}`}>
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2.5 sm:mb-3">
            <Inbox size={22} className="sm:hidden" /><Inbox size={26} className="hidden sm:block" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">الطلبات الواردة</p>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">من المرضى</p>
          {incomingRequests.length > 0 && (
            <span className="absolute top-2 left-2 sm:top-3 sm:left-3 min-w-[20px] h-5 flex items-center justify-center text-[10px] sm:text-xs bg-red-500 text-white px-1.5 rounded-full font-bold shadow-sm">{incomingRequests.length}</span>
          )}
        </button>

        <button onClick={() => setActiveTab('dispense')}
          className={`flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border-2 transition-all min-h-[120px] sm:min-h-[140px] ${activeTab === 'dispense' ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 shadow-lg shadow-indigo-500/10' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:shadow-md hover:border-indigo-200'}`}>
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2.5 sm:mb-3">
            <Pill size={22} className="sm:hidden" /><Pill size={26} className="hidden sm:block" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">نافذة الصرف</p>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">صرف الروشتات</p>
        </button>

        <button onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center text-center p-4 sm:p-6 rounded-2xl border-2 transition-all min-h-[120px] sm:min-h-[140px] ${activeTab === 'history' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 shadow-lg shadow-green-500/10' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:shadow-md hover:border-green-200'}`}>
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400 mb-2.5 sm:mb-3">
            <FileText size={22} className="sm:hidden" /><FileText size={26} className="hidden sm:block" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">سجل الصرف</p>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 mt-0.5">{loadingStats ? '-' : (stats.dispensed ?? stats.totalDispensed ?? 0)} إجمالي</p>
        </button>
      </div>

      {/* Charts */}
      <PharmacyCharts requests={incomingRequests} history={history} stats={stats} />

      {/* Search Bar — shared */}
      {(activeTab === 'requests' || activeTab === 'history') && (
        <div className="flex gap-2">
          <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم المريض أو رقمه القومي..." className="flex-1 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-sm h-9 sm:h-10" />
          {activeTab === 'requests' && (
            <Button variant="outline" onClick={fetchRequests} disabled={loadingRequests} className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm">
              {loadingRequests ? <Loader2 className="animate-spin h-4 w-4" /> : 'تحديث'}
            </Button>
          )}
        </div>
      )}

      {/* ═══════ REQUESTS TAB ═══════ */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {/* Bulk dispense toolbar */}
          {filteredRequests.length > 0 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-2.5 sm:p-3 border border-gray-200 dark:border-slate-800 shadow-sm">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-indigo-600 transition-colors">
                {selectedIds.size === filteredRequests.length && selectedIds.size > 0
                  ? <CheckSquare size={16} className="text-indigo-600" />
                  : <Square size={16} />}
                {selectedIds.size > 0 ? `محدد: ${selectedIds.size}` : 'تحديد الكل'}
              </button>
              {selectedIds.size > 0 && (
                <Button onClick={handleBulkDispense} disabled={bulkDispensing} size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 px-4 text-xs gap-1.5">
                  {bulkDispensing ? <Loader2 className="animate-spin w-3 h-3" /> : <><CheckCircle2 className="w-3.5 h-3.5" /> صرف {selectedIds.size} وصفة</>}
                </Button>
              )}
            </div>
          )}
          {loadingRequests ? (
            <div className="flex flex-col items-center py-12 text-gray-400"><Loader2 className="w-7 h-7 animate-spin text-blue-500 mb-3" /><p className="text-sm">جاري التحميل...</p></div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState 
              icon={Inbox} 
              title="لا توجد طلبات واردة حالياً" 
              description="لا يوجد أدوية بانتظار الصرف من قبل المرضى في الوقت الحالي." 
            />
          ) : filteredRequests.map(req => (
            <Card key={req._id} className={`border-blue-100 dark:border-blue-900/50 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${selectedIds.has(req._id) ? 'ring-2 ring-indigo-500 border-indigo-300' : ''}`}>
              <CardContent className="p-3 sm:p-5">
                {editingRequest?._id === req._id ? (
                  <form onSubmit={handleUpdateRequest} className="space-y-2">
                    <Input value={editingRequest.medication} onChange={e => setEditingRequest({...editingRequest, medication: e.target.value})} placeholder="اسم الدواء" required autoFocus className="text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={editingRequest.dose} onChange={e => setEditingRequest({...editingRequest, dose: e.target.value})} placeholder="الجرعة" required className="text-sm" />
                      <Input value={editingRequest.duration} onChange={e => setEditingRequest({...editingRequest, duration: e.target.value})} placeholder="المدة" required className="text-sm" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingRequest(null)}>إلغاء</Button>
                      <Button type="submit" size="sm" disabled={submittingEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {submittingEdit ? <Loader2 className="animate-spin w-3 h-3" /> : 'حفظ'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        {/* Bulk select checkbox */}
                        <button onClick={() => toggleSelect(req._id)} className="mt-1 shrink-0 text-gray-400 hover:text-indigo-600 transition-colors">
                          {selectedIds.has(req._id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                        </button>
                        <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-base text-blue-900 dark:text-blue-300">{req.medication}</h4>
                          <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold shrink-0">بانتظار الصرف</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mb-1 flex-wrap">
                          <UserIcon size={12} className="text-gray-400 dark:text-slate-500 shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">{req.patientId?.fullName || 'مريض'}</span>
                          <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">{req.patientId?.nationalId}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-slate-400">
                          <span><b className="text-gray-400 dark:text-slate-500">الجرعة:</b> {req.dose}</span>
                          <span><b className="text-gray-400 dark:text-slate-500">المدة:</b> {req.duration}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{new Date(req.updatedAt).toLocaleString('ar-EG')}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
                        <Button onClick={() => setEditingRequest(req)} variant="outline" size="sm" className="flex-1 sm:flex-initial text-blue-600 border-blue-200 hover:bg-blue-50 h-8 px-2 sm:px-3 text-xs">
                          <Edit className="w-3 h-3 ml-1" /> تعديل
                        </Button>
                        <Button onClick={() => handleDispense(req._id)} disabled={dispensingId === req._id} size="sm" className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white font-bold h-8 px-2 sm:px-3 text-xs">
                          {dispensingId === req._id ? <Loader2 className="animate-spin w-3 h-3" /> : <><CheckCircle2 className="w-3 h-3 ml-1" /> تأكيد</>}
                        </Button>
                      </div>
                    </div>
                    {/* Allergy warning in request card */}
                    {req.patientId?.allergies?.length > 0 && (
                      <div className="space-y-1.5">
                        {checkAllergyMatch(req.medication, req.patientId.allergies) && (
                          <div className="bg-red-700 text-white rounded-lg p-3 flex items-center gap-2 ring-2 ring-red-400 shadow-lg">
                            <AlertTriangle size={18} className="shrink-0 animate-bounce" />
                            <span className="text-xs font-black">⛔ خطر! الدواء "{req.medication}" قد يتعارض مع حساسية المريض: {checkAllergyMatch(req.medication, req.patientId.allergies).join(' • ')}</span>
                          </div>
                        )}
                        <div className="bg-red-600 text-white rounded-lg p-2.5 flex items-center gap-2">
                          <AlertTriangle size={16} className="shrink-0" />
                          <span className="text-xs font-bold overflow-hidden text-ellipsis">⚠️ حساسية: {Array.isArray(req.patientId.allergies) ? req.patientId.allergies.join(' • ') : req.patientId.allergies}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════ DISPENSE TAB ═══════ */}
      {activeTab === 'dispense' && (
        <div className="space-y-4">
          <Card className="border-2 border-indigo-100 dark:border-indigo-900/50 shadow-sm">
            <CardContent className="p-3 sm:p-5 space-y-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input value={qrTerm} onChange={e => setQrTerm(e.target.value)}
                  placeholder="ابحث بالرقم القومي أو الاسم أو كود المريض..." className="flex-1 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-sm h-9 sm:h-10" dir="rtl" autoFocus />
                <Button type="submit" disabled={isSearching} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm">
                  {isSearching ? <Loader2 className="animate-spin h-4 w-4" /> : <><Search className="ml-1.5 h-4 w-4" /> بحث</>}
                </Button>
              </form>
              <div className="flex justify-center">
                <Button type="button" variant="outline" onClick={() => setShowScanner(!showScanner)}
                  className={`text-xs sm:text-sm h-9 px-4 gap-2 ${showScanner ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' : 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}>
                  {showScanner ? <><X className="w-4 h-4" /> إغلاق الماسح</> : <><QrCode className="w-4 h-4" /> مسح QR Code</>}
                </Button>
              </div>
              {showScanner && (
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-inner overflow-hidden">
                  <div id="pharmacy-qr-reader" className="w-full"></div>
                </div>
              )}
            </CardContent>
          </Card>

          {patientInfo && (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0"><UserIcon size={20} /></div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-base text-gray-900 dark:text-white truncate">{patientInfo.fullName}</h2>
                      <p className="text-gray-500 dark:text-slate-400 text-xs text-left" dir="ltr">{patientInfo.nationalId || patientInfo._id}</p>
                    </div>
                  </div>
                </div>
                {/* Bug 3 fix: Prominent allergy warning */}
                {patientInfo.allergies?.length > 0 && (
                  <div className="bg-red-600 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <AlertTriangle size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm">⚠️ تحذير حساسية!</p>
                      <p className="text-red-100 text-xs font-semibold mt-0.5 break-words">
                        {Array.isArray(patientInfo.allergies) ? patientInfo.allergies.join(' • ') : patientInfo.allergies}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual Dispense */}
              <Card className="border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-900/10">
                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-bold text-green-800 dark:text-green-400 mb-2 text-xs sm:text-sm flex items-center gap-1.5"><Pill size={14} /> إضافة وصرف دواء يدوياً</h3>
                  {/* Responsive form: stacks on mobile, inline on desktop */}
                  <form onSubmit={handleManualDispense} className="flex flex-col sm:flex-row gap-2">
                    <Input value={manualMed.medication} onChange={e => setManualMed({...manualMed, medication: e.target.value})} placeholder="اسم الدواء" className="bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 sm:flex-[2] text-sm h-9" required />
                    <div className="flex gap-2">
                      <Input value={manualMed.dose} onChange={e => setManualMed({...manualMed, dose: e.target.value})} placeholder="الجرعة" className="bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 flex-1 text-sm h-9" required />
                      <Input value={manualMed.duration} onChange={e => setManualMed({...manualMed, duration: e.target.value})} placeholder="المدة" className="bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 flex-1 text-sm h-9" required />
                    </div>
                    <Button type="submit" disabled={manualSubmitting || (drugWarning && drugWarning.severity === 'Danger')} className="bg-green-600 hover:bg-green-700 text-white h-9 text-xs sm:text-sm sm:w-auto w-full">
                      {manualSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'صرف الآن'}
                    </Button>
                  </form>
                  {/* Drug interaction check status */}
                  {checkingDrug && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="font-medium">جاري فحص التعارض الدوائي...</span>
                    </div>
                  )}
                  {drugWarning && !checkingDrug && (
                    <div className={`mt-2 rounded-xl p-3 flex items-start gap-3 ${drugWarning.severity === 'Danger' ? 'bg-red-600 text-white' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${drugWarning.severity === 'Danger' ? 'bg-white/20' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                        <Shield size={16} className={drugWarning.severity === 'Danger' ? 'text-white' : 'text-amber-600 dark:text-amber-400'} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs ${drugWarning.severity === 'Danger' ? 'text-white' : 'text-amber-800 dark:text-amber-300'}`}>
                          {drugWarning.severity === 'Danger' ? '⛔ تحذير خطير!' : '⚠️ تحذير'}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${drugWarning.severity === 'Danger' ? 'text-red-100' : 'text-amber-700 dark:text-amber-400'}`}>
                          {drugWarning.message || drugWarning.details || 'تم رصد تعارض دوائي محتمل'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prescriptions List */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm sm:text-base"><Pill className="text-indigo-600 dark:text-indigo-400" size={18} /> قائمة الأدوية</h3>
                <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-gray-200 dark:border-slate-700">{prescriptions.length} أدوية</span>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {prescriptions.map(p => (
                  <Card key={p._id} className={`transition-colors ${p.status === 'dispensed' ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700' : 'bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
                    <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">{p.medication}</h4>
                          {p.status === 'dispensed' && (
                            <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-green-200 dark:border-green-800">
                              <CheckCircle2 size={10} /> تم الصرف
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-slate-400">
                          <span><b className="text-gray-700 dark:text-slate-300">الجرعة:</b> {p.dose}</span>
                          <span><b className="text-gray-700 dark:text-slate-300">المدة:</b> {p.duration}</span>
                          {p.doctorId && <span><b className="text-gray-700 dark:text-slate-300">الطبيب:</b> {p.doctorId.fullName}</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{new Date(p.createdAt).toLocaleDateString('ar-EG')}</p>
                        {p.status === 'pending' && patientInfo?.allergies?.length > 0 && checkAllergyMatch(p.medication, patientInfo.allergies) && (
                          <div className="bg-red-700 text-white rounded-lg p-2 mt-2 flex items-center gap-2 ring-2 ring-red-400 shadow-lg">
                            <AlertTriangle size={14} className="shrink-0 animate-bounce" />
                            <span className="text-[11px] font-black">⛔ خطر! "{p.medication}" قد يتعارض مع حساسية: {checkAllergyMatch(p.medication, patientInfo.allergies).join(' • ')}</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {p.status === 'pending' ? (
                          <Button onClick={() => handleDispense(p._id)} disabled={dispensingId === p._id} size="sm" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4 text-xs">
                            {dispensingId === p._id ? <Loader2 className="animate-spin w-3 h-3" /> : 'صرف الدواء'}
                          </Button>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button onClick={() => printReceipt(p)} variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 h-9 px-3 text-xs gap-1">
                              <Printer className="w-3 h-3" /> طباعة
                            </Button>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full self-center">
                              <CheckCircle2 size={10} /> مصروف
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ HISTORY TAB ═══════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'اليوم', value: stats.todayDispensed || 0, icon: Clock, color: 'blue', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400' },
              { label: 'هذا الأسبوع', value: stats.weeklyDispensed || 0, icon: TrendingUp, color: 'indigo', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', iconBg: 'bg-indigo-100 dark:bg-indigo-900/40', iconColor: 'text-indigo-600 dark:text-indigo-400' },
              { label: 'هذا الشهر', value: stats.monthlyDispensed || 0, icon: Calendar, color: 'purple', bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', iconBg: 'bg-purple-100 dark:bg-purple-900/40', iconColor: 'text-purple-600 dark:text-purple-400' },
              { label: 'إجمالي الصرف', value: stats.totalDispensed || stats.dispensed || 0, icon: Pill, color: 'green', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', iconBg: 'bg-green-100 dark:bg-green-900/40', iconColor: 'text-green-600 dark:text-green-400' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-slate-800`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                    <s.icon size={14} className={s.iconColor} />
                  </div>
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400">{s.label}</span>
                </div>
                <p className={`text-xl sm:text-2xl font-black ${s.text}`}>{loadingStats ? '-' : s.value}</p>
              </div>
            ))}
          </div>

          {/* Date Range Filter + Search */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                <label className="absolute -top-2 right-2 text-[9px] font-bold text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-950 px-1 z-10">من</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-sm h-9" />
              </div>
              <div className="relative flex-1">
                <label className="absolute -top-2 right-2 text-[9px] font-bold text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-950 px-1 z-10">إلى</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-sm h-9" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }} className="h-9 text-xs px-2 text-red-500 hover:text-red-700">
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="بحث باسم المريض..." className="flex-1 sm:w-48 bg-gray-50 dark:bg-slate-800 dark:border-slate-700 text-sm h-9" />
              <Button variant="outline" size="sm" onClick={() => fetchHistory(1)} disabled={loadingHistory} className="h-9 text-xs px-3">
                {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin" /> : 'تحديث'}
              </Button>
            </div>
          </div>

          {/* History List */}
          <Card className="border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-slate-900 px-3 sm:px-5 py-2.5 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white text-sm">سجل الصرف</h3>
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 font-medium">
                {historyTotal > 0 ? `${historyTotal} نتيجة — صفحة ${historyPage}/${historyTotalPages}` : ''}
              </span>
            </div>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="flex flex-col items-center py-12 text-gray-400"><Loader2 className="w-7 h-7 animate-spin text-indigo-500 mb-3" /><p className="text-sm">جاري تحميل السجل...</p></div>
              ) : filteredHistory.length === 0 ? (
                <EmptyState 
                  icon={FileText} 
                  title="لا يوجد سجل أدوية مصروفة" 
                  description={dateFrom || dateTo ? 'لا توجد نتائج في الفترة المحددة. جرب تغيير التواريخ.' : 'لم تقم بصرف أي أدوية حتى الآن.'} 
                />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredHistory.map(item => (
                    <div key={item._id} className="p-3 sm:px-5 sm:py-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base mb-0.5">{item.medication}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mb-1">
                            <UserIcon size={12} className="text-gray-400 dark:text-slate-500 shrink-0" />
                            <span className="font-medium truncate">{item.patientId?.fullName || 'مريض غير معروف'}</span>
                            <span className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono shrink-0">{item.patientId?.nationalId}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-slate-400">
                            <span><b className="text-gray-400 dark:text-slate-500">الجرعة:</b> {item.dose}</span>
                            <span><b className="text-gray-400 dark:text-slate-500">المدة:</b> {item.duration}</span>
                            {item.doctorId?.fullName && <span><b className="text-gray-400 dark:text-slate-500">الطبيب:</b> {item.doctorId.fullName}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => printReceipt(item)} className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors" title="طباعة إيصال">
                            <Printer size={14} />
                          </button>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> تم الصرف
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">{new Date(item.updatedAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            {historyTotalPages > 1 && (
              <div className="bg-gray-50 dark:bg-slate-900 px-3 sm:px-5 py-3 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
                <Button variant="outline" size="sm" disabled={historyPage <= 1 || loadingHistory}
                  onClick={() => { const p = historyPage - 1; setHistoryPage(p); fetchHistory(p) }}
                  className="h-8 px-3 text-xs gap-1">
                  <ChevronRight className="w-3.5 h-3.5" /> السابق
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(historyTotalPages, 5) }, (_, i) => {
                    let pageNum
                    if (historyTotalPages <= 5) { pageNum = i + 1 }
                    else if (historyPage <= 3) { pageNum = i + 1 }
                    else if (historyPage >= historyTotalPages - 2) { pageNum = historyTotalPages - 4 + i }
                    else { pageNum = historyPage - 2 + i }
                    return (
                      <button key={pageNum} onClick={() => { setHistoryPage(pageNum); fetchHistory(pageNum) }}
                        disabled={loadingHistory}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          pageNum === historyPage
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}>
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button variant="outline" size="sm" disabled={historyPage >= historyTotalPages || loadingHistory}
                  onClick={() => { const p = historyPage + 1; setHistoryPage(p); fetchHistory(p) }}
                  className="h-8 px-3 text-xs gap-1">
                  التالي <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
