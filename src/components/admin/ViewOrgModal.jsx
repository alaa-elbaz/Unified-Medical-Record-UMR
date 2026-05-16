import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { X } from 'lucide-react'

export default function ViewOrgModal({ org, onClose }) {
  if (!org) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-xl">تفاصيل المنظمة</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><strong>الاسم:</strong> {org.name}</div>
            <div><strong>النوع:</strong> {org.type === 'hospital' ? 'مستشفى' : 'مختبر'}</div>
            <div><strong>الإيميل:</strong> {org.email}</div>
            <div><strong>رقم التسجيل الصحي:</strong> {org.healthRegNumber}</div>
            <div><strong>الهاتف:</strong> {org.phoneNumber}</div>
            <div><strong>المدينة:</strong> {org.city || 'غير مدون'}</div>
            <div className="col-span-2"><strong>العنوان:</strong> {org.address || 'غير مدون'}</div>
            <div><strong>الحالة:</strong> {org.status}</div>
            <div><strong>تاريخ الإضافة:</strong> {new Date(org.createdAt).toLocaleDateString('ar-EG')}</div>
            
            {org.type === 'hospital' && (
              <>
                <div><strong>عدد الأسرّة:</strong> {org.bedCount}</div>
                <div><strong>عدد الأقسام:</strong> {org.departmentCount}</div>
              </>
            )}
            
            <div className="col-span-2 mt-4 p-3 bg-gray-50 rounded border">
              <strong>وصف:</strong> {org.description || 'لا يوجد وصف متاح.'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
