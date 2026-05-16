import { useState, useEffect } from 'react'
import { X, Pill, Clock, Activity, User, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import api from '@/services/api.js'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner.jsx'

export default function AddPrescriptionModal({ isOpen, onClose, initialPatientId = null, onSuccess }) {
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: initialPatientId || '',
    medication: '',
    dose: '',
    duration: '',
    isChronic: false
  });

  const [errors, setErrors] = useState({});

  const [isChecking, setIsChecking] = useState(false);
  const [interactionResult, setInteractionResult] = useState(null);

  useEffect(() => {
    // جلب قائمة المرضى إذا لم يتم تمرير مُعرف المريض كخاصية
    if (isOpen && !initialPatientId) {
      const fetchPatients = async () => {
        try {
          setLoadingPatients(true);
          const res = await api.get('/patients');
          // ✅ الخادم يرجع { data: [...], total } وليس { patients: [...] }
          setPatients(res.data.data || res.data.patients || []);
        } catch (error) {
          toast.error('حدث خطأ أثناء جلب قائمة المرضى');
        } finally {
          setLoadingPatients(false);
        }
      };
      fetchPatients();
    }
  }, [isOpen, initialPatientId]);

  // إعادة تعيين النموذج عند الفتح/الإغلاق
  useEffect(() => {
    if (isOpen) {
      setFormData({
        patientId: initialPatientId || '',
        medication: '',
        dose: '',
        duration: '',
        isChronic: false
      });
      setErrors({});
      setInteractionResult(null);
    }
  }, [isOpen, initialPatientId]);

  const handleCheckDrug = async () => {
    if (!formData.patientId) return toast.error('يرجى اختيار المريض أولاً');
    if (!formData.medication || formData.medication.length < 2) return toast.error('يرجى كتابة اسم الدواء بشكل صحيح');
    try {
      setIsChecking(true);
      // Fetch patient's past prescriptions and details for checking
      const [prescRes, patRes] = await Promise.all([
        api.get(`/prescriptions/patient/${formData.patientId}`),
        api.get(`/patients/${formData.patientId}`)
      ]);
      const currentDrugs = (prescRes.data.data || prescRes.data).map(p => p.medication);
      const allergies = (patRes.data.data || patRes.data)?.allergies || [];
      
      const { data } = await api.post('/ai/check-interactions', {
        newDrug: formData.medication,
        currentDrugs,
        allergies
      });
      setInteractionResult(data.data);
    } catch (error) {
      toast.error('فشل فحص التعارض الدوائي');
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.patientId) newErrors.patientId = 'يرجى اختيار المريض';
    if (!formData.medication || formData.medication.length < 2) newErrors.medication = 'اسم الدواء يجب أن يكون حرفين على الأقل';
    if (!formData.dose || formData.dose.length < 2) newErrors.dose = 'يرجى كتابة الجرعة بشكل واضح (مثال: حبة يومياً)';
    if (!formData.duration || formData.duration.length < 2) newErrors.duration = 'يرجى تحديد المدة (مثال: أسبوع)';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    // مسح الخطأ عند التعديل
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/prescriptions', formData);
      toast.success('تمت إضافة الوصفة الطبية بنجاح');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إضافة الوصفة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Pill className="text-blue-600" size={24} />
              إضافة وصفة طبية
            </h3>
            <p className="text-sm text-gray-500 mt-1">قم بتعبئة تفاصيل العلاج والجرعة المحددة</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* إخفاء اختيار المريض إذا تم تمرير المُعرف كخاصية (مثلاً من صفحة ملف المريض) */}
            {!initialPatientId && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User size={16} className="text-gray-400" />
                  اسم المريض
                </label>
                <select
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleChange}
                  className={`w-full px-4 text-right py-2.5 rounded-xl border bg-gray-50 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.patientId ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200'
                  }`}
                  disabled={loadingPatients}
                >
                  <option value="">{loadingPatients ? 'جاري تحميل المرضى...' : 'اختر المريض'}</option>
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName} - {p.nationalId}</option>
                  ))}
                </select>
                {errors.patientId && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium">
                    <AlertCircle size={14} /> {errors.patientId}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Pill size={16} className="text-gray-400" />
                اسم الدواء
              </label>
              <div className="flex gap-2">
                <Input
                  name="medication"
                  value={formData.medication}
                  onChange={(e) => { handleChange(e); setInteractionResult(null); }}
                  placeholder="أدخل اسم الدواء"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCheckDrug} 
                  disabled={isChecking || !formData.medication}
                  className="shrink-0 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {isChecking ? <Spinner className="w-4 h-4" /> : 'فحص التعارض'}
                </Button>
              </div>
              {errors.medication && (
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium">
                  <AlertCircle size={14} /> {errors.medication}
                </p>
              )}
              {interactionResult && (
                <div className={`mt-2 p-3 text-sm rounded-lg border ${
                  interactionResult.status === 'Danger' ? 'bg-red-50 border-red-200 text-red-800' :
                  interactionResult.status === 'Warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <strong>{interactionResult.status === 'Safe' ? '✅ آمن: ' : '⚠️ تنبيه: '}</strong>
                  {interactionResult.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Activity size={16} className="text-gray-400" />
                  الجرعة
                </label>
                <Input
                  name="dose"
                  value={formData.dose}
                  onChange={handleChange}
                  placeholder="مثال: حبة واحدة كل 8 ساعات"
                />
                {errors.dose && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium">
                    <AlertCircle size={14} /> {errors.dose}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock size={16} className="text-gray-400" />
                  المدة
                </label>
                <Input
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="مثال: 5 أيام"
                />
                {errors.duration && (
                  <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium">
                    <AlertCircle size={14} /> {errors.duration}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="isChronic"
                name="isChronic"
                checked={formData.isChronic}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isChronic" className="text-sm font-medium text-gray-700 cursor-pointer">
                هذا دواء مزمن (مستمر)
              </label>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'حفظ الوصفة'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
