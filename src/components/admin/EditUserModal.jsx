import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { FieldGroup, FieldLabel } from '@/components/ui/field.jsx'
import { X, Loader2 } from 'lucide-react'
import api from '@/services/api'
import { toast } from 'sonner'

export default function EditUserModal({ user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    fullName: user.fullName || '',
    phoneNumber: user.phoneNumber || '',
    status: user.status || 'pending',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await api.put(`/admin/user/${user._id}`, form)
      toast.success('تم تعديل المستخدم بنجاح')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التعديل')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-xl">تعديل المستخدم</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <FieldLabel>الاسم بالكامل</FieldLabel>
              <Input name="fullName" value={form.fullName} onChange={handleChange} required />
            </FieldGroup>
            
            <FieldGroup>
              <FieldLabel>رقم الهاتف</FieldLabel>
              <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required dir="ltr" className="text-left" />
            </FieldGroup>
            
            <FieldGroup>
              <FieldLabel>الحالة</FieldLabel>
              <select name="status" value={form.status} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="pending">معلق</option>
                <option value="active">نشط</option>
                <option value="rejected">مرفوض</option>
              </select>
            </FieldGroup>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ التعديلات'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
