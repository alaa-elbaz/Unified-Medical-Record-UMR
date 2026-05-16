import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Building2, Users, Stethoscope, Bed, Calendar, ScanLine, Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input.jsx'
import BookAppointmentModal from '@/components/modals/BookAppointmentModal.jsx'
import AddDepartmentModal from '@/components/modals/AddDepartmentModal.jsx'
import AddScopedDoctorModal from '@/components/modals/AddScopedDoctorModal.jsx'
import ManageAppointmentModal from '@/components/modals/ManageAppointmentModal.jsx'
import { useAuth } from '@/context/AuthContext.jsx'
import api from '@/services/api.js'
import EmptyState from '@/components/ui/EmptyState.jsx'
import HospitalCharts from '@/components/hospital/HospitalCharts.jsx'
import { Spinner } from '@/components/ui/spinner.jsx'
import { toast } from 'sonner'
import { usePageTitle } from '@/hooks/usePageTitle.js'

export default function HospitalPage() {
  usePageTitle('لوحة المستشفى')
  const { user } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('overview')
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [stats, setStats] = useState({ totalAppointmentsToday: 0, totalDoctors: 0, activeDepartments: 0 })
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [bookingPatient, setBookingPatient] = useState(null)
  
  // Modals state
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false)
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false)
  const [managingAppointment, setManagingAppointment] = useState(null)

  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/appointments')
      setAppointments(res.data.data || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHospitalStats = async () => {
    if (!user?._id && !user?.id) return;
    const hospitalId = user._id || user.id;
    try {
      const resStats = await api.get('/hospital/stats');
      setStats(resStats.data.data || { totalAppointmentsToday: 0, totalDoctors: 0, activeDepartments: 0 });

      const resDepts = await api.get('/hospital/departments');
      setDepartments(resDepts.data.data || []);
      
      const resDocs = await api.get('/hospital/doctors');
      setDoctors(resDocs.data.data || []);
    } catch (error) {
      console.error('Error fetching hospital stats:', error)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data.data || []);
      if (res.data.data?.length === 0) toast.info('لا يوجد مرضى مطابقين للبحث');
    } catch (error) {
      toast.error('حدث خطأ أثناء البحث');
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    fetchAppointments()
    fetchHospitalStats()
  }, [location.pathname, user])





  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">إدارة المستشفى</h1>
            <p className="text-muted-foreground">نظرة عامة وإدارة عمليات المستشفى</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 md:w-72">
              <Input 
                placeholder="بحث برقم الهوية أو الاسم..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pr-10 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100"
              />
              <Button type="submit" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10 text-gray-400 dark:text-slate-500" disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Button onClick={() => window.location.href = '/emergency'} variant="destructive" className="gap-2 shadow-lg animate-pulse w-full md:w-auto h-10 text-sm font-bold">
              <ScanLine className="h-5 w-5" /> مسح طوارئ
            </Button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm animate-in fade-in">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-900 dark:text-slate-100">نتائج البحث ({searchResults.length})</h3>
              <Button variant="ghost" size="sm" onClick={() => setSearchResults([])}>إغلاق</Button>
            </div>
            <div className="space-y-2">
              {searchResults.map(p => (
                <div key={p._id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-slate-100">{p.fullName}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">الرقم القومي: {p.nationalId || '—'} | الهاتف: <span dir="ltr">{p.phoneNumber || '—'}</span></p>
                  </div>
                  <Button size="sm" onClick={() => setBookingPatient(p)}>حجز موعد جديد</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('departments')}>
            <CardContent className="pt-6">
              <div className="text-center">
                <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">{stats.activeDepartments}</div>
                <p className="text-sm text-muted-foreground">الأقسام</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('doctors')}>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{stats.totalDoctors}</div>
                <p className="text-sm text-muted-foreground">الأطباء النشطون</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('appointments')}>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">{stats.totalAppointmentsToday}</div>
                <p className="text-sm text-muted-foreground">مواعيد اليوم</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview"     className="flex items-center gap-2"><Building2 className="h-4 w-4"   /><span className="hidden sm:inline">نظرة عامة</span></TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2"><Calendar className="h-4 w-4"    /><span className="hidden sm:inline">المواعيد</span></TabsTrigger>
            <TabsTrigger value="departments"  className="flex items-center gap-2"><Stethoscope className="h-4 w-4"/><span className="hidden sm:inline">الأقسام</span></TabsTrigger>
            <TabsTrigger value="doctors"      className="flex items-center gap-2"><Users className="h-4 w-4"       /><span className="hidden sm:inline">الأطباء</span></TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <HospitalCharts doctors={doctors} departments={departments} />
              </div>
            <Card>
              <CardHeader>
                <CardTitle>حالة المستشفى</CardTitle>
                <CardDescription>المقاييس التشغيلية الحالية</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: 'المواعيد اليوم',  value: stats.totalAppointmentsToday },
                    { label: 'إجمالي الأطباء',      value: stats.totalDoctors },
                    { label: 'الأقسام النشطة',       value: stats.activeDepartments },
                  ].map(({ label, value }, i) => (
                    <div key={i} className={`flex justify-between items-center pb-4 ${i < 2 ? 'border-b border-gray-100 dark:border-slate-700' : ''}`}>
                      <span className="text-gray-700 dark:text-slate-300">{label}</span>
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Appointments */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>مواعيد المستشفى</CardTitle>
                  <CardDescription>عرض وتحديث المواعيد المحجوزة للمستشفى</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                 {isLoading ? (
                  <div className="flex justify-center p-8"><Spinner /></div>
                ) : appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((apt) => (
                      <div key={apt._id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-start bg-white dark:bg-slate-900">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100">{apt.patientId?.fullName || "مريض غير معروف"}</h3>
                          {apt.patientId && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                              رقم قومي: <span className="font-mono">{apt.patientId.nationalId || '—'}</span> | 
                              هاتف: <span dir="ltr">{apt.patientId.phoneNumber || '—'}</span>
                            </p>
                          )}
                          <p className="text-sm text-gray-700 dark:text-slate-300 font-medium mt-1">النوع: {apt.appointmentType || 'كشف'}</p>
                          <p className="text-sm text-muted-foreground mt-1">{apt.reason || apt.notes || "لا يوجد سبب محدد"}</p>
                          <p className="text-sm mt-2 font-bold text-gray-900 dark:text-slate-100">{new Date(apt.date).toLocaleDateString('ar-EG')} — الساعة {apt.time}</p>
                          {apt.queueNumber && (
                            <div className="mt-2 inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-bold border border-indigo-200 dark:border-indigo-800">
                              رقم الدور: {apt.queueNumber}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'Confirmed' ? 'bg-green-100 text-green-700' :
                            apt.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {apt.status === 'Confirmed' ? 'مؤكد' : apt.status === 'Pending' ? 'قيد الانتظار' : apt.status}
                          </span>
                          <Button variant="outline" size="sm" onClick={() => setManagingAppointment(apt)}>إدارة الموعد</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState 
                    icon={Calendar} 
                    title="لا توجد مواعيد متاحة" 
                    description="لا توجد أي مواعيد محجوزة للمستشفى حالياً." 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments */}
          <TabsContent value="departments">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>الأقسام</CardTitle>
                  <CardDescription>إدارة أقسام المستشفى</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsAddDeptModalOpen(true)}><Plus className="h-4 w-4" />إضافة قسم</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments.length > 0 ? departments.map((dept, idx) => (
                    <div key={idx} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100">{dept.name}</h3>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">{dept.description || 'لا يوجد وصف'}</p>
                        <p className="font-medium mt-2">سعة الأسرة: {dept.bedCapacity || 0}</p>
                      </div>
                    </div>
                  )) : (
                    <EmptyState 
                      icon={Stethoscope} 
                      title="لا توجد أقسام مسجلة" 
                      description="ابدأ بإضافة الأقسام والتخصصات المتاحة في المستشفى." 
                      actionLabel="إضافة قسم"
                      onAction={() => setIsAddDeptModalOpen(true)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Doctors */}
          <TabsContent value="doctors">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>أطباء الكادر</CardTitle>
                  <CardDescription>إدارة أطباء المستشفى</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsAddDocModalOpen(true)}><Plus className="h-4 w-4" />إضافة طبيب</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {doctors.length > 0 ? doctors.map((doc) => (
                    <div key={doc._id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100">د. {doc.fullName}</h3>
                          <p className="text-sm text-blue-600 font-bold mb-2">{doc.specialty || 'غير معروف'} — {doc.hospitalDepartment}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border flex items-center gap-1 ${doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                          {doc.status === 'pending' ? '⏳ بانتظار الإعداد' : '● نشط'}
                        </span>
                      </div>
                      <div className="mt-3 bg-gray-50 dark:bg-slate-800 p-3 rounded text-sm space-y-1">
                        <p className="text-gray-700 dark:text-slate-300"><span className="text-gray-500 dark:text-slate-400 font-bold">البريد الإلكتروني (للدخول):</span> <span className="font-mono" dir="ltr">{doc.email}</span></p>
                        <p className="text-gray-700 dark:text-slate-300"><span className="text-gray-500 dark:text-slate-400 font-bold">الرقم القومي:</span> {doc.nationalId}</p>
                      </div>
                    </div>
                  )) : (
                    <EmptyState 
                      icon={Users} 
                      title="لا يوجد أطباء مسجلون" 
                      description="لم تقم بإضافة أي أطباء للكادر الطبي الخاص بك." 
                      actionLabel="إضافة طبيب"
                      onAction={() => setIsAddDocModalOpen(true)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
      <BookAppointmentModal 
        isOpen={!!bookingPatient} 
        onClose={() => setBookingPatient(null)} 
        onSuccess={() => { setBookingPatient(null); fetchAppointments(); }}
        prefilledAppointment={{
           patientId: bookingPatient?._id,
           organizationId: user?._id || user?.id,
           type: 'hospital'
        }}
      />
      <AddDepartmentModal
        isOpen={isAddDeptModalOpen}
        onClose={() => setIsAddDeptModalOpen(false)}
        onSuccess={fetchHospitalStats}
      />
      <AddScopedDoctorModal
        isOpen={isAddDocModalOpen}
        onClose={() => setIsAddDocModalOpen(false)}
        onSuccess={fetchHospitalStats}
        departments={departments}
      />
      <ManageAppointmentModal
        isOpen={!!managingAppointment}
        onClose={() => setManagingAppointment(null)}
        onSuccess={() => { setManagingAppointment(null); fetchAppointments(); }}
        appointment={managingAppointment}
      />
    </div>
  )
}
