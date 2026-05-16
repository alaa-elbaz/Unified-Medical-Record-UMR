import { useState, useEffect } from 'react'
import { X, Stethoscope, FileText, CalendarDays, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import api from '@/services/api.js'
import { toast } from 'sonner'

export default function AddVisitModal({ isOpen, onClose, patient, onSuccess }) {
  const [formData, setFormData] = useState({
    diagnosis: '',
    notes: '',
    visitDate: new Date().toISOString().split('T')[0],
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFormData({
        diagnosis: '',
        notes: '',
        visitDate: new Date().toISOString().split('T')[0],
      })
      setErrors({})
    }
  }, [isOpen])

  if (!isOpen) return null

  const validate = () => {
    const errs = {}
    if (!formData.diagnosis.trim() || formData.diagnosis.trim().length < 3)
      errs.diagnosis = 'يرجى كتابة التشخيص بوضوح (3 أحرف على الأقل)'
    if (!formData.visitDate)
      errs.visitDate = 'تاريخ الزيارة مطلوب'
    return errs
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    try {
      setSubmitting(true)
      // POST /api/records — requires: patientId, diagnosis, notes, visitDate
      await api.post('/records', {
        patientId: patient._id,
        diagnosis: formData.diagnosis.trim(),
        notes: formData.notes.trim() || undefined,
        visitDate: formData.visitDate,
      })
      toast.success('تم إضافة التشخيص بنجاح ✅')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر حفظ التشخيص')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-l from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Stethoscope size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">إضافة تشخيص / زيارة</h3>
              <p className="text-xs text-gray-500">
                {patient?.fullName ? `للمريض: ${patient.fullName}` : 'يرجى التحقق من بيانات المريض'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/70 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Diagnosis */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <FileText size={15} className="text-emerald-600" />
              التشخيص الطبي <span className="text-red-500">*</span>
            </label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              rows={3}
              placeholder="مثال: التهاب حاد في الجيوب الأنفية — يُنصح بالراحة والمضادات الحيوية"
              className={`w-full px-4 py-3 rounded-xl border-2 text-sm resize-none transition-colors focus:outline-none 
                ${errors.diagnosis
                  ? 'border-red-300 focus:border-red-500 bg-red-50'
                  : 'border-gray-200 focus:border-emerald-500 bg-gray-50 focus:bg-white'
                }`}
            />
            {errors.diagnosis && (
              <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={13} /> {errors.diagnosis}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <FileText size={15} className="text-gray-400" />
              ملاحظات إضافية <span className="text-gray-400 font-normal text-xs">(اختياري)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="أي معلومات إضافية عن الحالة، التوصيات، أو المتابعة..."
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-400 focus:outline-none text-sm resize-none bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Visit Date */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <CalendarDays size={15} className="text-emerald-600" />
              تاريخ الزيارة <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              name="visitDate"
              value={formData.visitDate}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className={`h-11 border-2 ${errors.visitDate ? 'border-red-300' : 'border-gray-200'}`}
              dir="ltr"
            />
            {errors.visitDate && (
              <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={13} /> {errors.visitDate}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <CheckCircle size={16} />
              {submitting ? 'جاري الحفظ...' : 'حفظ التشخيص'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="px-6"
            >
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
