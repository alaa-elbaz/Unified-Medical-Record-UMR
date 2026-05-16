import { useState, useEffect } from 'react'
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
import { getImageUrl } from '@/utils/getImageUrl.js'
import SecureImage from '@/components/common/SecureImage.jsx'

const roleLabels = { patient: 'مريض', doctor: 'طبيب', hospital: 'مستشفى', lab: 'مختبر', admin: 'مدير', super_admin: 'مدير عام', sub_admin: 'مدير مساعد' }

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving]   = useState(false)
  const [viewingDoc, setViewingDoc] = useState(null)
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    bloodType: 'unknown',
    chronicDiseases: '',
    allergies: ''
  })

  // Load user data into form
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        bloodType: user.bloodType || 'unknown',
        chronicDiseases: Array.isArray(user.chronicDiseases) ? user.chronicDiseases.join(', ') : user.chronicDiseases || '',
        allergies: Array.isArray(user.allergies) ? user.allergies.join(', ') : user.allergies || ''
      })
    }
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { data } = await api.put('/auth/profile', formData)
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

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">إعدادات الملف الشخصي</h1>
            <p className="text-muted-foreground">إدارة معلومات حسابك الشخصي</p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline">العودة للوحة التحكم</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            {/* Account info */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-lg">معلومات الحساب</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 font-medium">البريد الإلكتروني</label>
                    <p className="font-semibold text-gray-900 mt-0.5 break-all">{user.email}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">الرقم القومي</label>
                    <p className="font-mono text-sm text-gray-900 mt-0.5">{user.nationalId || 'غير متوفر'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">الدور</label>
                    <p className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {roleLabels[user.role] || user.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Profile details */}
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4 flex flex-row items-center justify-between">
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
                      <FieldLabel htmlFor="fullName">الاسم بالكامل</FieldLabel>
                      <Input 
                        id="fullName" 
                        name="fullName"
                        value={formData.fullName} 
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
                          chronicDiseases: Array.isArray(user.chronicDiseases) ? user.chronicDiseases.join(', ') : user.chronicDiseases || '',
                          allergies: Array.isArray(user.allergies) ? user.allergies.join(', ') : user.allergies || ''
                        })
                      }}>
                        إلغاء
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="text-xs text-gray-500 font-medium mb-1 block">الاسم المعتمد</label>
                        <p className="font-semibold text-gray-900">{user.fullName}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="text-xs text-gray-500 font-medium mb-1 block">رقم الهاتف للتواصل</label>
                        <p className="font-semibold text-gray-900" dir="ltr">{user.phoneNumber || 'غير متوفر'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="text-xs text-gray-500 font-medium mb-1 block">النوع</label>
                        <p className="font-semibold text-gray-900">{user.gender === 'male' ? 'ذكر' : user.gender === 'female' ? 'أنثى' : 'غير متوفر'}</p>
                      </div>
                      
                      {user.role === 'patient' && (
                        <>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">فصيلة الدم</label>
                            <p className="font-semibold text-gray-900" dir="ltr">{user.bloodType !== 'unknown' ? user.bloodType : 'غير معروف'}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">الأمراض المزمنة</label>
                            <p className="font-semibold text-gray-900">
                              {user.chronicDiseases && user.chronicDiseases.length > 0
                                ? (Array.isArray(user.chronicDiseases) ? user.chronicDiseases.join('، ') : user.chronicDiseases)
                                : 'لا يوجد'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <label className="text-xs text-gray-500 font-medium mb-1 block">الحساسية</label>
                            <p className="font-semibold text-gray-900">
                              {user.allergies && user.allergies.length > 0
                                ? (Array.isArray(user.allergies) ? user.allergies.join('، ') : user.allergies)
                                : 'لا يوجد'}
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
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg">المستندات المرفقة</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  {user.idDocumentPath && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">صورة بطاقة الرقم القومي (اضغط للتكبير):</p>
                      <SecureImage 
                        src={getImageUrl(user.idDocumentPath)} 
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
                        src={getImageUrl(user.syndicateIdPath)} 
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
    </div>
  )
}
