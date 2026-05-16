import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Input } from '@/components/ui/input.jsx'
import { FieldGroup, FieldLabel } from '@/components/ui/field.jsx'
import { Users, Building2, BarChart3, Activity, Plus, ShieldCheck, Loader2, CheckCircle, XCircle, FileText, Copy, X, Trash2, Edit, Eye, Calendar, Pill, AlertTriangle, FlaskConical, Settings, Lock, UserCog } from 'lucide-react'
import api from '@/services/api.js'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext.jsx'
import ViewUserModal from '@/components/admin/ViewUserModal.jsx'
import EditUserModal from '@/components/admin/EditUserModal.jsx'
import ViewOrgModal from '@/components/admin/ViewOrgModal.jsx'
import EditOrgModal from '@/components/admin/EditOrgModal.jsx'
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx'
import { getImageUrl } from '@/utils/getImageUrl.js'
import EmptyState from '@/components/ui/EmptyState.jsx'
import AdminCharts from '@/components/admin/AdminCharts.jsx'
import { Pagination, StatCard } from '@/components/admin/AdminCommon.jsx'
import AddUserModal from '@/components/admin/AddUserModal.jsx'
import AddOrgModal from '@/components/admin/AddOrgModal.jsx'
import AddSubAdminModal from '@/components/admin/AddSubAdminModal.jsx'
import { SettingSection, SettingToggle } from '@/components/admin/SettingsBlocks.jsx'
import ApprovalsTab from '@/components/admin/ApprovalsTab.jsx'
import ActivityTab from '@/components/admin/ActivityTab.jsx'
import SubAdminsTab from '@/components/admin/SubAdminsTab.jsx'
import SettingsTab from '@/components/admin/SettingsTab.jsx'
import { roleLabels, typeLabels, apptStatusLabels, apptStatusColors } from '@/components/admin/AdminLabels.js'
import { usePageTitle } from '@/hooks/usePageTitle.js'

export default function AdminPage() {
  usePageTitle('لوحة الإدارة')
  const { user: authUser } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')

  // Modals state
  const [viewingUser, setViewingUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [viewingOrg, setViewingOrg] = useState(null)
  const [editingOrg, setEditingOrg] = useState(null)

  // ===== Stats =====
  const [stats, setStats] = useState(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // ===== Users =====
  const [users, setUsers] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersRoleFilter, setUsersRoleFilter] = useState('')
  const [usersStatusFilter, setUsersStatusFilter] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())

  // ===== Pending (Approvals) =====
  const [pendingUsers, setPendingUsers] = useState([])
  const [pendingOrgs, setPendingOrgs] = useState([])
  const [isLoadingPending, setIsLoadingPending] = useState(false)

  // ===== Organizations =====
  const [organizations, setOrganizations] = useState([])
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false)
  const [showAddOrg, setShowAddOrg] = useState(false)
  const [orgsSearch, setOrgsSearch] = useState('')
  const [orgsTypeFilter, setOrgsTypeFilter] = useState('')
  const [orgsStatusFilter, setOrgsStatusFilter] = useState('')
  const [orgsPage, setOrgsPage] = useState(1)
  const [orgsTotalPages, setOrgsTotalPages] = useState(1)
  const [orgsTotal, setOrgsTotal] = useState(0)
  const [selectedOrgIds, setSelectedOrgIds] = useState(new Set())

  // ===== Appointments =====
  const [appointments, setAppointments] = useState([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false)

  // ===== Activity Log =====
  const [activities, setActivities] = useState([])
  const [isLoadingActivity, setIsLoadingActivity] = useState(false)

  // ===== Confirm Dialog =====
  const [confirmState, setConfirmState] = useState({ isOpen: false })
  const closeConfirm = () => setConfirmState({ isOpen: false })
  const openConfirm = (config) => setConfirmState({ isOpen: true, ...config })

  // ===== System Settings =====
  const [settings, setSettings] = useState(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // ===== Sub-Admins =====
  const [subAdmins, setSubAdmins] = useState([])
  const [isLoadingSubAdmins, setIsLoadingSubAdmins] = useState(false)
  const [showAddSubAdmin, setShowAddSubAdmin] = useState(false)

  // ===== جلب البيانات عند فتح التبويب =====
  useEffect(() => {
    fetchStats()
    fetchPendingUsers()
    fetchPendingOrgs()
  }, [location.pathname])

  // Tab change → load that tab's data on first visit. The fetchers below
  // read filter / page state via closure (always current at call time), so
  // intentionally keying only on `activeTab` is correct: search-driven and
  // pagination-driven refetches are handled by the dedicated effects.
  // Removing this disable would force every fetcher into useCallback, which
  // is a larger refactor — track in a follow-up.
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) fetchUsers()
    if (activeTab === 'organizations' && organizations.length === 0) fetchOrganizations()
    if (activeTab === 'activity' && activities.length === 0) fetchActivityLog()
    if (activeTab === 'appointments' && appointments.length === 0) fetchAppointments()
    if (activeTab === 'settings' && !settings) fetchSettings()
    if (activeTab === 'sub-admins' && subAdmins.length === 0) fetchSubAdmins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Debounced search for users
  useEffect(() => {
    if (activeTab !== 'users') return
    const t = setTimeout(() => {
      setUsersPage(1)
      fetchUsers({ page: 1 })
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersSearch, usersRoleFilter, usersStatusFilter])

  // Page change for users
  useEffect(() => {
    if (activeTab !== 'users') return
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersPage])

  // Debounced search for organizations
  useEffect(() => {
    if (activeTab !== 'organizations') return
    const t = setTimeout(() => {
      setOrgsPage(1)
      fetchOrganizations({ page: 1 })
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgsSearch, orgsTypeFilter, orgsStatusFilter])

  useEffect(() => {
    if (activeTab !== 'organizations') return
    fetchOrganizations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgsPage])

  // ============================================================
  //  API Calls
  // ============================================================

  const fetchStats = async () => {
    setIsLoadingStats(true)
    try {
      const { data } = await api.get('/admin/stats')
      setStats(data.data)
    } catch { toast.error('فشل جلب إحصائيات المنصة') }
    finally { setIsLoadingStats(false) }
  }

  const fetchUsers = async (overrides = {}) => {
    setIsLoadingUsers(true)
    try {
      const params = {
        page: overrides.page ?? usersPage,
        limit: 20,
      }
      const search = overrides.search ?? usersSearch
      const role = overrides.role ?? usersRoleFilter
      const status = overrides.status ?? usersStatusFilter
      if (search.trim()) params.search = search.trim()
      if (role) params.role = role
      if (status) params.status = status
      const { data } = await api.get('/admin/users', { params })
      setUsers(data.data || [])
      setUsersTotal(data.total || 0)
      setUsersTotalPages(data.totalPages || 1)
    } catch { toast.error('فشل جلب قائمة المستخدمين') }
    finally { setIsLoadingUsers(false) }
  }

  const fetchPendingUsers = async () => {
    setIsLoadingPending(true)
    try {
      const { data } = await api.get('/admin/users/pending')
      setPendingUsers(data.data || [])
    } catch { toast.error('فشل جلب قائمة المستخدمين المعلقين') }
    finally { setIsLoadingPending(false) }
  }

  const fetchPendingOrgs = async () => {
    setIsLoadingPending(true)
    try {
      const { data } = await api.get('/admin/pending-organizations')
      setPendingOrgs(data.data || [])
    } catch { toast.error('فشل جلب قائمة المنظمات المعلقة') }
    finally { setIsLoadingPending(false) }
  }

  const fetchOrganizations = async (overrides = {}) => {
    setIsLoadingOrgs(true)
    try {
      const params = {
        page: overrides.page ?? orgsPage,
        limit: 20,
      }
      const search = overrides.search ?? orgsSearch
      const type = overrides.type ?? orgsTypeFilter
      const status = overrides.status ?? orgsStatusFilter
      if (search.trim()) params.search = search.trim()
      if (type) params.type = type
      if (status) params.status = status
      const { data } = await api.get('/admin/organizations', { params })
      setOrganizations(data.data || [])
      setOrgsTotal(data.total || 0)
      setOrgsTotalPages(data.totalPages || 1)
    } catch { toast.error('فشل جلب قائمة المنظمات') }
    finally { setIsLoadingOrgs(false) }
  }

  const fetchActivityLog = async () => {
    setIsLoadingActivity(true)
    try {
      const { data } = await api.get('/admin/activity-log')
      setActivities(data.data || [])
    } catch { toast.error('فشل جلب سجل النشاط') }
    finally { setIsLoadingActivity(false) }
  }

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true)
    try {
      const { data } = await api.get('/appointments')
      setAppointments(data.data || [])
    } catch { toast.error('فشل جلب المواعيد') }
    finally { setIsLoadingAppointments(false) }
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status })
      toast.success(status === 'active' ? 'تم قبول الحساب بنجاح' : 'تم رفض الحساب')
      setPendingUsers(prev => prev.filter(u => u._id !== id))
      fetchStats() // تحديث الإحصائيات
    } catch { toast.error('حدث خطأ أثناء تحديث حالة الحساب') }
  }

  const handleApproveOrg = async (id) => {
    try {
      await api.put(`/admin/approve-organization/${id}`)
      toast.success('تم اعتماد المنظمة بنجاح')
      setPendingOrgs(prev => prev.filter(o => o._id !== id))
      fetchStats()
    } catch { toast.error('فشل في اعتماد المنظمة') }
  }

  const handleDeleteUser = (user) => {
    if (user._id === authUser?.id) {
      toast.error('لا يمكنك حذف حسابك الخاص')
      return
    }
    openConfirm({
      title: 'حذف مستخدم',
      description: <>سيتم حذف <strong>{user.fullName}</strong> نهائياً مع كل بياناته المرتبطة. هذه العملية لا يمكن التراجع عنها.</>,
      confirmLabel: 'حذف نهائي',
      cancelLabel: 'إلغاء',
      variant: 'danger',
      typedConfirmation: 'DELETE',
      onConfirm: async () => {
        try {
          setConfirmState(s => ({ ...s, loading: true }))
          await api.delete(`/admin/user/${user._id}`)
          toast.success('تم حذف المستخدم بنجاح')
          setUsers(prev => prev.filter(u => u._id !== user._id))
          fetchStats()
          closeConfirm()
        } catch (err) {
          toast.error(err.response?.data?.message || 'فشل في عملية الحذف')
          setConfirmState(s => ({ ...s, loading: false }))
        }
      },
    })
  }

  const handleDeleteOrg = (org) => {
    openConfirm({
      title: 'حذف منظمة',
      description: <>سيتم حذف <strong>{org.name}</strong> نهائياً. هذه العملية لا يمكن التراجع عنها.</>,
      confirmLabel: 'حذف نهائي',
      cancelLabel: 'إلغاء',
      variant: 'danger',
      typedConfirmation: 'DELETE',
      onConfirm: async () => {
        try {
          setConfirmState(s => ({ ...s, loading: true }))
          await api.delete(`/admin/organization/${org._id}`)
          toast.success('تم حذف المنظمة بنجاح')
          setOrganizations(prev => prev.filter(o => o._id !== org._id))
          setPendingOrgs(prev => prev.filter(o => o._id !== org._id))
          fetchStats()
          closeConfirm()
        } catch (err) {
          toast.error(err.response?.data?.message || 'فشل في عملية الحذف')
          setConfirmState(s => ({ ...s, loading: false }))
        }
      },
    })
  }

  const handleClearLogs = () => {
    openConfirm({
      title: 'مسح سجل النشاط',
      description: 'سيتم مسح كافة سجلات النشاط نهائياً. هذه الخطوة لا يمكن التراجع عنها وقد تؤثر على إمكانية التتبع.',
      confirmLabel: 'مسح السجلات',
      cancelLabel: 'إلغاء',
      variant: 'warning',
      typedConfirmation: 'CLEAR LOGS',
      onConfirm: async () => {
        try {
          setConfirmState(s => ({ ...s, loading: true }))
          await api.delete('/admin/activity-log')
          toast.success('تم مسح السجلات بنجاح')
          setActivities([])
          closeConfirm()
        } catch (err) {
          toast.error(err.response?.data?.message || 'فشل في عملية المسح')
          setConfirmState(s => ({ ...s, loading: false }))
        }
      },
    })
  }

  // ===== Bulk Actions =====
  const toggleUserSelection = (id) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAllUsers = () => {
    setSelectedUserIds(prev => {
      // exclude self from selection-all
      const eligibleIds = users.filter(u => u._id !== authUser?.id).map(u => u._id)
      if (eligibleIds.every(id => prev.has(id))) return new Set()
      return new Set(eligibleIds)
    })
  }

  const toggleOrgSelection = (id) => {
    setSelectedOrgIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAllOrgs = () => {
    setSelectedOrgIds(prev => {
      const allIds = organizations.map(o => o._id)
      if (allIds.every(id => prev.has(id))) return new Set()
      return new Set(allIds)
    })
  }

  const handleBulkUserStatus = (status) => {
    const ids = Array.from(selectedUserIds)
    if (ids.length === 0) return
    const labels = { active: 'تفعيل', rejected: 'رفض', suspended: 'إيقاف', pending: 'إعادة تعليق' }
    openConfirm({
      title: `${labels[status]} ${ids.length} مستخدم`,
      description: `سيتم تطبيق العملية على ${ids.length} حساب. تأكد من اختيارك قبل المتابعة.`,
      confirmLabel: labels[status],
      variant: status === 'active' ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          setConfirmState(s => ({ ...s, loading: true }))
          const { data } = await api.post('/admin/users/bulk-status', { ids, status })
          toast.success(data.message || `تم التحديث`)
          setSelectedUserIds(new Set())
          fetchUsers()
          fetchStats()
          closeConfirm()
        } catch (err) {
          toast.error(err.response?.data?.message || 'فشل التحديث الجماعي')
          setConfirmState(s => ({ ...s, loading: false }))
        }
      },
    })
  }

  const handleBulkUserDelete = () => {
    const ids = Array.from(selectedUserIds)
    if (ids.length === 0) return
    openConfirm({
      title: `حذف ${ids.length} مستخدم`,
      description: 'سيتم حذف الحسابات المحددة نهائياً مع كل بياناتها. هذه العملية لا يمكن التراجع عنها.',
      confirmLabel: 'حذف نهائي',
      variant: 'danger',
      typedConfirmation: 'BULK DELETE',
      onConfirm: async () => {
        try {
          setConfirmState(s => ({ ...s, loading: true }))
          const { data } = await api.post('/admin/users/bulk-delete', { ids })
          toast.success(data.message || 'تم الحذف')
          setSelectedUserIds(new Set())
          fetchUsers()
          fetchStats()
          closeConfirm()
        } catch (err) {
          toast.error(err.response?.data?.message || 'فشل الحذف الجماعي')
          setConfirmState(s => ({ ...s, loading: false }))
        }
      },
    })
  }

  const handleBulkOrgStatus = (status) => {
    const ids = Array.from(selectedOrgIds)
    if (ids.length === 0) return
    const labels = { active: 'تفعيل', rejected: 'رفض', suspended: 'إيقاف' }
    openConfirm({
      title: `${labels[status]} ${ids.length} منظمة`,
      description: `سيتم تطبيق العملية على ${ids.length} منظمة.`,
      confirmLabel: labels[status],
      variant: status === 'active' ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          setConfirmState(s => ({ ...s, loading: true }))
          const { data } = await api.post('/admin/organizations/bulk-status', { ids, status })
          toast.success(data.message || 'تم التحديث')
          setSelectedOrgIds(new Set())
          fetchOrganizations()
          fetchStats()
          closeConfirm()
        } catch (err) {
          toast.error(err.response?.data?.message || 'فشل التحديث الجماعي')
          setConfirmState(s => ({ ...s, loading: false }))
        }
      },
    })
  }

  // ===== CSV Export =====
  const downloadCsv = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportUsers = async () => {
    try {
      const params = {}
      if (usersRoleFilter) params.role = usersRoleFilter
      if (usersStatusFilter) params.status = usersStatusFilter
      const res = await api.get('/admin/export/users', { params, responseType: 'blob' })
      downloadCsv(res.data, `users-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('تم تصدير المستخدمين')
    } catch {
      toast.error('فشل تصدير المستخدمين')
    }
  }

  const handleExportOrgs = async () => {
    try {
      const params = {}
      if (orgsTypeFilter) params.type = orgsTypeFilter
      if (orgsStatusFilter) params.status = orgsStatusFilter
      const res = await api.get('/admin/export/organizations', { params, responseType: 'blob' })
      downloadCsv(res.data, `organizations-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('تم تصدير المنظمات')
    } catch {
      toast.error('فشل تصدير المنظمات')
    }
  }

  // ===== Settings & Sub-Admins fetch =====
  const fetchSettings = async () => {
    setIsLoadingSettings(true)
    try {
      const { data } = await api.get('/admin/settings')
      setSettings(data.data)
    } catch { toast.error('فشل جلب إعدادات النظام') }
    finally { setIsLoadingSettings(false) }
  }

  const handleSaveSettings = async (patch) => {
    try {
      setSavingSettings(true)
      const { data } = await api.put('/admin/settings', patch)
      setSettings(data.data)
      toast.success('تم حفظ الإعدادات')
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل حفظ الإعدادات')
    } finally {
      setSavingSettings(false)
    }
  }

  const fetchSubAdmins = async () => {
    setIsLoadingSubAdmins(true)
    try {
      const { data } = await api.get('/admin/sub-admins')
      setSubAdmins(data.data || [])
    } catch { toast.error('فشل جلب المدراء') }
    finally { setIsLoadingSubAdmins(false) }
  }

  const handleRemoveSubAdmin = (admin) => {
    openConfirm({
      title: 'حذف مدير مساعد',
      description: <>سيتم سحب صلاحيات الإدارة من <strong>{admin.fullName}</strong> نهائياً.</>,
      confirmLabel: 'حذف',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setConfirmState(s => ({ ...s, loading: true }))
          await api.delete(`/admin/sub-admins/${admin._id}`)
          toast.success('تم الحذف')
          setSubAdmins(prev => prev.filter(a => a._id !== admin._id))
          closeConfirm()
        } catch (err) {
          toast.error(err.response?.data?.message || 'فشل الحذف')
          setConfirmState(s => ({ ...s, loading: false }))
        }
      },
    })
  }

  const handleUpdateAppointmentStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      toast.success('تم تحديث حالة الموعد');
      fetchAppointments();
    } catch (err) { toast.error(err.response?.data?.message || 'تعذر تحديث الحالة'); }
  }

  // ============================================================
  //  Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2 text-foreground">تحليلات المنصة</h1>
          <p className="text-muted-foreground text-sm">مراقبة نشاط منصة UMR ومقاييسها</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {isLoadingStats ? (
            <div className="col-span-full flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
          ) : stats ? (
            <>
              <StatCard icon={Users}      color="blue"   value={stats.totalUsers}       label="إجمالي المستخدمين" />
              <StatCard icon={Users}      color="green"  value={stats.activePatients}   label="المرضى النشطون" />
              <StatCard icon={Users}      color="purple" value={stats.activeDoctors}    label="الأطباء النشطون" />
              <StatCard icon={Building2}  color="indigo" value={stats.activeHospitals}  label="المستشفيات" />
              <StatCard icon={FlaskConical} color="teal" value={stats.activeLabs}       label="المختبرات" />
              <StatCard icon={Pill}       color="rose"   value={stats.activePharmacies} label="الصيدليات" />
            </>
          ) : null}
        </div>

        {/* Chart */}
        <AdminCharts stats={stats} users={users} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 h-auto gap-1">
            <TabsTrigger value="overview"      className="flex items-center gap-2 py-2"><BarChart3 className="h-4 w-4"  /><span className="hidden sm:inline">نظرة عامة</span></TabsTrigger>
            <TabsTrigger value="approvals"     className="flex items-center gap-2 py-2"><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline text-purple-700 font-bold">الاعتمادات{(pendingUsers.length + pendingOrgs.length) > 0 && ` (${pendingUsers.length + pendingOrgs.length})`}</span></TabsTrigger>
            <TabsTrigger value="appointments"  className="flex items-center gap-2 py-2"><Calendar className="h-4 w-4"    /><span className="hidden sm:inline">المواعيد</span></TabsTrigger>
            <TabsTrigger value="users"         className="flex items-center gap-2 py-2"><Users className="h-4 w-4"     /><span className="hidden sm:inline">المستخدمون</span></TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2 py-2"><Building2 className="h-4 w-4" /><span className="hidden sm:inline">المنظمات</span></TabsTrigger>
            <TabsTrigger value="activity"      className="flex items-center gap-2 py-2"><Activity className="h-4 w-4"  /><span className="hidden sm:inline">النشاط</span></TabsTrigger>
            {authUser?.role === 'super_admin' && (
              <>
                <TabsTrigger value="sub-admins" className="flex items-center gap-2 py-2"><UserCog className="h-4 w-4" /><span className="hidden sm:inline">المدراء</span></TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 py-2"><Settings className="h-4 w-4" /><span className="hidden sm:inline">الإعدادات</span></TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ==================== Overview ==================== */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" /> النشاط الزمني</CardTitle>
                  <CardDescription>إحصائيات لحظية عن نشاط المنصة</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingStats ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                  ) : stats ? (
                    <div className="space-y-3">
                      {[
                        { label: 'مواعيد اليوم', value: stats.appointmentsToday, color: 'text-blue-600' },
                        { label: 'مواعيد الأسبوع', value: stats.appointmentsThisWeek, color: 'text-indigo-600' },
                        { label: 'روشتات الشهر', value: stats.prescriptionsThisMonth, color: 'text-purple-600' },
                        { label: 'تحاليل الشهر', value: stats.labsThisMonth, color: 'text-teal-600' },
                        { label: 'مستخدمون جدد (الشهر)', value: stats.newUsersThisMonth, color: 'text-green-600' },
                      ].map(({ label, value, color }, i, arr) => (
                        <div key={i} className={`flex justify-between items-center pb-3 ${i < arr.length - 1 ? 'border-b dark:border-slate-800' : ''}`}>
                          <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
                          <span className={`font-bold text-lg ${color}`}>{typeof value === 'number' ? value.toLocaleString('ar-EG') : '—'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> ينتظر إجراء</CardTitle>
                  <CardDescription>طلبات وحسابات تحتاج مراجعة الأدمن</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors" onClick={() => setActiveTab('approvals')}>
                        <div>
                          <p className="font-bold text-yellow-900 dark:text-yellow-300">حسابات أفراد معلقة</p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">مرضى أو أطباء بحاجة للاعتماد</p>
                        </div>
                        <span className="text-2xl font-black text-yellow-700 dark:text-yellow-400">{stats.pendingUsers ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors" onClick={() => setActiveTab('approvals')}>
                        <div>
                          <p className="font-bold text-orange-900 dark:text-orange-300">منظمات معلقة</p>
                          <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">مستشفيات/مختبرات/صيدليات</p>
                        </div>
                        <span className="text-2xl font-black text-orange-700 dark:text-orange-400">{stats.pendingOrganizations ?? 0}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-slate-200">إجمالي المنظمات</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">جميع المنظمات المسجلة</p>
                        </div>
                        <span className="text-2xl font-black text-gray-700 dark:text-slate-300">{stats.totalOrganizations ?? 0}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8">لا توجد بيانات</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ==================== Appointments ==================== */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>كل المواعيد</CardTitle>
                <CardDescription>إشراف وتعديل حالات الحجوزات كأدمن</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAppointments ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                ) : appointments.length === 0 ? (
                  <EmptyState 
                    icon={Calendar} 
                    title="لا توجد مواعيد مسجلة" 
                    description="لا توجد أي مواعيد محجوزة في النظام حالياً." 
                  />
                ) : (
                  <div className="space-y-4">
                    {appointments.map((apt) => {
                      const status = apt.status || 'Pending'
                      const provider = apt.doctorId?.fullName ? `د. ${apt.doctorId.fullName}`
                        : apt.hospitalId?.name ? `مستشفى ${apt.hospitalId.name}`
                        : apt.labId?.name ? `معمل ${apt.labId.name}`
                        : apt.doctor?.fullName ? `د. ${apt.doctor.fullName}`
                        : apt.hospital?.name ? `مستشفى ${apt.hospital.name}`
                        : apt.lab?.name ? `معمل ${apt.lab.name}`
                        : 'غير متوفر'
                      const patientName = apt.patientId?.fullName || apt.patient?.fullName || 'مريض عبر النظام'
                      return (
                        <div key={apt._id} className="border dark:border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">مريض: {patientName}</h3>
                            <p className="text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 inline-block px-2 py-1 rounded mt-1 border dark:border-slate-700">مزود الخدمة: {provider}</p>
                            <p className="text-sm mt-2 text-gray-600 dark:text-slate-400">
                              التاريخ: {apt.date ? new Date(apt.date).toLocaleDateString('en-CA').replace(/-/g, '/') : '—'} — الساعة {apt.time || '—'}
                            </p>
                          </div>
                          <div className="flex flex-col items-start md:items-end gap-2 shrink-0 border-r dark:border-slate-700 pr-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${apptStatusColors[status] || apptStatusColors.Pending}`}>
                              {apptStatusLabels[status] || status}
                            </span>
                            <div className="flex gap-2 w-full mt-2">
                              {status === 'Pending' && (
                                <>
                                  <Button size="sm" className="h-8 text-xs flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateAppointmentStatus(apt._id, 'Confirmed')}>قبول</Button>
                                  <Button size="sm" variant="destructive" className="h-8 text-xs flex-1" onClick={() => handleUpdateAppointmentStatus(apt._id, 'Cancelled')}>إلغاء</Button>
                                </>
                              )}
                              {status === 'Confirmed' && (
                                <Button size="sm" className="h-8 text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleUpdateAppointmentStatus(apt._id, 'Completed')}>اكتمل</Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Approvals ==================== */}
          <TabsContent value="approvals">
            <ApprovalsTab
              pendingUsers={pendingUsers}
              pendingOrgs={pendingOrgs}
              isLoadingPending={isLoadingPending}
              handleUpdateStatus={handleUpdateStatus}
              handleApproveOrg={handleApproveOrg}
              handleDeleteOrg={handleDeleteOrg}
            />
          </TabsContent>

          {/* ==================== Users ==================== */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>إدارة المستخدمين</CardTitle>
                  <CardDescription>الإجمالي: <span className="font-bold text-blue-600">{usersTotal.toLocaleString('ar-EG')}</span> مستخدم</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleExportUsers} disabled={usersTotal === 0}>
                    <FileText className="h-4 w-4" /> تصدير CSV
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => setShowAddUser(true)}><Plus className="h-4 w-4" />إضافة مستخدم</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <Input
                      type="search"
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      placeholder="ابحث بالاسم، الإيميل، الرقم القومي، الهاتف..."
                      className="pr-10"
                    />
                    <Eye className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                  <select
                    value={usersRoleFilter}
                    onChange={(e) => setUsersRoleFilter(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">كل الأدوار</option>
                    <option value="patient">مرضى</option>
                    <option value="doctor">أطباء</option>
                  </select>
                  <select
                    value={usersStatusFilter}
                    onChange={(e) => setUsersStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="pending">معلق</option>
                    <option value="rejected">مرفوض</option>
                    <option value="suspended">موقوف</option>
                  </select>
                  {(usersSearch || usersRoleFilter || usersStatusFilter) && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setUsersSearch('')
                      setUsersRoleFilter('')
                      setUsersStatusFilter('')
                    }} className="gap-1">
                      <X size={14} /> مسح
                    </Button>
                  )}
                </div>

                {/* Bulk Actions Bar */}
                {selectedUserIds.size > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                      تم تحديد <span className="font-black">{selectedUserIds.size}</span> مستخدم
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => handleBulkUserStatus('active')}>
                        <CheckCircle size={14} /> تفعيل
                      </Button>
                      <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-50 gap-1" onClick={() => handleBulkUserStatus('suspended')}>
                        إيقاف
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={() => handleBulkUserStatus('rejected')}>
                        <XCircle size={14} /> رفض
                      </Button>
                      {authUser?.role === 'super_admin' && (
                        <Button size="sm" variant="destructive" className="gap-1" onClick={handleBulkUserDelete}>
                          <Trash2 size={14} /> حذف
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())}>
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                {isLoadingUsers ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                ) : users.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="لا يوجد مستخدمون مسجلون بعد"
                    description="النظام لا يحتوي على أي مستخدمين حالياً."
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Select all */}
                    <div className="flex items-center gap-2 px-2">
                      <input
                        type="checkbox"
                        checked={users.length > 0 && users.filter(u => u._id !== authUser?.id).every(u => selectedUserIds.has(u._id))}
                        onChange={toggleSelectAllUsers}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                        title="تحديد الكل"
                      />
                      <span className="text-xs text-gray-500 dark:text-slate-400">تحديد الكل في هذه الصفحة</span>
                    </div>
                    {users.map((u) => (
                      <div key={u._id} className={`border rounded-lg p-4 hover:shadow-sm transition-all ${selectedUserIds.has(u._id) ? 'ring-2 ring-blue-500/40 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(u._id)}
                            onChange={() => toggleUserSelection(u._id)}
                            disabled={u._id === authUser?.id}
                            title={u._id === authUser?.id ? 'لا يمكنك اختيار نفسك' : ''}
                            className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                          <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{u.fullName}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                              u.status === 'active' ? 'bg-green-100 text-green-700' :
                              u.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>{u.status === 'active' ? 'نشط' : u.status === 'pending' ? 'معلق' : 'مرفوض'}</span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                              {roleLabels[u.role] || u.role}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{u.email}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mb-4">
                          <span>الهاتف: {u.phoneNumber}</span>
                          <span>الرقم القومي: {u.nationalId}</span>
                          <span>تاريخ الانضمام: {new Date(u.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-3">
                          <Button variant="outline" size="sm" onClick={() => setViewingUser(u)}><Eye className="h-4 w-4 ml-1" /> التفاصيل</Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}><Edit className="h-4 w-4 ml-1" /> تعديل</Button>
                          {authUser?.role === 'super_admin' && u._id !== authUser?.id && (
                            <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDeleteUser(u)}><Trash2 className="h-4 w-4 ml-1" /> حذف</Button>
                          )}
                        </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {!isLoadingUsers && usersTotalPages > 1 && (
                  <Pagination
                    page={usersPage}
                    totalPages={usersTotalPages}
                    onChange={setUsersPage}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Organizations ==================== */}
          <TabsContent value="organizations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>المنظمات</CardTitle>
                  <CardDescription>الإجمالي: <span className="font-bold text-blue-600">{orgsTotal.toLocaleString('ar-EG')}</span> منظمة</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleExportOrgs} disabled={orgsTotal === 0}>
                    <FileText className="h-4 w-4" /> تصدير CSV
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => setShowAddOrg(true)}><Plus className="h-4 w-4" />إضافة منظمة</Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <Input
                      type="search"
                      value={orgsSearch}
                      onChange={(e) => setOrgsSearch(e.target.value)}
                      placeholder="ابحث بالاسم، الإيميل، رقم التسجيل، المدينة..."
                      className="pr-10"
                    />
                    <Eye className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                  <select
                    value={orgsTypeFilter}
                    onChange={(e) => setOrgsTypeFilter(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">كل الأنواع</option>
                    <option value="hospital">مستشفيات</option>
                    <option value="lab">مختبرات</option>
                    <option value="pharmacy">صيدليات</option>
                  </select>
                  <select
                    value={orgsStatusFilter}
                    onChange={(e) => setOrgsStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="pending">معلق</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                  {(orgsSearch || orgsTypeFilter || orgsStatusFilter) && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setOrgsSearch('')
                      setOrgsTypeFilter('')
                      setOrgsStatusFilter('')
                    }} className="gap-1">
                      <X size={14} /> مسح
                    </Button>
                  )}
                </div>

                {/* Bulk Actions Bar */}
                {selectedOrgIds.size > 0 && (
                  <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-300">
                      تم تحديد <span className="font-black">{selectedOrgIds.size}</span> منظمة
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => handleBulkOrgStatus('active')}>
                        <CheckCircle size={14} /> تفعيل
                      </Button>
                      <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 gap-1" onClick={() => handleBulkOrgStatus('suspended')}>
                        إيقاف
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 gap-1" onClick={() => handleBulkOrgStatus('rejected')}>
                        <XCircle size={14} /> رفض
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedOrgIds(new Set())}>
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                {isLoadingOrgs ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                ) : organizations.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="لا توجد منظمات مسجلة بعد"
                    description="النظام لا يحتوي على أي مستشفيات أو مختبرات."
                  />
                ) : (
                  <div className="space-y-4">
                    {/* Select all */}
                    <div className="flex items-center gap-2 px-2">
                      <input
                        type="checkbox"
                        checked={organizations.length > 0 && organizations.every(o => selectedOrgIds.has(o._id))}
                        onChange={toggleSelectAllOrgs}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                        title="تحديد الكل"
                      />
                      <span className="text-xs text-gray-500 dark:text-slate-400">تحديد الكل في هذه الصفحة</span>
                    </div>
                    {organizations.map((org) => (
                      <div key={org._id} className={`border rounded-lg p-4 hover:shadow-sm transition-all ${selectedOrgIds.has(org._id) ? 'ring-2 ring-blue-500/40 bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedOrgIds.has(org._id)}
                            onChange={() => toggleOrgSelection(org._id)}
                            className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{org.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              org.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{org.status === 'active' ? 'نشط' : 'غير نشط'}</span>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {typeLabels[org.type] || org.type}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground mb-4">
                          <span>الإيميل: {org.email}</span>
                          <span>رقم تسجيل الصحة: {org.healthRegNumber}</span>
                          <span>الهاتف: {org.phoneNumber}</span>
                          {org.type === 'hospital' && <span>الأسرّة: {org.bedCount}</span>}
                          {org.city && <span>المدينة: {org.city}</span>}
                        </div>
                        <div className="flex justify-end gap-2 border-t pt-3">
                          <Button variant="outline" size="sm" onClick={() => setViewingOrg(org)}><Eye className="h-4 w-4 ml-1" /> التفاصيل</Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingOrg(org)}><Edit className="h-4 w-4 ml-1" /> تعديل</Button>
                          {authUser?.role === 'super_admin' && (
                            <Button variant="destructive" size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDeleteOrg(org)}><Trash2 className="h-4 w-4 ml-1" /> حذف</Button>
                          )}
                        </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {!isLoadingOrgs && orgsTotalPages > 1 && (
                  <Pagination
                    page={orgsPage}
                    totalPages={orgsTotalPages}
                    onChange={setOrgsPage}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== Activity ==================== */}
          <TabsContent value="activity">
            <ActivityTab
              activities={activities}
              isLoadingActivity={isLoadingActivity}
              authUser={authUser}
              handleClearLogs={handleClearLogs}
            />
          </TabsContent>

          {/* ==================== Sub-Admins (super_admin only) ==================== */}
          {authUser?.role === 'super_admin' && (
            <TabsContent value="sub-admins">
              <SubAdminsTab
                subAdmins={subAdmins}
                isLoadingSubAdmins={isLoadingSubAdmins}
                authUser={authUser}
                setShowAddSubAdmin={setShowAddSubAdmin}
                handleRemoveSubAdmin={handleRemoveSubAdmin}
              />
            </TabsContent>
          )}

          {/* ==================== System Settings (super_admin only) ==================== */}
          {authUser?.role === 'super_admin' && (
            <TabsContent value="settings">
              <SettingsTab
                settings={settings}
                isLoadingSettings={isLoadingSettings}
                savingSettings={savingSettings}
                handleSaveSettings={handleSaveSettings}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ==================== Add User Modal ==================== */}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSuccess={() => { fetchUsers(); fetchStats(); }}
        />
      )}

      {/* ==================== Add Organization Modal ==================== */}
      {showAddOrg && (
        <AddOrgModal
          onClose={() => setShowAddOrg(false)}
          onSuccess={() => { fetchOrganizations(); fetchStats(); }}
        />
      )}

      {/* ==================== Management Modals ==================== */}
      <ViewUserModal user={viewingUser} onClose={() => setViewingUser(null)} />
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSuccess={() => { fetchUsers(); fetchStats(); }} />
      )}
      <ViewOrgModal org={viewingOrg} onClose={() => setViewingOrg(null)} />
      {editingOrg && (
        <EditOrgModal org={editingOrg} onClose={() => setEditingOrg(null)} onSuccess={() => { fetchOrganizations(); fetchStats(); }} />
      )}

      {/* ==================== Add Sub-Admin Modal ==================== */}
      {showAddSubAdmin && (
        <AddSubAdminModal
          onClose={() => setShowAddSubAdmin(false)}
          onSuccess={() => { setShowAddSubAdmin(false); fetchSubAdmins() }}
        />
      )}

      {/* ==================== Confirm Dialog ==================== */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        variant={confirmState.variant}
        typedConfirmation={confirmState.typedConfirmation}
        loading={confirmState.loading}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  )
}

// All sub-components moved to @/components/admin/:
//   AddUserModal       → AddUserModal.jsx
//   AddOrgModal        → AddOrgModal.jsx
//   AddSubAdminModal   → AddSubAdminModal.jsx
//   SettingSection,
//   SettingToggle      → SettingsBlocks.jsx
//   Pagination,
//   StatCard           → AdminCommon.jsx
