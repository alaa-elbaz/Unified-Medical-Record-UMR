import { useState } from 'react';
import { X, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import api from '@/services/api.js';
import { toast } from 'sonner';

export default function AddScopedDoctorModal({ isOpen, onClose, onSuccess, departments = [] }) {
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    phoneNumber: '',
    gender: 'male',
    specialty: '',
    department: '',
    syndicateNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/hospital/doctors/add', formData);
      setSuccessData(res.data.data);
      toast.success('تم إضافة الطبيب بنجاح');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إضافة الطبيب');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyEmail = () => {
    if (successData?.email) {
      navigator.clipboard.writeText(successData.email);
      toast.success('تم نسخ البريد الإلكتروني');
    }
  };

  const resetAndClose = () => {
    setFormData({
      fullName: '', nationalId: '', phoneNumber: '', gender: 'male', specialty: '', department: '', syndicateNumber: ''
    });
    setSuccessData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold">إضافة طبيب ضمن الكادر</h3>
          <button onClick={resetAndClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        
        {successData ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-2xl font-bold text-gray-800">تم تسجيل الطبيب بنجاح</h4>
            <p className="text-gray-500">تم إنشاء حساب للطبيب داخل نطاق المستشفى. يرجى تزويد الطبيب ببيانات الدخول التالية:</p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4 text-right space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">اسم الطبيب</p>
                <p className="font-bold">{successData.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">البريد الإلكتروني المخصص (لتسجيل الدخول)</p>
                <div className="flex items-center justify-between bg-white border p-2 rounded-lg">
                  <p className="font-mono text-sm text-blue-600" dir="ltr">{successData.email}</p>
                  <button onClick={handleCopyEmail} className="text-gray-400 hover:text-gray-700">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">ملاحظة: سيحتاج الطبيب للرقم القومي وإيميله لتسجيل الدخول وتفعيل حسابه.</p>
            </div>
            
            <Button onClick={resetAndClose} className="w-full h-12 mt-4 text-md font-bold">إغلاق</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-bold mb-1">اسم الطبيب الرباعي <span className="text-red-500">*</span></label>
                <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="مثال: أحمد محمد علي" required />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1">الرقم القومي <span className="text-red-500">*</span></label>
                <Input value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} placeholder="14 رقم" required maxLength={14} minLength={14} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                <Input value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder="01..." required dir="ltr" className="text-right" />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1">التخصص الدقيق <span className="text-red-500">*</span></label>
                <Input value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="مثال: جراحة عامة" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">القسم بالمستشفى <span className="text-red-500">*</span></label>
                <select 
                  value={formData.department} 
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  className="w-full flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>-- اختر القسم --</option>
                  {departments.map(dept => (
                    <option key={dept.name} value={dept.name}>{dept.name}</option>
                  ))}
                  {departments.length === 0 && <option value="عام">عام</option>}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-1">رقم النقابة <span className="text-red-500">*</span></label>
                <Input value={formData.syndicateNumber} onChange={e => setFormData({...formData, syndicateNumber: e.target.value})} placeholder="رقم القيد النقابي" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">النوع</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={() => setFormData({...formData, gender: 'male'})} /> ذكر
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={() => setFormData({...formData, gender: 'female'})} /> أنثى
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="submit" className="flex-1 text-md font-bold h-12" disabled={submitting}>
                {submitting ? <Spinner className="w-5 h-5 text-white" /> : <span className="flex items-center gap-2"><CheckCircle2 size={18} /> إنشاء حساب الطبيب</span>}
              </Button>
              <Button type="button" variant="outline" className="h-12" onClick={resetAndClose} disabled={submitting}>إلغاء</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
