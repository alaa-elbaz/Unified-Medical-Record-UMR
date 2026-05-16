import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input }  from '@/components/ui/input.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { FieldGroup, FieldLabel } from '@/components/ui/field.jsx'
import api from '@/services/api.js'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner.jsx'
import ViewIdModal from '@/components/modals/ViewIdModal.jsx'
import SecureImage from '@/components/common/SecureImage.jsx'
import SmartCardModal from '@/components/modals/SmartCardModal.jsx'
import { usePageTitle } from '@/hooks/usePageTitle.js'

const roleLabels = { patient: 'مريض', doctor: 'طبيب', hospital: 'مستشفى', lab: 'مختبر', admin: 'مدير', super_admin: 'مدير عام', sub_admin: 'مدير مساعد' }

const DAYS_ARABIC = {
  'Saturday': 'السبت',
  'Sunday': 'الأحد',
  'Monday': 'الإثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء',
  'Thursday': 'الخميس',
  'Friday': 'الجمعة'
}
const ALL_DAYS = Object.keys(DAYS_ARABIC)

export default function ProfilePage() {
  usePageTitle('حسابي')
  const { user, logout, setUser, refreshUserData } = useAuth()
  const navigate = useNavigate()
  
  const [isFetchingLocal, setIsFetchingLocal] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving]   = useState(false)
  const [viewingDoc, setViewingDoc] = useState(null)
  const [showSmartCard, setShowSmartCard] = useState(false)
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    bloodType: 'unknown',
    dateOfBirth: '',
    chronicDiseases: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    specialty: '',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    slotDuration: 30,
    // Hospital / Lab specific fields
    name: '',
    managerName: '',
    emergencyPhone: '',
    address: '',
    city: ''
  })

  // 1. Fetch fresh data on mount
  const loadProfile = useCallback(async () => {
    setIsFetchingLocal(true)
    setFetchError(false)
    try {
      await refreshUserData()
    } catch (err) {
      setFetchError(true)
    } finally {
      setIsFetchingLocal(false)
    }
  }, [refreshUserData])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // 2. Load fresh user data into form
  useEffect(() => {
    if (user && !isFetchingLocal) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        bloodType: user.bloodType || 'unknown',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        chronicDiseases: Array.isArray(user.chronicDiseases) ? user.chronicDiseases.join(', ') : user.chronicDiseases || '',
        allergies: Array.isArray(user.allergies) ? user.allergies.join(', ') : user.allergies || '',
        emergencyContactName: user.emergencyContact?.name || '',
        emergencyContactPhone: user.emergencyContact?.phone || '',
        emergencyContactRelation: user.emergencyContact?.relation || '',
        specialty: user.specialty || '',
        workingHoursStart: user.workingHours?.start || '09:00',
        workingHoursEnd: user.workingHours?.end || '17:00',
        workingDays: Array.isArray(user.workingDays) && user.workingDays.length > 0 ? user.workingDays : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        slotDuration: user.slotDuration || 30,
        name: user.name || '',
        managerName: user.managerName || '',
        emergencyPhone: user.emergencyPhone || '',
        address: user.address || '',
        city: user.city || ''
      })
    }
  }, [user, isFetchingLocal])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // Client-side validation parity with RegisterPage. The backend already
    // enforces these too, but failing fast here avoids a wasted round-trip
    // and gives the user an inline message instead of a generic 400.
    const phone = (formData.phoneNumber || '').trim()
    if (phone && !/^01[0-9]{9}$/.test(phone)) {
      return toast.error('رقم الهاتف يجب أن يكون 11 رقماً يبدأ بـ 01')
    }
    const emergencyPhone = (formData.emergencyContactPhone || '').trim()
    if (emergencyPhone && !/^01[0-9]{9}$/.test(emergencyPhone)) {
      return toast.error('رقم هاتف جهة الاتصال للطوارئ غير صحيح (11 رقم يبدأ بـ 01)')
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return toast.error('صيغة البريد الإلكتروني غير صحيحة')
    }

    setIsSaving(true)
    try {
      const payload = { ...formData }
      // Nest emergencyContact for the API
      payload.emergencyContact = {
        name: formData.emergencyContactName,
        phone: formData.emergencyContactPhone,
        relation: formData.emergencyContactRelation
      }
      delete payload.emergencyContactName
      delete payload.emergencyContactPhone
      delete payload.emergencyContactRelation

      if (['doctor', 'hospital', 'lab'].includes(user.role)) {
        payload.workingHours = {
          start: formData.workingHoursStart,
          end: formData.workingHoursEnd
        }
        delete payload.workingHoursStart
        delete payload.workingHoursEnd
      }

      const { data } = await api.put('/auth/profile', payload)
      toast.success('تم حفظ التغييرات بنجاح')
      setUser(data.user) // Update AuthContext
      setIsEditing(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تحديث الملف الشخصي')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  if (isFetchingLocal) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
        <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
           <div className="h-10 bg-gray-200 rounded w-1/3 mb-8"></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 h-64 bg-gray-200 rounded-xl"></div>
              <div className="md:col-span-2 h-96 bg-gray-200 rounded-xl"></div>
           </div>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8" dir="rtl">
        <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">تعذر تحميل بيانات الملف الشخصي</h2>
            <p className="text-gray-500 mb-6">يرجى المحاولة مرة أخرى</p>
            <Button onClick={loadProfile}>إعادة المحاولة</Button>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 p-4 sm:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">إعدادات الملف الشخصي</h1>
            <p className="text-muted-foreground text-sm">إدارة معلومات حسابك الشخصي</p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" className="text-xs sm:text-sm">العودة للوحة التحكم</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            {/* Account info */}
            <Card className="shadow-sm border-gray-100 dark:border-slate-800">
              <CardHeader className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-lg">معلومات الحساب</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">البريد الإلكتروني</label>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5 break-all">{user.email}</p>
                  </div>
                  {(user.role === 'patient' || user.role === 'doctor') && (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">الرقم القومي</label>
                      <p className="font-mono text-sm text-gray-900 dark:text-gray-100 mt-0.5">{user.nationalId || 'غير متوفر'}</p>
                    </div>
                  )}
                  {['hospital', 'lab'].includes(user.role) && (
                    <div>
                      <label className="text-xs text-gray-500 font-medium">رقم التسجيل الطبي</label>
                      <p className="font-mono text-sm text-gray-900 dark:text-gray-100 mt-0.5">{user.healthRegNumber || 'غير متوفر'}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-500 font-medium">الدور</label>
                    <p className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                      {roleLabels[user.role] || user.role}
                    </p>
                  </div>
                  {user.role === 'patient' && (
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <Button onClick={() => setShowSmartCard(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm">
                        عرض البطاقة الذكية
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Profile details */}
            <Card className="shadow-sm border-gray-100 dark:border-slate-800">
              <CardHeader className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">تفاصيل الملف الشخصي</CardTitle>
                  <CardDescription className="text-xs mt-1">تحديث بياناتك الشخصية والتواصل</CardDescription>
                </div>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="h-8 text-xs font-bold">تعديل البيانات</Button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <FieldGroup>
                      <FieldLabel htmlFor="fullName">الاسم بالكامل / اسم المنشأة</FieldLabel>
                      <Input 
                        id="fullName" 
                        name={['hospital', 'lab'].includes(user.role) ? 'name' : 'fullName'}
                        value={['hospital', 'lab'].includes(user.role) ? formData.name : formData.fullName} 
                        onChange={handleChange}
                        required 
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel>
                      <Input 
                        id="email" 
                        name="email"
                        type="email"
                        dir="ltr"
                        className="text-left"
                        value={formData.email} 
                        onChange={handleChange}
                        required 
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel htmlFor="phoneNumber">رقم الهاتف</FieldLabel>
                      <Input 
                        id="phoneNumber" 
                        name="phoneNumber"
                        type="tel" 
                        dir="ltr"
                        className="text-left"
                        value={formData.phoneNumber} 
                        onChange={handleChange}
                        required 
                      />
                    </FieldGroup>
                    
                    {user.role === 'patient' && (
                      <>
                        <FieldGroup>
                          <FieldLabel htmlFor="dateOfBirth">تاريخ الميلاد</FieldLabel>
                          <Input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            dir="ltr"
                            className="text-left"
                            value={formData.dateOfBirth}
                            onChange={handleChange}
                          />
                        </FieldGroup>
                        <FieldGroup>
                          <FieldLabel htmlFor="bloodType">فصيلة الدم</FieldLabel>
                          <select
                            id="bloodType"
                            name="bloodType"
                            value={formData.bloodType}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            dir="ltr"
                          >
                            <option value="unknown">غير معروف</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </FieldGroup>
                        <FieldGroup>
                          <FieldLabel htmlFor="chronicDiseases">الأمراض المزمنة (إن وجدت)</FieldLabel>
                          <Input 
                            id="chronicDiseases" 
                            name="chronicDiseases"
                            value={formData.chronicDiseases} 
                            onChange={handleChange}
                            placeholder="مثال: السكري، الضغط (افصل بينها بفاصلة)"
                          />
                        </FieldGroup>
                        <FieldGroup>
                          <FieldLabel htmlFor="allergies">الحساسية (إن وجدت)</FieldLabel>
                          <Input 
                            id="allergies" 
                            name="allergies"
                            value={formData.allergies} 
                            onChange={handleChange}
                            placeholder="مثال: البنسلين، الفول السوداني (افصل بينها بفاصلة)"
                          />
                        </FieldGroup>

                        {/* Emergency Contact */}
                        <div className="border-t border-gray-100 pt-4 mt-4">
                          <p className="text-sm font-bold text-red-600 mb-3">🚨 جهة اتصال الطوارئ</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <FieldGroup>
                              <FieldLabel htmlFor="emergencyContactName">الاسم</FieldLabel>
                              <Input id="emergencyContactName" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} placeholder="اسم الشخص" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="emergencyContactPhone">رقم الهاتف</FieldLabel>
                              <Input id="emergencyContactPhone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} placeholder="01xxxxxxxxx" dir="ltr" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="emergencyContactRelation">صلة القرابة</FieldLabel>
                              <Input id="emergencyContactRelation" name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleChange} placeholder="أخ، أب، زوج..." />
                            </FieldGroup>
                          </div>
                        </div>
                      </>
                    )}

                    {user.role === 'doctor' && (
                      <>
                        <div className="border-t border-gray-100 pt-4 mt-4">
                          <p className="text-sm font-bold text-blue-600 mb-3">👨‍⚕️ بيانات الطبيب</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FieldGroup>
                              <FieldLabel htmlFor="specialty">التخصص</FieldLabel>
                              <Input id="specialty" name="specialty" value={formData.specialty} onChange={handleChange} placeholder="مثال: باطنة، أطفال..." />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="slotDuration">مدة الكشف (بالدقائق)</FieldLabel>
                              <Input id="slotDuration" name="slotDuration" type="number" min="5" step="5" value={formData.slotDuration} onChange={handleChange} dir="ltr" className="text-left" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="workingHoursStart">يبدأ العمل الساعة</FieldLabel>
                              <Input id="workingHoursStart" name="workingHoursStart" type="time" value={formData.workingHoursStart} onChange={handleChange} dir="ltr" className="text-left" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="workingHoursEnd">ينتهي العمل الساعة</FieldLabel>
                              <Input id="workingHoursEnd" name="workingHoursEnd" type="time" value={formData.workingHoursEnd} onChange={handleChange} dir="ltr" className="text-left" />
                            </FieldGroup>
                          </div>
                          
                          <div className="mt-4">
                            <FieldLabel>أيام العمل</FieldLabel>
                            <div className="flex flex-wrap gap-3 mt-2">
                              {ALL_DAYS.map(day => (
                                <label key={day} className="flex items-center gap-2 bg-gray-50 border px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                  <input 
                                    type="checkbox"
                                    checked={formData.workingDays.includes(day)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData(prev => ({ ...prev, workingDays: [...prev.workingDays, day] }))
                                      } else {
                                        setFormData(prev => ({ ...prev, workingDays: prev.workingDays.filter(d => d !== day) }))
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-bold text-gray-700">{DAYS_ARABIC[day]}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {['hospital', 'lab'].includes(user.role) && (
                      <>
                        <div className="border-t border-gray-100 pt-4 mt-4">
                          <p className="text-sm font-bold text-red-600 mb-3">🏥 بيانات المنشأة</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FieldGroup>
                              <FieldLabel htmlFor="managerName">اسم المدير المسؤول</FieldLabel>
                              <Input id="managerName" name="managerName" value={formData.managerName} onChange={handleChange} placeholder="مثال: د. أحمد محمد" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="emergencyPhone">هاتف الطوارئ</FieldLabel>
                              <Input id="emergencyPhone" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} dir="ltr" className="text-left" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="address">العنوان التفصيلي</FieldLabel>
                              <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="city">المدينة / المحافظة</FieldLabel>
                              <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="slotDuration">مدة الحجز (بالدقائق)</FieldLabel>
                              <Input id="slotDuration" name="slotDuration" type="number" min="5" step="5" value={formData.slotDuration} onChange={handleChange} dir="ltr" className="text-left" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="workingHoursStart">يفتح الساعة</FieldLabel>
                              <Input id="workingHoursStart" name="workingHoursStart" type="time" value={formData.workingHoursStart} onChange={handleChange} dir="ltr" className="text-left" />
                            </FieldGroup>
                            <FieldGroup>
                              <FieldLabel htmlFor="workingHoursEnd">يغلق الساعة</FieldLabel>
                              <Input id="workingHoursEnd" name="workingHoursEnd" type="time" value={formData.workingHoursEnd} onChange={handleChange} dir="ltr" className="text-left" />
                            </FieldGroup>
                          </div>
                          
                          <div className="mt-4">
                            <FieldLabel>أيام العمل</FieldLabel>
                            <div className="flex flex-wrap gap-3 mt-2">
                              {ALL_DAYS.map(day => (
                                <label key={day} className="flex items-center gap-2 bg-gray-50 border px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                  <input 
                                    type="checkbox"
                                    checked={formData.workingDays.includes(day)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData(prev => ({ ...prev, workingDays: [...prev.workingDays, day] }))
                                      } else {
                                        setFormData(prev => ({ ...prev, workingDays: prev.workingDays.filter(d => d !== day) }))
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-bold text-gray-700">{DAYS_ARABIC[day]}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
                      <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white w-32">
                        {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : 'حفظ التغييرات'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => {
                        setIsEditing(false)
                        setFormData({
                          fullName: user.fullName || '',
                          email: user.email || '',
                          phoneNumber: user.phoneNumber || '',
                          bloodType: user.bloodType || 'unknown',
                          dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
                          chronicDiseases: Array.isArray(user.chronicDiseases) ? user.chronicDiseases.join(', ') : user.chronicDiseases || '',
                          allergies: Array.isArray(user.allergies) ? user.allergies.join(', ') : user.allergies || '',
                          emergencyContactName: user.emergencyContact?.name || '',
                          emergencyContactPhone: user.emergencyContact?.phone || '',
                          emergencyContactRelation: user.emergencyContact?.relation || '',
                          specialty: user.specialty || '',
                          workingHoursStart: user.workingHours?.start || '09:00',
                          workingHoursEnd: user.workingHours?.end || '17:00',
                          workingDays: Array.isArray(user.workingDays) && user.workingDays.length > 0 ? user.workingDays : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
                          slotDuration: user.slotDuration || 30
                        })
                      }}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                        <label className="text-xs text-gray-500 font-medium mb-1 block">الاسم المعتمد</label>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{user.fullName || user.name}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                        <label className="text-xs text-gray-500 font-medium mb-1 block">رقم الهاتف للتواصل</label>
                        <p className="font-semibold text-gray-900 dark:text-gray-100" dir="ltr">{user.phoneNumber || 'غير متوفر'}</p>
                      </div>
                      {['patient', 'doctor'].includes(user.role) && (
                        <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                          <label className="text-xs text-gray-500 font-medium mb-1 block">النوع</label>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{user.gender === 'male' ? 'ذكر' : user.gender === 'female' ? 'أنثى' : 'غير متوفر'}</p>
                        </div>
                      )}
                      
                      {user.role === 'patient' && (
                        <>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">تاريخ الميلاد</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('ar-EG') : 'غير متوفر'}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">فصيلة الدم</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100" dir="ltr">{user.bloodType !== 'unknown' ? user.bloodType : 'غير معروف'}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">الأمراض المزمنة</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {user.chronicDiseases && user.chronicDiseases.length > 0
                                ? (Array.isArray(user.chronicDiseases) ? user.chronicDiseases.join('، ') : user.chronicDiseases)
                                : 'لا يوجد'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">الحساسية</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {user.allergies && user.allergies.length > 0
                                ? (Array.isArray(user.allergies) ? user.allergies.join('، ') : user.allergies)
                                : 'لا يوجد'}
                            </p>
                          </div>
                        </>
                      )}

                      {user.role === 'doctor' && (
                        <>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">التخصص</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.specialty || 'غير متوفر'}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">أيام العمل</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {user.workingDays && user.workingDays.length > 0
                                ? user.workingDays.map(d => DAYS_ARABIC[d]).join('، ')
                                : 'من الأحد للخميس (افتراضي)'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">ساعات العمل</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100" dir="ltr">
                              {user.workingHours?.start || '09:00'} - {user.workingHours?.end || '17:00'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">مدة الكشف الاسترشادية</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.slotDuration || 30} دقيقة</p>
                          </div>
                        </>
                      )}

                      {['hospital', 'lab'].includes(user.role) && (
                        <>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">اسم المدير المسؤول</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{user.managerName || 'غير متوفر'}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">هاتف الطوارئ</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100" dir="ltr">{user.emergencyPhone || 'غير متوفر'}</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800 md:col-span-2">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">العنوان</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {[user.address, user.city].filter(Boolean).join('، ') || 'غير متوفر'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">أيام العمل</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {user.workingDays && user.workingDays.length > 0
                                ? user.workingDays.map(d => DAYS_ARABIC[d]).join('، ')
                                : 'من الأحد للخميس (افتراضي)'}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">مواعيد العمل</label>
                            <p className="font-semibold text-gray-900 dark:text-gray-100" dir="ltr">
                              {user.workingHours?.start || '09:00'} - {user.workingHours?.end || '17:00'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            {(user.idDocumentPath || user.syndicateIdPath) && (
              <Card className="shadow-sm border-gray-100 dark:border-slate-800 mt-6">
                <CardHeader className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <CardTitle className="text-lg">المستندات المرفقة</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {user.idDocumentPath && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">صورة بطاقة الرقم القومي (اضغط للتكبير):</p>
                      <SecureImage 
                        src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/${user.idDocumentPath.replace(/\\/g, '/')}`} 
                        alt="ID Document" 
                        className="max-w-md w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => setViewingDoc(user.idDocumentPath)}
                      />
                    </div>
                  )}
                  {user.syndicateIdPath && (
                    <div>
                      <p className="text-sm font-medium mb-2">صورة كارنيه النقابة (اضغط للتكبير):</p>
                      <SecureImage 
                        src={`${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/${user.syndicateIdPath.replace(/\\/g, '/')}`} 
                        alt="Syndicate ID Document" 
                        className="max-w-md w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" 
                        onClick={() => setViewingDoc(user.syndicateIdPath)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>

      </div>

      <ViewIdModal 
        isOpen={!!viewingDoc} 
        onClose={() => setViewingDoc(null)} 
        documentPath={viewingDoc} 
      />
      <SmartCardModal 
        isOpen={showSmartCard} 
        onClose={() => setShowSmartCard(false)} 
        user={user} 
      />
    </div>
  )
}
