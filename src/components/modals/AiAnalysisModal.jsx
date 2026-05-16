import { useState } from 'react'
import { X, Brain, Loader2, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import api from '@/services/api.js'
import { toast } from 'sonner'

const RISK_CONFIG = {
  low: { label: 'منخفض', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  medium: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Info },
  high: { label: 'مرتفع', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle }
}

export default function AiAnalysisModal({ isOpen, onClose, patientId, patientName }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [serviceUnavailable, setServiceUnavailable] = useState(false)

  const handleAnalyze = async () => {
    if (!patientId) return
    try {
      setLoading(true)
      setResult(null)
      setServiceUnavailable(false)
      const { data } = await api.post('/ai/analyze', { patientId, hasConsented: true })
      setResult(data)
    } catch (err) {
      if (err.response?.status === 503) {
        setServiceUnavailable(true)
      } else {
        toast.error(err.response?.data?.message || 'تعذر تشغيل التحليل الذكي')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setServiceUnavailable(false)
    onClose()
  }

  if (!isOpen) return null

  const risk = result?.analysis?.riskLevel
  const riskCfg = RISK_CONFIG[risk] || RISK_CONFIG.low
  const RiskIcon = riskCfg.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-l from-indigo-50 to-blue-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">التحليل السريري الذكي</h3>
              <p className="text-xs text-gray-500">{patientName ? `للمريض: ${patientName}` : 'يرجى التحقق من بيانات المريض'}</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/70 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* ─── Service Unavailable Banner ─── */}
          {serviceUnavailable && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">الخدمة غير متاحة</h4>
              <p className="text-gray-500 text-sm max-w-sm mb-4">
                خدمة الذكاء الاصطناعي غير متوفرة حالياً، يرجى المحاولة لاحقاً.
              </p>
              <Button variant="outline" onClick={handleClose}>إغلاق</Button>
            </div>
          )}

          {/* ─── Initial CTA ─── */}
          {!result && !loading && !serviceUnavailable && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Brain size={32} className="text-indigo-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">جاهز للتحليل</h4>
              <p className="text-gray-500 text-sm mb-6 max-w-sm">
                سيقوم النظام بجمع كامل البيانات الطبية وتحليلها للكشف عن التفاعلات الدوائية والمخاطر السريرية.
              </p>

              <div className="w-full max-w-lg mb-6 rounded-xl border border-blue-200 bg-blue-50 p-3 text-right">
                <p className="text-xs text-blue-700 leading-relaxed">
                  💡 <strong>ملاحظة:</strong> هذا التحليل يعتمد على الذكاء الاصطناعي كأداة مساعدة ولا يُغني عن استشارة الطبيب المختص.
                </p>
              </div>

              <Button
                id="ai-analyze-btn"
                onClick={handleAnalyze}
                className="gap-2 px-8 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Brain size={18} />
                بدء التحليل الذكي
              </Button>
            </div>
          )}

          {/* ─── Loading ─── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
              <p className="text-gray-600 font-semibold">جاري تجميع وتحليل البيانات الطبية...</p>
              <p className="text-gray-400 text-sm mt-1">قد يستغرق هذا بضع ثوانٍ</p>
            </div>
          )}

          {/* ─── Result ─── */}
          {result && (
            <div className="space-y-5">
              {/* Risk Level Badge */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${riskCfg.color}`}>
                <RiskIcon size={22} />
                <div>
                  <span className="font-bold text-sm">مستوى الخطورة السريرية: {riskCfg.label}</span>
                  {result.analysis?.drugWarnings?.length > 0 && (
                    <p className="text-xs mt-0.5">تم اكتشاف {result.analysis.drugWarnings.length} تحذير دوائي</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Brain size={15} className="text-indigo-500" /> ملخص التحليل
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">{result.analysis?.summary}</p>
              </div>

              {/* Recommendations */}
              {result.analysis?.recommendations?.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1">
                    <CheckCircle size={15} /> التوصيات
                  </p>
                  <ul className="space-y-1">
                    {result.analysis.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-blue-600 flex gap-2"><span>•</span>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Drug Warnings */}
              {result.analysis?.drugWarnings?.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle size={15} /> تحذيرات التفاعل الدوائي
                  </p>
                  <ul className="space-y-1">
                    {result.analysis.drugWarnings.map((w, i) => (
                      <li key={i} className="text-sm text-red-600">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Patient Snapshot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-500 font-semibold mb-1">فصيلة الدم</p>
                  <p className="font-bold text-blue-800">{result.payload?.patient?.bloodType || '—'}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <p className="text-xs text-purple-500 font-semibold mb-1">الوصفات النشطة</p>
                  <p className="font-bold text-purple-800">{result.payload?.activePrescriptions?.length || 0}</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl col-span-2">
                  <p className="text-xs text-orange-500 font-semibold mb-1">الأمراض المزمنة</p>
                  <p className="font-bold text-orange-800">
                    {result.payload?.patient?.chronicDiseases?.join('، ') || 'لا توجد'}
                  </p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700 text-center leading-relaxed">
                  ⚠️ {result.analysis?.disclaimer}
                </p>
              </div>

              <Button
                onClick={() => { setResult(null); setHasConsented(false) }}
                variant="outline"
                className="w-full gap-2 text-indigo-600 border-indigo-200"
              >
                <Brain size={16} /> إعادة التحليل
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
