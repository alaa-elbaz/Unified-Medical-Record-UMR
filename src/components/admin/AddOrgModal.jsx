import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { FieldGroup, FieldLabel } from '@/components/ui/field.jsx'
import { Loader2, X } from 'lucide-react'
import api from '@/services/api.js'
import { toast } from 'sonner'

/**
 * AddOrgModal — admin-side modal for creating a Hospital or Lab record.
 * Pharmacy registration goes through the public registration flow instead.
 */
export default function AddOrgModal({ onClose, onSuccess }) {
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'hospital', email: '', healthRegNumber: '', phoneNumber: '',
    address: '', city: '', bedCount: '', departmentCount: '', description: ''
  })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.post('/admin/organizations', {
        ...form,
        bedCount: form.bedCount ? Number(form.bedCount) : 0,
        departmentCount: form.departmentCount ? Number(form.departmentCount) : 0,
      })
      toast.success('تم إنشاء المنظمة بنجاح')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل إنشاء المنظمة')
    } finally { setIsSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-xl">إضافة منظمة جديدة</CardTitle>
            <CardDescription>أضف مستشفى أو مختبر جديد</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <FieldLabel>اسم المنظمة *</FieldLabel>
              <Input name="name" value={form.name} onChange={handleChange} required placeholder="مثال: مستشفى المدينة" />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>النوع *</FieldLabel>
              <select name="type" value={form.type} onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="hospital">مستشفى</option>
                <option value="lab">مختبر</option>
              </select>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>البريد الإلكتروني الرسمي *</FieldLabel>
              <Input name="email" type="email" value={form.email} onChange={handleChange} required dir="ltr" className="text-left" placeholder="admin@hospital.com" />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>رقم تسجيل وزارة الصحة *</FieldLabel>
              <Input name="healthRegNumber" value={form.healthRegNumber} onChange={handleChange} required dir="ltr" className="text-left" placeholder="رقم التسجيل" />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>رقم الهاتف *</FieldLabel>
              <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required dir="ltr" className="text-left" placeholder="02xxxxxxxx" />
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel>العنوان</FieldLabel>
                <Input name="address" value={form.address} onChange={handleChange} placeholder="العنوان التفصيلي" />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>المدينة</FieldLabel>
                <Input name="city" value={form.city} onChange={handleChange} placeholder="المدينة" />
              </FieldGroup>
            </div>

            {form.type === 'hospital' && (
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <FieldLabel>عدد الأسرّة</FieldLabel>
                  <Input name="bedCount" type="number" value={form.bedCount} onChange={handleChange} min="0" />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>عدد الأقسام</FieldLabel>
                  <Input name="departmentCount" type="number" value={form.departmentCount} onChange={handleChange} min="0" />
                </FieldGroup>
              </div>
            )}

            <FieldGroup>
              <FieldLabel>وصف مختصر</FieldLabel>
              <Input name="description" value={form.description} onChange={handleChange} placeholder="وصف مختصر عن المنظمة" />
            </FieldGroup>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
              <strong>هام:</strong> البريد الإلكتروني ورقم تسجيل وزارة الصحة هما بيانات الدخول الرئيسية للمنظمة
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إنشاء المنظمة'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
