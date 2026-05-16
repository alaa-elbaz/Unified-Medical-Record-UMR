import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, User, Building, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import api from '@/services/api.js';
import { toast } from 'sonner';

const SPECIALTY_REASONS = {
  'باطنة': ['ألم بالبطن', 'حمى', 'غثيان', 'متابعة سكر/ضغط', 'إسهال مزمن', 'فقدان شهية', 'انتفاخ وغازات'],
  'قلب': ['ألم بالصدر', 'عدم انتظام ضربات القلب', 'متابعة دورية', 'ارتفاع ضغط الدم', 'ضيق تنفس', 'دوخة'],
  'أطفال': ['تطعيم', 'حمى', 'سعال', 'كشف روتيني', 'نزلة معوية', 'طفح جلدي', 'تأخر نمو'],
  'أسنان': ['ألم بالأسنان', 'حشو', 'خلع', 'تنظيف', 'تقويم', 'زراعة', 'تبييض'],
  'عظام': ['ألم بالمفاصل', 'كسر', 'متابعة علاج طبيعي', 'ألم بالظهر', 'خشونة الركبة', 'إصابة رياضية'],
  'عيون': ['ضعف النظر', 'احمرار العين', 'كشف قاع عين', 'متابعة نظارة'],
  'أنف وأذن': ['التهاب الأذن', 'انسداد الأنف', 'التهاب الحلق', 'ضعف السمع'],
  'جلدية': ['طفح جلدي', 'حب الشباب', 'تساقط الشعر', 'حساسية جلدية', 'فطريات'],
  'نساء وتوليد': ['متابعة حمل', 'كشف دوري', 'اضطراب الدورة', 'فحص ما قبل الزواج'],
  'مسالك بولية': ['حصوات', 'التهاب مجرى البول', 'صعوبة التبول'],
  'نفسية': ['قلق', 'اكتئاب', 'أرق', 'استشارة نفسية'],
  'default': ['كشف عام', 'متابعة نتائج', 'استشارة', 'فحص دوري', 'تجديد روشتة']
};

const APPOINTMENT_TYPES = [
  { value: 'New Check-up', label: 'كشف جديد' },
  { value: 'Consultation', label: 'استشارة' }
];

export default function BookAppointmentModal({ isOpen, onClose, onSuccess, editAppointment = null, prefilledAppointment = null }) {
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdowns state
  const [searchDoctor, setSearchDoctor] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  const [searchOrg, setSearchOrg] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedProviderType, setSelectedProviderType] = useState(null);

  // Hospital specific state
  const [hospitalData, setHospitalData] = useState([]); // Array of { name: 'dept', doctors: [] }
  const [selectedDeptName, setSelectedDeptName] = useState('');
  const [loadingHospitalData, setLoadingHospitalData] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    organizationId: '',
    specialty: '',
    date: '',
    time: '',
    appointmentType: 'New Check-up',
    reason: '',
    commonReason: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
      if (editAppointment) {
        // Pre-fill form for editing
        setFormData({
          patientId: '',
          doctorId: editAppointment.doctorId?._id || '',
          organizationId: editAppointment.organizationId?._id || '',
          specialty: editAppointment.doctorId?.specialty || '',
          date: editAppointment.date ? new Date(editAppointment.date).toISOString().split('T')[0] : '',
          time: editAppointment.time || editAppointment.timeSlot || '',
          appointmentType: editAppointment.appointmentType || 'New Check-up',
          reason: editAppointment.reason || '',
          commonReason: ''
        });
        if (editAppointment.doctorId) {
          setSearchDoctor(editAppointment.doctorId.fullName || '');
          setSelectedProviderType('doctor');
        } else if (editAppointment.organizationId) {
          setSearchOrg(editAppointment.organizationId.name || '');
          setSelectedProviderType(editAppointment.organizationId.providerType || 'hospital');
        }
      } else if (prefilledAppointment) {
        setFormData({
          patientId: prefilledAppointment.patientId || '',
          doctorId: '',
          organizationId: prefilledAppointment.organizationId || '',
          specialty: '',
          date: '',
          time: '',
          appointmentType: prefilledAppointment.type === 'lab' ? 'New Check-up' : 'Consultation',
          reason: prefilledAppointment.reason || '',
          commonReason: prefilledAppointment.reason || ''
        });
        if (prefilledAppointment.organizationId) {
          setSelectedProviderType(prefilledAppointment.type === 'lab' ? 'lab' : 'hospital');
        }
        setSearchDoctor('');
        setSearchOrg('');
        setAvailableSlots([]);
        setErrors({});
        setSelectedProviderType(prefilledAppointment.type === 'lab' ? 'lab' : 'hospital');
        setHospitalData([]);
        setSelectedDeptName('');
      } else {
        resetForm();
      }
    }
  }, [isOpen, editAppointment, prefilledAppointment]);

  const resetForm = () => {
    setFormData({
      patientId: '',
      doctorId: '',
      organizationId: '',
      specialty: '',
      date: '',
      time: '',
      appointmentType: 'New Check-up',
      reason: '',
      commonReason: ''
    });
    setSearchDoctor('');
    setSearchOrg('');
    setAvailableSlots([]);
    setErrors({});
    setSelectedProviderType(null);
    setHospitalData([]);
    setSelectedDeptName('');
  };

  const fetchProviders = async () => {
    try {
      setLoadingProviders(true);
      const res = await api.get('/booking/providers');
      setProviders(res.data.data || []);
    } catch (error) {
      toast.error('حدث خطأ أثناء جلب قائمة مقدمي الخدمة');
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    if (selectedProviderType === 'hospital' && formData.organizationId) {
      setLoadingHospitalData(true);
      api.get(`/booking/hospital/${formData.organizationId}/departments-doctors`)
         .then(res => {
           setHospitalData(res.data.data || []);
           setSelectedDeptName('');
         })
         .catch(err => {
           console.error(err);
           setHospitalData([]);
         })
         .finally(() => setLoadingHospitalData(false));
    } else {
      setHospitalData([]);
      setSelectedDeptName('');
    }
  }, [formData.organizationId, selectedProviderType]);

  useEffect(() => {
    if ((formData.doctorId || formData.organizationId) && formData.date) {
      fetchSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [formData.doctorId, formData.organizationId, formData.date]);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      const queryKey = formData.doctorId ? 'doctorId' : 'organizationId';
      const targetVal = formData.doctorId || formData.organizationId;
      const res = await api.get(`/booking/available-slots?date=${formData.date}&${queryKey}=${targetVal}`);
      const data = res.data.data || [];
      // Fallback slots if API is empty for presentation purposes
      if (data.length === 0) {
        setAvailableSlots(['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '04:00 PM', '06:00 PM']);
      } else {
        setAvailableSlots(data);
      }
      setFormData(prev => ({ ...prev, time: '' }));
    } catch (error) {
      setAvailableSlots(['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '04:00 PM']);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectDoctor = (provider) => {
    setFormData(prev => ({
      ...prev,
      doctorId: provider._id,
      organizationId: '',
      specialty: provider.specialty || '',
      commonReason: '',
      appointmentType: 'New Check-up'
    }));
    setSearchDoctor(`${provider.fullName}`);
    setSearchOrg(''); // Clear the other option
    setShowDoctorDropdown(false);
    setSelectedProviderType('doctor');
  };

  const handleSelectOrg = (provider) => {
    setFormData(prev => ({
      ...prev,
      doctorId: '',
      organizationId: provider._id,
      specialty: provider.specialty || 'عام',
      commonReason: '',
      appointmentType: 'New Check-up'
    }));
    setSearchOrg(`${provider.fullName}`);
    setSearchDoctor(''); // Clear the other option
    setShowOrgDropdown(false);
    setSelectedProviderType(provider.providerType);
  };

  const doctors = providers.filter(p => p.providerType === 'doctor');
  const orgs = providers.filter(p => p.providerType === 'hospital' || p.providerType === 'lab');

  const filteredDoctors = doctors.filter(p => {
    const searchLow = searchDoctor.toLowerCase();
    const nameLow = p.fullName.toLowerCase();
    const specLow = p.specialty?.toLowerCase() || '';
    return nameLow.includes(searchLow) || specLow.includes(searchLow);
  });

  const filteredOrgs = orgs.filter(p => {
    const searchLow = searchOrg.toLowerCase();
    const nameLow = p.fullName.toLowerCase();
    return nameLow.includes(searchLow);
  });

  const validate = () => {
    const newErrors = {};
    if (!formData.doctorId && !formData.organizationId) newErrors.provider = 'يرجى اختيار الطبيب أو المستشفى/المعمل';
    if (!formData.date) newErrors.date = 'يرجى تحديد التاريخ';
    if (!formData.time) newErrors.time = 'يرجى تحديد الوقت من الأوقات المتاحة';
    if (!formData.reason) newErrors.reason = 'يرجى كتابة سبب الزيارة';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const vErrors = validate();
    if (Object.keys(vErrors).length > 0) {
      setErrors(vErrors);
      toast.error('يرجى تعبئة الحقول الإلزامية');
      return;
    }

    try {
      setSubmitting(true);
      if (editAppointment) {
        await api.put(`/appointments/${editAppointment._id}`, formData);
        toast.success('تم تعديل الموعد بنجاح!');
      } else {
        await api.post('/appointments', formData);
        toast.success('تم حجز الموعد بنجاح!');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const dynamicReasons = SPECIALTY_REASONS[formData.specialty] || SPECIALTY_REASONS['default'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-in pb-2">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CalendarIcon className="text-blue-600" size={24} />
              {editAppointment ? 'تعديل الموعد' : 'حجز موعد جديد'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">اختر مقدم الخدمة والتوقيت المناسب لزيارتك</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Select Doctor Dropdown */}
              <div className="space-y-1.5 relative">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User size={16} className="text-blue-500" /> اختر طبيباً
                </label>
                <div className="relative">
                  <Input
                    value={searchDoctor}
                    onChange={(e) => {
                      setSearchDoctor(e.target.value);
                      setShowDoctorDropdown(true);
                      setShowOrgDropdown(false);
                    }}
                    onFocus={() => { setShowDoctorDropdown(true); setShowOrgDropdown(false); }}
                    placeholder={loadingProviders ? "جاري التحميل..." : "ابحث بالاسم أو التخصص..."}
                    className={`bg-gray-50 focus:bg-white transition-colors ${formData.doctorId ? 'border-blue-500 ring-1 ring-blue-500' : ''}`}
                  />
                </div>
                {showDoctorDropdown && (
                  <div className="absolute top-16 left-0 right-0 z-10 bg-white border border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                    {filteredDoctors.length > 0 ? (
                      filteredDoctors.map(p => (
                        <div
                          key={p._id}
                          onClick={() => handleSelectDoctor(p)}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-800">د. {p.fullName}</div>
                          <div className="text-xs text-blue-600 mt-0.5">{p.specialty || 'غير معروف'}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">لم يتم العثور على أطباء</div>
                    )}
                  </div>
                )}
              </div>

              {/* Select Organization Dropdown */}
              {!prefilledAppointment?.organizationId && (
                <div className="space-y-1.5 relative">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building size={16} className="text-indigo-500" /> أو اختر مستشفى / معمل
                  </label>
                  <div className="relative">
                    <Input
                      value={searchOrg}
                      onChange={(e) => {
                        setSearchOrg(e.target.value);
                        setShowOrgDropdown(true);
                        setShowDoctorDropdown(false);
                      }}
                      onFocus={() => { setShowOrgDropdown(true); setShowDoctorDropdown(false); }}
                      placeholder={loadingProviders ? "جاري التحميل..." : "ابحث باسم المؤسسة..."}
                      className={`bg-gray-50 focus:bg-white transition-colors ${formData.organizationId ? 'border-indigo-500 ring-1 ring-indigo-500' : ''}`}
                    />
                  </div>
                  {showOrgDropdown && (
                    <div className="absolute top-16 left-0 right-0 z-10 bg-white border border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                      {filteredOrgs.length > 0 ? (
                        filteredOrgs.map(p => (
                          <div
                            key={p._id}
                            onClick={() => handleSelectOrg(p)}
                            className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <div className="font-semibold text-gray-800">
                              {p.providerType === 'hospital' ? 'مستشفى' : 'معمل'} {p.fullName}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">لم يتم العثور على مؤسسات</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* --- Hospital Departments & Doctors Selection --- */}
            {selectedProviderType === 'hospital' && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-4">
                {loadingHospitalData ? (
                  <div className="flex justify-center p-2"><Spinner className="text-indigo-500 w-5 h-5" /></div>
                ) : hospitalData.length > 0 ? (
                  <>
                    {/* Select Department */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-indigo-900">اختر القسم</label>
                      <div className="flex flex-wrap gap-2">
                        {hospitalData.map(dept => (
                          <button
                            key={dept.name}
                            type="button"
                            onClick={() => {
                              setSelectedDeptName(dept.name);
                              setFormData(prev => ({ ...prev, doctorId: '', specialty: dept.name }));
                            }}
                            className={`px-4 py-2 text-sm rounded-xl font-semibold transition-all ${
                              selectedDeptName === dept.name 
                                ? 'bg-indigo-600 text-white shadow-md transform scale-105' 
                                : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            {dept.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Select Doctor in Department */}
                    {selectedDeptName && (
                      <div className="space-y-2 pt-2 border-t border-indigo-100">
                        <label className="text-sm font-bold text-indigo-900">اختر الطبيب المعالج (اختياري)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {hospitalData.find(d => d.name === selectedDeptName)?.doctors.map(doc => (
                            <div 
                              key={doc._id}
                              onClick={() => setFormData(prev => ({ ...prev, doctorId: doc._id }))}
                              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                                formData.doctorId === doc._id 
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${formData.doctorId === doc._id ? 'bg-white/20' : 'bg-blue-50'}`}>
                                <User size={16} className={formData.doctorId === doc._id ? 'text-white' : 'text-blue-500'} />
                              </div>
                              <div>
                                <p className="font-bold text-sm">د. {doc.fullName}</p>
                                <p className={`text-xs ${formData.doctorId === doc._id ? 'text-blue-100' : 'text-gray-500'}`}>{doc.specialty}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-indigo-600 text-center font-medium">لم يتم إدراج أقسام أو أطباء في هذا المستشفى بعد.</p>
                )}
              </div>
            )}

            {errors.provider && <p className="text-xs text-red-500 -mt-2">{errors.provider}</p>}

            {/* Appointment Type Options Component */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">نوع الموعد <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-3">
                {(selectedProviderType === 'lab' ? [
                  { value: 'New Check-up', label: 'فحص معملي' },
                  { value: 'Consultation', label: 'أشعة' }
                ] : APPOINTMENT_TYPES).map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, appointmentType: type.value }))}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all ${formData.appointmentType === type.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">التخصص التلقائي</label>
                <Input value={formData.specialty || '- يحدد تلقائيا -'} readOnly className="bg-gray-100 text-gray-500 font-bold border-none" />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <CalendarIcon size={16} className="text-gray-400" /> تاريخ الزيارة <span className="text-red-500">*</span>
                </label>
                {/* prevent manual typing in DatePicker */}
                <Input
                  type="date"
                  min={today}
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  onKeyDown={(e) => e.preventDefault()}
                  className={`cursor-pointer ${errors.date ? 'border-red-300' : ''}`}
                />
                {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
              </div>
            </div>

            {/* Time Slots Area */}
            {formData.date && (formData.doctorId || formData.organizationId) && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Clock size={16} className="text-gray-500" /> الأوقات المتاحة <span className="text-red-500">*</span>
                </label>

                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold p-2">
                    <Spinner className="w-4 h-4" /> جاري تحميل المواعيد...
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableSlots.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, time }));
                          setErrors(prev => ({ ...prev, time: null }));
                        }}
                        className={`py-2 px-1 text-sm font-bold rounded-xl border transition-all ${formData.time === time
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-sm transform scale-105'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:bg-white'
                          }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 text-sm font-semibold text-center">
                    لا توجد مواعيد متاحة في هذا اليوم. الرجاء اختيار يوم آخر.
                  </div>
                )}
                {errors.time && <p className="text-xs text-red-500">{errors.time}</p>}
              </div>
            )}

            {/* Reason Textarea & Dynamic Chips */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText size={16} className="text-gray-400" /> سبب الزيارة (باختصار) <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-wrap gap-2 mb-2">
                {dynamicReasons.map(reqReason => (
                  <button
                    key={reqReason}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, commonReason: reqReason, reason: reqReason }));
                      setErrors(prev => ({ ...prev, reason: null }));
                    }}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${formData.commonReason === reqReason
                      ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {reqReason}
                  </button>
                ))}
              </div>

              <textarea
                rows="2"
                maxLength="100"
                placeholder="تفاصيل سبب الزيارة المحددة..."
                value={formData.reason}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, reason: e.target.value }));
                  if (e.target.value && errors.reason) setErrors(prev => ({ ...prev, reason: null }));
                }}
                className={`w-full p-3 rounded-xl border text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.reason ? 'border-red-300' : 'border-gray-200'}`}
              />
              <div className="flex justify-between items-center px-1">
                {errors.reason ? <p className="text-xs text-red-500">{errors.reason}</p> : <div></div>}
                <p className="text-xs text-gray-400 font-mono" dir="ltr">{formData.reason.length} / 100</p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex gap-3">
              <Button type="submit" className="flex-1 text-lg font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-6 shadow-md" disabled={submitting}>
                {submitting ? <span className="flex items-center gap-2"><Spinner className="w-5 h-5 text-white" /> {editAppointment ? 'جاري التعديل...' : 'جاري الحجز...'}</span> : <span className="flex items-center gap-2"><CheckCircle2 size={20} /> {editAppointment ? 'تأكيد التعديل' : 'تأكيد الحجز المبدئي'}</span>}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl py-6" onClick={onClose} disabled={submitting}>
                إلغاء
              </Button>
            </div>

          </form>
        </div>
      </div>

      {/* Backdrop un-focusable to handle auto complete list closures */}
      {(showDoctorDropdown || showOrgDropdown) && (
        <div className="fixed inset-0 z-[5]" onClick={() => { setShowDoctorDropdown(false); setShowOrgDropdown(false); }}></div>
      )}
    </div>
  );
}
