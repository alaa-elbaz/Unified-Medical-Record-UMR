import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heart, Activity, Droplets, Phone, ShieldAlert, BadgeCheck } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import api from '@/services/api'
import { Spinner } from '@/components/ui/spinner'

export default function MedicalReportPrint() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        // Pass `?patientId=` to labs/radiology so the backend authorizes and
        // returns this patient's records — relying on a client-side filter
        // (previous behaviour) leaked the requester's own labs whenever the
        // backend returned a record without a patientId field.
        const [patientRes, recRes, presRes, labRes, radRes] = await Promise.all([
          api.get(`/patients/${id}`),
          api.get(`/records/patient/${id}`),
          api.get(`/prescriptions/${id}`),
          api.get(`/labs`, { params: { patientId: id } }),
          api.get(`/radiology`, { params: { patientId: id } }),
        ])

        // Strict filter: only include items whose patientId actually matches.
        // If the field is missing we exclude it (safer than including).
        const matchesPatient = (item) => {
          const pid = item?.patientId
          if (!pid) return false
          if (typeof pid === 'string') return pid === id
          return pid._id === id || pid.id === id
        }

        setData({
          patient: patientRes.data.data,
          records: recRes.data.data.slice(0, 20),
          prescriptions: presRes.data.data.slice(0, 20),
          labs: (labRes.data.data || []).filter(matchesPatient),
          radiology: (radRes.data.data || []).filter(matchesPatient),
        })
      } catch (err) {
        setError("تعذر جلب السجل الطبي الموحد")
      } finally {
        setLoading(false)
      }
    }
    fetchFullData()
  }, [id])

  useEffect(() => {
    if (!loading && data && !error) {
      // Wait for fonts (Tajawal) before printing — the previous 800ms timeout
      // was flaky on cold cache. document.fonts.ready resolves as soon as the
      // browser has loaded all referenced fonts.
      const triggerPrint = () => window.print()
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        document.fonts.ready.then(triggerPrint)
      } else {
        setTimeout(triggerPrint, 800)
      }
    }
  }, [loading, data, error])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-10 h-10" /></div>
  if (error) return <div className="text-center p-20 text-red-600 font-bold">{error}</div>

  const { patient, records, prescriptions, labs, radiology } = data

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto text-black" dir="rtl">
      
      <style>{`
        @media print {
          body { direction: rtl; }
          .page-break-avoid { page-break-inside: avoid; }
          @page { margin: 15mm; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="flex justify-between items-start border-b-4 border-indigo-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-indigo-900 mb-2">MedCore UMR</h1>
          <h2 className="text-xl font-bold text-gray-600">السجل الطبي الشامل (Unified Medical Record)</h2>
          <p className="text-sm text-gray-500 mt-2">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        <div className="text-center">
          <QRCodeSVG value={`${window.origin}/emergency/${patient._id}`} size={80} level="M" includeMargin={false} />
          <p className="text-[10px] text-gray-500 mt-1 font-bold">مسح للطوارئ</p>
        </div>
      </div>

      {/* ── Patient Identity ── */}
      <section className="mb-8">
        <h3 className="text-lg font-black text-indigo-900 mb-4 bg-indigo-50 inline-block px-4 py-1 rounded-full border border-indigo-100">البيانات الأساسية</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-gray-50">
          <div><p className="text-xs text-gray-500 font-bold">الاسم الرباعي</p><p className="font-bold">{patient.fullName}</p></div>
          <div><p className="text-xs text-gray-500 font-bold">الرقم القومي</p><p className="font-bold">{patient.nationalId}</p></div>
          <div><p className="text-xs text-gray-500 font-bold">تاريخ الميلاد</p><p className="font-bold text-left" dir="ltr">{new Date(patient.dateOfBirth).toLocaleDateString('en-GB')}</p></div>
          <div><p className="text-xs text-gray-500 font-bold">النوع</p><p className="font-bold">{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</p></div>
        </div>
      </section>

      {/* ── Critical Medical Data ── */}
      <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border-l-4 border-red-500 p-4 bg-red-50 rounded-xl">
          <p className="text-red-700 font-black text-sm flex gap-2 items-center mb-1"><Droplets size={16}/> فصيلة الدم</p>
          <p className="text-3xl font-black text-red-600" dir="ltr">{patient.bloodType || '؟'}</p>
        </div>
        <div className="border-l-4 border-orange-500 p-4 bg-orange-50 rounded-xl">
          <p className="text-orange-700 font-black text-sm flex gap-2 items-center mb-1"><ShieldAlert size={16}/> الحساسيات</p>
          <p className="font-bold text-sm text-gray-800">{patient.allergies?.length > 0 ? patient.allergies.join('، ') : 'لا يوجد'}</p>
        </div>
        <div className="border-l-4 border-purple-500 p-4 bg-purple-50 rounded-xl">
          <p className="text-purple-700 font-black text-sm flex gap-2 items-center mb-1"><Activity size={16}/> الأمراض المزمنة</p>
          <p className="font-bold text-sm text-gray-800">{patient.chronicDiseases?.length > 0 ? patient.chronicDiseases.join('، ') : 'لا يوجد'}</p>
        </div>
        {patient.emergencyContact?.name && (
          <div className="md:col-span-3 border border-gray-200 p-3 bg-white rounded-lg flex items-center justify-between">
            <span className="text-sm font-bold text-gray-600"><Phone className="inline mr-1" size={14}/> جهة اتصال طوارئ:</span>
            <span className="font-bold text-sm">{patient.emergencyContact.name} ({patient.emergencyContact.relation}) - <span dir="ltr">{patient.emergencyContact.phone}</span></span>
          </div>
        )}
      </section>

      {/* ── Diagnoses ── */}
      <section className="mb-8 page-break-avoid">
        <h3 className="text-lg font-black text-indigo-900 mb-3 border-b-2 border-indigo-100 pb-2">سجل التشخيصات والملاحظات</h3>
        {records.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-2 border text-right">التاريخ</th>
                <th className="p-2 border text-right">وجهة الإدخال</th>
                <th className="p-2 border text-right w-1/2">التشخيص أو الشكوى</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 border text-gray-600 truncate" dir="ltr">{new Date(r.visitDate || r.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="p-2 border font-bold">{r.source === 'Patient' ? 'المريض' : 'طبيب'}</td>
                  <td className="p-2 border whitespace-pre-wrap">{r.diagnosis} {r.notes && <span className="text-gray-500 text-xs block mt-1">{r.notes}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-gray-500">لا توجد سجلات</p>}
      </section>

      {/* ── Prescriptions ── */}
      <section className="mb-8 page-break-avoid">
        <h3 className="text-lg font-black text-indigo-900 mb-3 border-b-2 border-indigo-100 pb-2">الوصفات الطبية الحالية</h3>
        {prescriptions.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-2 border text-right">التاريخ</th>
                <th className="p-2 border text-right w-1/3">اسم الدواء</th>
                <th className="p-2 border text-right">الجرعة</th>
                <th className="p-2 border text-right">المدة</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.map((p, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2 border text-gray-600" dir="ltr">{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="p-2 border font-bold text-indigo-900">{p.medication}</td>
                  <td className="p-2 border">{p.dose}</td>
                  <td className="p-2 border">{p.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-gray-500">لا توجد أدوية</p>}
      </section>

      {/* ── Labs & Radiology ── */}
      <div className="grid grid-cols-2 gap-8 mb-8 page-break-avoid">
        <section>
          <h3 className="text-lg font-black text-indigo-900 mb-3 border-b-2 border-indigo-100 pb-2">نتائج المختبر</h3>
          {labs.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {labs.map((l, i) => (
                <li key={i} className="flex justify-between border-b pb-1">
                  <span className="font-bold">{l.testName}</span>
                  <span className="text-gray-500" dir="ltr">{new Date(l.createdAt).toLocaleDateString('en-GB')}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">لا توجد تحاليل</p>}
        </section>
        <section>
          <h3 className="text-lg font-black text-indigo-900 mb-3 border-b-2 border-indigo-100 pb-2">تقارير الأشعة</h3>
          {radiology.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {radiology.map((r, i) => (
                <li key={i} className="flex justify-between border-b pb-1">
                  <span className="font-bold">{r.scanType}</span>
                  <span className="text-gray-500" dir="ltr">{new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">لا توجد أشعة</p>}
        </section>
      </div>

      <div className="mt-12 text-center text-xs text-gray-400 border-t pt-4">
        <p>Unified Digital Medical Record System (UMR)</p>
        <p>هذا التقرير تم إنشاؤه إلكترونياً ولا يحتاج إلى توقيع. للاستخدام المهني فقط.</p>
      </div>

      <div className="mt-8 text-center print:hidden">
        <button onClick={() => window.close()} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300">إغلاق الصفحة</button>
      </div>

    </div>
  )
}
