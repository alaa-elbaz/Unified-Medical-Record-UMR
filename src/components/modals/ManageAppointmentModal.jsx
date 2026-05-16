import { useState, useEffect } from 'react';
import { X, CheckCircle2, MessageSquare, ListOrdered, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import api from '@/services/api.js';
import { toast } from 'sonner';

export default function ManageAppointmentModal({ isOpen, onClose, onSuccess, appointment }) {
  const [formData, setFormData] = useState({
    status: 'Pending',
    queueNumber: '',
    hospitalMessage: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (appointment && isOpen) {
      setFormData({
        status: appointment.status || 'Pending',
        queueNumber: appointment.queueNumber || '',
        hospitalMessage: appointment.hospitalMessage || ''
      });
    }
  }, [appointment, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.patch(`/appointments/${appointment._id}/status`, {
        status: formData.status,
        queueNumber: formData.queueNumber ? Number(formData.queueNumber) : null,
        hospitalMessage: formData.hospitalMessage
      });
      toast.success('تم تحديث الموعد بنجاح');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء تحديث الموعد');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-xl font-bold flex items-center gap-2"><Calendar size={20}/> إدارة الموعد</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="p-5 bg-gray-50 border-b">
          <p className="font-bold">{appointment.patientId?.fullName || "مريض غير معروف"}</p>
          <p className="text-sm text-gray-500">
            الوقت: {new Date(appointment.date).toLocaleDateString('ar-EG')} - {appointment.time}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-bold mb-1">حالة الموعد</label>
            <select 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              className="w-full h-10 rounded-md border px-3"
            >
              <option value="Pending">قيد الانتظار</option>
              <option value="Confirmed">مؤكد</option>
              <option value="In-Progress">جاري الفحص</option>
              <option value="Completed">مكتمل</option>
              <option value="Cancelled">ملغي</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold mb-1 text-indigo-700">
              <ListOrdered size={16} /> رقم الدور (Queue Number)
            </label>
            <Input 
              type="number" 
              min="1" 
              placeholder="مثال: 14"
              value={formData.queueNumber} 
              onChange={e => setFormData({...formData, queueNumber: e.target.value})} 
            />
            <p className="text-xs text-gray-500 mt-1">يظهر للمريض في حسابه لمعرفة دوره</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold mb-1 text-blue-700">
              <MessageSquare size={16} /> رسالة توجيهية للمريض (اختياري)
            </label>
            <textarea 
              value={formData.hospitalMessage} 
              onChange={e => setFormData({...formData, hospitalMessage: e.target.value})} 
              className="w-full border rounded-xl p-3 text-sm resize-none" 
              rows="3" 
              placeholder="مثال: يرجى الحضور قبل الموعد بـ 15 دقيقة لإجراء التحاليل..." 
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="submit" className="flex-1 text-md font-bold h-12" disabled={submitting}>
              {submitting ? <Spinner className="w-5 h-5 text-white" /> : <span className="flex items-center gap-2"><CheckCircle2 size={18} /> حفظ التعديلات</span>}
            </Button>
            <Button type="button" variant="outline" className="h-12" onClick={onClose} disabled={submitting}>إلغاء</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
