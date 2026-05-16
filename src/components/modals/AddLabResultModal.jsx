import { useState, useEffect } from 'react'
import { X, FileText, User, Activity, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import api from '@/services/api.js'
import { toast } from 'sonner'

export default function AddLabResultModal({ isOpen, onClose, onSuccess, prefilledPatientId, prefilledTestName, appointmentId }) {
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    patientId: prefilledPatientId || '',
    testName: prefilledTestName || '',
    result: '',
    labName: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        patientId: prefilledPatientId || '',
        testName: prefilledTestName || '',
        result: '',
        labName: ''
      });
      const fetchPatients = async () => {
        try {
          setLoadingPatients(true);
          const res = await api.get('/patients?limit=500'); // get enough patients to show in dropdown
          setPatients(res.data.data || res.data.patients || []);
        } catch (error) {
          toast.error('حدث خطأ أثناء جلب المرضى');
        } finally {
          setLoadingPatients(false);
        }
      };
      fetchPatients();
    }
  }, [isOpen, prefilledPatientId, prefilledTestName]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.patientId || !formData.testName || !formData.result) {
      toast.error("يرجى ملء جميع الحقول المطلوبة (المريض، اسم الفحص، النتيجة)");
      return;
    }

    try {
      setSubmitting(true);
      const payload = { ...formData, date: new Date().toISOString() };
      if (appointmentId) {
        payload.appointmentId = appointmentId;
      }
      await api.post('/labs', payload);
      toast.success('تمت إضافة النتيجة بنجاح');
      if (onSuccess) onSuccess();
      onClose();
      // reset form
      setFormData({
        patientId: '',
        testName: '',
        result: '',
        labName: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إضافة النتيجة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600" size={24} />
              إضافة نتيجة فحص
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User size={16} className="text-gray-400" /> المريض *
              </label>
              <select
                name="patientId"
                value={formData.patientId}
                onChange={handleChange}
                className="w-full px-4 text-right py-2.5 rounded-xl border bg-gray-50 border-gray-200 transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                disabled={loadingPatients || !!prefilledPatientId}
              >
                <option value="">{loadingPatients ? 'جاري التحميل...' : 'اختر المريض'}</option>
                {patients.map(p => (
                  <option key={p._id} value={p._id}>{p.fullName} - {p.nationalId}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Activity size={16} className="text-gray-400" /> اسم الفحص *
              </label>
              <Input name="testName" value={formData.testName} onChange={handleChange} placeholder="مثال: صورة دم كاملة (CBC)" />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText size={16} className="text-gray-400" /> النتيجة *
              </label>
              <Input name="result" value={formData.result} onChange={handleChange} placeholder="مثال: طبيعي، أو وصف مختصر" />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Activity size={16} className="text-gray-400" /> اسم المختبر منفذ الفحص
              </label>
              <Input name="labName" value={formData.labName} onChange={handleChange} placeholder="مثال: مختبرات ألفا الفرع الرئيسي" />
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'حفظ النتيجة'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
