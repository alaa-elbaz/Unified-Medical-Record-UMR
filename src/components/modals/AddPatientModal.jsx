import { useState } from 'react'
import { Input } from '@/components/ui/input.jsx'
import { Button } from '@/components/ui/button.jsx'
import api from '@/services/api.js'
import { X } from 'lucide-react'
import { toast } from 'sonner'

export default function AddPatientModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    phoneNumber: '',
    gender: 'male'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) { setError('اسم المريض مطلوب'); return false; }
    if (!formData.nationalId.trim() || formData.nationalId.length !== 14 || !/^\d{14}$/.test(formData.nationalId)) {
      setError('الرقم القومي يجب أن يتكون من 14 رقم'); return false;
    }
    if (!formData.phoneNumber.trim()) { setError('رقم الهاتف مطلوب'); return false; }
    if (!/^01[0125]\d{8}$/.test(formData.phoneNumber.trim())) {
      setError('رقم الهاتف غير صالح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)'); return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateForm()) { toast.error(error || 'يرجى التحقق من البيانات'); return; }
    setLoading(true);

    try {
      await api.post('/patients', formData);
      toast.success('تم تسجيل المريض بنجاح!');
      setFormData({ fullName: '', nationalId: '', phoneNumber: '', gender: 'male' });
      onClose();
    } catch (err) {
      console.error('Error adding patient:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
        toast.error(err.response.data.message);
      } else {
        setError('حدث خطأ أثناء تسجيل المريض.');
        toast.error('حدث خطأ أثناء تسجيل المريض.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" dir="rtl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-800">تسجيل مريض جديد</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الرباعي</label>
              <Input
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="أدخل اسم المريض بالكامل"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الرقم القومي (14 رقم)</label>
              <Input
                name="nationalId"
                value={formData.nationalId}
                onChange={handleChange}
                maxLength="14"
                required
                placeholder="أدخل الرقم القومي"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
                <Input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  type="tel"
                  required
                  placeholder="رقم الموبايل"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">النوع</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg h-11 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-gray-700 hover:border-gray-400"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="px-6"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-8 shadow-md shadow-blue-600/20"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}