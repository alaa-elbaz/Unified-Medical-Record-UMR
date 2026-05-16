import React, { useState, useMemo } from 'react';
import { FileText, Pill, TestTubes, Image as ImageIcon, Calendar, Filter } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function MedicalTimeline({ records, prescriptions, labs, radiology, onEdit, onDelete, onViewDoc, onOpenPharmacy }) {
  const [filter, setFilter] = useState('all'); // all, records, prescriptions, labs, radiology

  const timelineItems = useMemo(() => {
    let items = [];

    records.forEach(r => items.push({ ...r, _type: 'record', _date: new Date(r.visitDate || r.createdAt) }));
    prescriptions.forEach(p => items.push({ ...p, _type: 'prescription', _date: new Date(p.createdAt) }));
    labs.forEach(l => items.push({ ...l, _type: 'lab', _date: new Date(l.date || l.createdAt) }));
    radiology.forEach(rad => items.push({ ...rad, _type: 'radiology', _date: new Date(rad.date || rad.createdAt) }));

    items.sort((a, b) => b._date - a._date);

    if (filter !== 'all') {
      items = items.filter(item => item._type === filter);
    }

    return items;
  }, [records, prescriptions, labs, radiology, filter]);

  const typeConfig = {
    record: { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'سجل طبي' },
    prescription: { icon: Pill, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'وصفة طبية' },
    lab: { icon: TestTubes, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: 'نتيجة مختبر' },
    radiology: { icon: ImageIcon, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', label: 'تقرير أشعة' }
  };

  if (records.length === 0 && prescriptions.length === 0 && labs.length === 0 && radiology.length === 0) {
    return <EmptyState icon={Calendar} title="لا يوجد تاريخ طبي" description="لم يتم تسجيل أي أحداث طبية في ملفك حتى الآن." />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-100 dark:border-slate-800">
        <Filter size={16} className="text-gray-400 ml-2" />
        {[
          { id: 'all', label: 'الكل' },
          { id: 'record', label: 'التشخيصات' },
          { id: 'prescription', label: 'الأدوية' },
          { id: 'lab', label: 'التحاليل' },
          { id: 'radiology', label: 'الأشعة' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${
              filter === f.id
                ? 'bg-sky-600 text-white shadow-md scale-105'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative border-r-2 border-gray-100 dark:border-slate-800 pr-6 space-y-8 pb-10">
        {timelineItems.length === 0 ? (
          <div className="py-10 text-center text-gray-500 font-bold">لا توجد أحداث مطابقة للفلتر المحدد</div>
        ) : (
          timelineItems.map((item, idx) => {
            const config = typeConfig[item._type];
            const Icon = config.icon;
            return (
              <div key={`${item._type}-${item._id}`} className="relative group">
                {/* Timeline Dot */}
                <div className={`absolute -right-[35px] w-10 h-10 rounded-full border-4 border-white dark:border-slate-950 flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110 duration-300 ${config.bg} ${config.color}`}>
                  <Icon size={16} strokeWidth={2.5} />
                </div>

                {/* Content Card */}
                <div className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border ${config.border} shadow-sm hover:shadow-md transition-all duration-300 group-hover:-translate-x-1`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>{config.label}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">{item._date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                        {item._type === 'record' ? item.diagnosis :
                         item._type === 'prescription' ? item.medication :
                         item._type === 'lab' ? item.testName : item.scanType}
                      </h3>
                    </div>
                    {/* Source Badge */}
                    {item.source === 'Patient' && <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] rounded-full font-bold border border-indigo-200 dark:border-indigo-800/50">إدخال ذاتي</span>}
                  </div>

                  {/* Body Content based on type */}
                  <div className="text-sm text-gray-600 dark:text-slate-300">
                    {item._type === 'record' && (
                      <p className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">{item.notes || 'لا توجد ملاحظات إضافية'}</p>
                    )}
                    {item._type === 'prescription' && (
                      <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                        <div><span className="text-gray-400 text-xs">الجرعة:</span> <span className="font-bold">{item.dose}</span></div>
                        <div><span className="text-gray-400 text-xs">المدة:</span> <span className="font-bold">{item.duration}</span></div>
                      </div>
                    )}
                    {item._type === 'radiology' && item.report && (
                      <p className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 text-xs">{item.report}</p>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-3">
                      {(item.filePath || item.labFile || item.imagePath) && (
                        <button onClick={(e) => onViewDoc(e, item.filePath || item.labFile || item.imagePath)} className="text-sky-600 dark:text-sky-400 text-xs font-bold hover:underline flex items-center gap-1">
                          <FileText size={14} /> عرض المستند
                        </button>
                      )}
                      {item._type === 'prescription' && item.status === 'pending' && !item.requestedPharmacy && (
                        <button onClick={() => onOpenPharmacy(item._id)} className="text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:underline flex items-center gap-1">
                          🛒 طلب من صيدلية
                        </button>
                      )}
                    </div>
                    {item.source === 'Patient' && (
                      <div className="flex gap-3">
                        <button onClick={() => onEdit(item._type, item)} className="text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition">تعديل</button>
                        <button onClick={() => onDelete(item._type, item._id)} className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold transition">حذف</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
