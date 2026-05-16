import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { FieldGroup, FieldLabel } from '@/components/ui/field.jsx'
import { Loader2, X, UserCog } from 'lucide-react'
import api from '@/services/api.js'
import { toast } from 'sonner'

/**
 * AddSubAdminModal — creates a sub_admin user. Used from AdminPage's
 * Sub-Admins tab. Sub-admins inherit all admin reads but can't delete
 * users, edit system settings, or manage other admins.
 */
export default function AddSubAdminModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ fullName: '', email: '', nationalId: '', phoneNumber: '', gender: 'male' })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || !form.nationalId.trim() || !form.phoneNumber.trim()) {
      toast.error('كل الحقول مطلوبة')
      return
    }
    if (!/^\d{14}$/.test(form.nationalId)) {
      toast.error('الرقم القومي يجب أن يكون 14 رقم')
      return
    }
    if (!/^01[0125]\d{8}$/.test(form.phoneNumber)) {
      toast.error('رقم الهاتف غير صالح')
      return
    }
    try {
      setSaving(true)
      await api.post('/admin/sub-admins', form)
      toast.success('تم إنشاء المدير المساعد بنجاح')
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الإنشاء')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><UserCog size={18} className="text-indigo-600" /> إضافة مدير مساعد</h3>
            <p className="text-xs text-gray-500 mt-0.5">سيحصل على صلاحيات إدارية محدودة</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <FieldGroup>
            <FieldLabel>الاسم الرباعي</FieldLabel>
            <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="الاسم بالكامل" required />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>البريد الإلكتروني</FieldLabel>
            <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="admin@example.com" dir="ltr" className="text-left" required />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <FieldLabel>الرقم القومي</FieldLabel>
              <Input name="nationalId" value={form.nationalId} onChange={handleChange} maxLength="14" dir="ltr" className="text-left" required />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>الهاتف</FieldLabel>
              <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} dir="ltr" className="text-left" placeholder="01XXXXXXXXX" required />
            </FieldGroup>
          </div>
          <FieldGroup>
            <FieldLabel>النوع</FieldLabel>
            <select name="gender" value={form.gender} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm">
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </FieldGroup>
          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-xs text-indigo-800">
            <strong>ملاحظة:</strong> المدير المساعد يستطيع: مراجعة الاعتمادات، إدارة المستخدمين والمنظمات، وعرض السجلات. لا يستطيع: حذف المستخدمين، تعديل إعدادات النظام، أو إدارة المدراء.
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">إلغاء</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'إنشاء'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
