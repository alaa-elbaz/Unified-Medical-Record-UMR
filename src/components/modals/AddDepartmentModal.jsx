import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import api from '@/services/api.js';
import { toast } from 'sonner';

export default function AddDepartmentModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bedCapacity: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('يرجى إدخال اسم القسم');

    try {
      setSubmitting(true);
      await api.post('/hospital/departments', formData);
      toast.success('تم إضافة القسم بنجاح');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء إضافة القسم');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-xl font-bold">إضافة قسم جديد</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">اسم القسم <span className="text-red-500">*</span></label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="مثال: الباطنة" required />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">وصف القسم (اختياري)</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-xl p-3 text-sm resize-none" rows="3" placeholder="وصف للخدمات التي يقدمها القسم..." />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">سعة الأسرة في القسم (اختياري)</label>
            <Input type="number" min="0" value={formData.bedCapacity} onChange={e => setFormData({...formData, bedCapacity: Number(e.target.value)})} />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="submit" className="flex-1 text-md font-bold h-12" disabled={submitting}>
              {submitting ? <Spinner className="w-5 h-5 text-white" /> : <span className="flex items-center gap-2"><CheckCircle2 size={18} /> حفظ القسم</span>}
            </Button>
            <Button type="button" variant="outline" className="h-12" onClick={onClose} disabled={submitting}>إلغاء</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
