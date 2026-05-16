import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { X, FileText, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { getImageUrl } from '@/utils/getImageUrl.js'
import SecureImage from '@/components/common/SecureImage.jsx'

const roleLabels = {
  patient: 'مريض', doctor: 'طبيب', hospital: 'مستشفى',
  lab: 'مختبر', pharmacy: 'صيدلية', admin: 'مدير',
  super_admin: 'مدير عام', sub_admin: 'مدير مساعد'
}

const genderLabel = (g) => {
  if (g === 'male') return 'ذكر'
  if (g === 'female') return 'أنثى'
  return 'غير محدد'
}

export default function ViewUserModal({ user, onClose }) {
  if (!user) return null;

  const docPath = user.idDocumentPath || user.syndicateIdPath || ''
  const linkUrl = docPath && docPath !== 'pending' ? getImageUrl(docPath) : '#'
  const isOrg = ['hospital', 'lab', 'pharmacy'].includes(user.role)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" dir="rtl">
      <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle className="text-lg sm:text-xl">تفاصيل المستخدم</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div><strong>الاسم:</strong> {user.fullName || user.name}</div>
            <div className="break-all"><strong>الإيميل:</strong> {user.email}</div>
            {!isOrg && <div><strong>الرقم القومي:</strong> {user.nationalId || 'غير مسجل'}</div>}
            {isOrg && <div><strong>رقم التسجيل الطبي:</strong> {user.healthRegNumber || 'غير مسجل'}</div>}
            <div><strong>الهاتف:</strong> {user.phoneNumber || 'غير مسجل'}</div>
            <div><strong>الدور:</strong> {roleLabels[user.role] || user.role}</div>
            {!isOrg && <div><strong>النوع:</strong> {genderLabel(user.gender)}</div>}
            <div><strong>الحالة:</strong> {user.status}</div>
            <div><strong>تاريخ الانضمام:</strong> {new Date(user.createdAt).toLocaleDateString('ar-EG')}</div>
            
            {/* KYC Score */}
            {(user.kycScore !== undefined || user.kycStatus) && (
              <div className="col-span-full mt-2 p-3 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {user.kycStatus === 'approved' ? <ShieldCheck size={18} className="text-green-600" /> : user.kycStatus === 'rejected' ? <ShieldAlert size={18} className="text-red-600" /> : <ShieldQuestion size={18} className="text-amber-500" />}
                    <strong className="text-sm">تقرير التحقق (KYC)</strong>
                  </div>
                  <span className={`text-lg font-black ${
                    (user.kycScore || 0) >= 70 ? 'text-green-600' : (user.kycScore || 0) >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>{user.kycScore ?? '—'}<span className="text-xs text-gray-400 font-normal">/100</span></span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all ${
                    (user.kycScore || 0) >= 70 ? 'bg-green-500' : (user.kycScore || 0) >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`} style={{ width: `${Math.min(user.kycScore || 0, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  الحالة: {user.kycStatus === 'approved' ? '✅ معتمد تلقائياً' : user.kycStatus === 'pending_review' ? '⏳ بانتظار المراجعة' : user.kycStatus === 'rejected' ? '❌ مرفوض' : user.kycStatus || 'غير محدد'}
                </p>
              </div>
            )}
            
            {user.role === 'patient' && (
              <>
                <div><strong>اسم الأم:</strong> {user.mothersName || user.motherName || 'غير مسجل'}</div>
                <div><strong>فصيلة الدم:</strong> {user.bloodType && user.bloodType !== 'unknown' ? user.bloodType : 'غير محدد'}</div>
              </>
            )}

            {user.role === 'doctor' && (
              <>
                <div><strong>التخصص:</strong> {user.specialty || 'غير مسجل'}</div>
                <div><strong>رقم النقابة:</strong> {user.syndicateNumber || 'غير مسجل'}</div>
              </>
            )}

            {isOrg && (
              <>
                {user.address && <div className="col-span-full"><strong>العنوان:</strong> {user.address}</div>}
              </>
            )}
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="font-bold mb-3 text-sm">المستند المرفق (البطاقة / الكارنيه)</h3>
            {docPath && docPath !== 'pending' ? (
              <div className="text-center">
                <a href={linkUrl} target="_blank" rel="noopener noreferrer">
                   <SecureImage src={linkUrl} alt="Document" className="max-w-full h-auto max-h-64 rounded border mx-auto object-contain cursor-pointer" />
                </a>
                <p className="text-xs text-muted-foreground mt-2">اضغط على الصورة لعرضها بحجمها الطبيعي</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">لا يوجد مستند مرفق</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
