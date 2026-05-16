import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { FieldGroup, FieldLabel } from '@/components/ui/field.jsx'
import { CheckCircle, Copy, Loader2, X } from 'lucide-react'
import api from '@/services/api.js'
import { toast } from 'sonner'

/**
 * AddUserModal — admin-side modal that creates a Patient or Doctor account
 * with a server-generated temporary email. Used from AdminPage's Users tab.
 *
 * Props:
 *  - onClose: () => void   — close without refreshing
 *  - onSuccess: () => void — fired after successful creation; the parent
 *                            typically refetches the user list
 */
export default function AddUserModal({ onClose, onSuccess }) {
  const [isSaving, setIsSaving] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState('')
  const [form, setForm] = useState({
    fullName: '', nationalId: '', role: 'patient', phoneNumber: '', gender: 'male',
    mothersName: '', syndicateNumber: '', specialty: ''
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const { data } = await api.post('/admin/users', form)
      setGeneratedEmail(data.data.generatedEmail)
      toast.success('تم إنشاء المستخدم بنجاح')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل إنشاء المستخدم')
    } finally { setIsSaving(false) }
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(generatedEmail)
    toast.success('تم نسخ الإيميل')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-xl">إضافة مستخدم جديد</CardTitle>
            <CardDescription>سيتم توليد إيميل مؤقت تلقائياً</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="pt-4">
          {generatedEmail ? (
            <div className="space-y-6 text-center">
              <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
                <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
                <p className="text-sm text-green-800 mb-2 font-medium">تم إنشاء الحساب بنجاح! الإيميل المؤقت هو:</p>
                <div className="flex items-center justify-center gap-2 bg-white border border-green-300 rounded-lg p-3">
                  <p className="font-bold text-lg text-green-900" dir="ltr">{generatedEmail}</p>
                  <Button variant="ghost" size="sm" onClick={copyEmail}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-xs text-green-700 mt-3">شارك هذا الإيميل مع المستخدم ليتمكن من تسجيل الدخول</p>
              </div>
              <Button className="w-full" onClick={onClose}>إغلاق</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup>
                <FieldLabel>الاسم بالكامل *</FieldLabel>
                <Input name="fullName" value={form.fullName} onChange={handleChange} required placeholder="أدخل الاسم الكامل" />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>الرقم القومي *</FieldLabel>
                <Input name="nationalId" value={form.nationalId} onChange={handleChange} required maxLength={14} dir="ltr" className="text-left" placeholder="14 رقم" />
              </FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <FieldLabel>الدور *</FieldLabel>
                  <select name="role" value={form.role} onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="patient">مريض</option>
                    <option value="doctor">طبيب</option>
                  </select>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>النوع *</FieldLabel>
                  <select name="gender" value={form.gender} onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </FieldGroup>
              </div>
              <FieldGroup>
                <FieldLabel>رقم الهاتف *</FieldLabel>
                <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required dir="ltr" className="text-left" placeholder="01xxxxxxxxx" />
              </FieldGroup>

              {form.role === 'patient' && (
                <FieldGroup>
                  <FieldLabel>اسم الأم</FieldLabel>
                  <Input name="mothersName" value={form.mothersName} onChange={handleChange} placeholder="اسم الأم بالكامل" />
                </FieldGroup>
              )}

              {form.role === 'doctor' && (
                <>
                  <FieldGroup>
                    <FieldLabel>رقم القيد بالنقابة</FieldLabel>
                    <Input name="syndicateNumber" value={form.syndicateNumber} onChange={handleChange} dir="ltr" className="text-left" />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>التخصص</FieldLabel>
                    <Input name="specialty" value={form.specialty} onChange={handleChange} placeholder="مثال: باطنة، قلب" />
                  </FieldGroup>
                </>
              )}

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">
                <strong>ملاحظة:</strong> سيتم توليد إيميل مؤقت تلقائياً بصيغة: <code dir="ltr" className="bg-blue-100 px-1 rounded">{'{الرقم_القومي}'}@umr-temp.com</code>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء المستخدم'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
