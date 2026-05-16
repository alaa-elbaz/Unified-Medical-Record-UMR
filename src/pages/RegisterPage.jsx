import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UploadCloud, UserCircle2, Stethoscope, Image as ImageIcon, FileText, X, Building2, Microscope, Pill, ArrowLeft, Heart, Shield, QrCode, Brain } from 'lucide-react';
import api from '@/services/api';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

// Map non-individual roles to their dedicated registration routes so a link
// like `/register?role=hospital` doesn't silently coerce the visitor into the
// patient form.
const ROLE_REDIRECTS = {
    hospital: '/register/hospital',
    lab: '/register/lab',
    pharmacy: '/register/pharmacy',
};

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryRole = searchParams.get('role');

    // If the user landed here with a role that has its own page, redirect.
    if (queryRole && ROLE_REDIRECTS[queryRole]) {
        return <Navigate to={ROLE_REDIRECTS[queryRole]} replace />;
    }

    const initialRole = queryRole === 'doctor' ? 'doctor' : 'patient';
    const [role, setRole] = useState(initialRole);
    const [formData, setFormData] = useState({
        fullName: '', nationalId: '', email: '', phoneNumber: '',
        gender: 'male', motherName: '', syndicateNumber: '',
        bloodType: 'unknown', chronicDiseases: '', allergies: '', specialty: '',
    });
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        if (!formData.fullName.trim()) newErrors.fullName = "الاسم بالكامل مطلوب";
        if (!formData.nationalId.trim() || formData.nationalId.length !== 14) newErrors.nationalId = "الرقم القومي يجب أن يتكون من 14 رقماً";
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "البريد الإلكتروني غير صالح";
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "رقم الهاتف مطلوب";
        if (role === 'patient' && !formData.motherName.trim()) newErrors.motherName = "اسم الأم مطلوب لتسجيل المريض";
        if (role === 'doctor') {
            if (!formData.syndicateNumber.trim()) {
                newErrors.syndicateNumber = "رقم العضوية بنقابة الأطباء مطلوب";
            } else if (!/^\d{4,10}$/.test(formData.syndicateNumber.trim())) {
                newErrors.syndicateNumber = "رقم العضوية يجب أن يتكون من 4 إلى 10 أرقام فقط";
            }
            if (!formData.specialty.trim()) newErrors.specialty = "التخصص مطلوب";
        }
        if (role === 'patient' && formData.phoneNumber.trim() && !/^01[0125]\d{8}$/.test(formData.phoneNumber.trim())) {
            newErrors.phoneNumber = "رقم الهاتف غير صالح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)";
        }
        if (role === 'doctor' && formData.phoneNumber.trim() && !/^01[0125]\d{8}$/.test(formData.phoneNumber.trim())) {
            newErrors.phoneNumber = "رقم الهاتف غير صالح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)";
        }
        if (!file) newErrors.file = "يرجى إرفاق المستند المطلوب";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null });
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setErrors({ ...errors, file: null });
            if (selectedFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setFilePreview(reader.result);
                reader.readAsDataURL(selectedFile);
            } else {
                setFilePreview('document');
            }
        }
    };

    const removeFile = () => { setFile(null); setFilePreview(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) { toast.error('يرجى التأكد من ملء جميع الحقول بشكل صحيح'); return; }
        setIsLoading(true);
        try {
            const submitData = new FormData();
            submitData.append('role', role);
            submitData.append('fullName', formData.fullName);
            submitData.append('nationalId', formData.nationalId);
            submitData.append('email', formData.email);
            submitData.append('phoneNumber', formData.phoneNumber);
            submitData.append('gender', formData.gender);
            let endpoint = '';
            if (role === 'patient') {
                submitData.append('mothersName', formData.motherName);
                submitData.append('bloodType', formData.bloodType);
                submitData.append('chronicDiseases', formData.chronicDiseases);
                submitData.append('allergies', formData.allergies);
                submitData.append('idDocument', file);
                endpoint = '/auth/register/patient';
            } else {
                submitData.append('syndicateNumber', formData.syndicateNumber);
                submitData.append('specialty', formData.specialty);
                submitData.append('syndicateId', file);
                endpoint = '/auth/register/doctor';
            }
            await api.post(endpoint, submitData);
            toast.success('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
            navigate('/login');
        } catch (error) {
            console.error("Registration error:", error);
            const status = error.response?.status;
            const msg = error.response?.data?.message;
            if (status === 409) {
                toast.error(msg || 'البريد الإلكتروني أو الرقم القومي مسجَّل بالفعل.');
            } else if (status === 400 && msg) {
                toast.error(msg);
            } else {
                toast.error(msg || 'تعذر إنشاء الحساب، يرجى المحاولة لاحقاً.');
            }
        } finally { setIsLoading(false); }
    };

    const inputCls = (field) => `h-11 rounded-xl border-gray-200 focus:border-sky-500 focus:ring-sky-500/20 ${errors[field] ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`;

    return (
        <div className="min-h-screen flex relative" dir="rtl">

            {/* ── Left decorative panel (desktop) ── */}
            <div className="hidden lg:flex lg:w-[40%] relative bg-gradient-to-br from-sky-600 via-sky-700 to-teal-600 p-10 flex-col justify-between overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl" />

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-2.5 mb-12 group">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-sm shadow-lg">MC</div>
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-extrabold text-white">MedCore</span>
                            <span className="text-[9px] font-semibold text-sky-200 tracking-widest">UMR SYSTEM</span>
                        </div>
                    </Link>

                    <h2 className="text-3xl font-black text-white mb-4 leading-tight">انضم لمنظومة<br />صحية متكاملة</h2>
                    <p className="text-sky-100 text-base leading-relaxed max-w-xs">
                        سجّل حسابك في ثوانٍ وابدأ بإدارة ملفك الصحي الرقمي — كل شيء في مكان واحد.
                    </p>
                </div>

                <div className="relative z-10 space-y-3">
                    {[
                        { icon: Shield, text: 'بياناتك محمية ومشفرة بالكامل' },
                        { icon: QrCode, text: 'كارت QR ذكي للطوارئ الطبية' },
                        { icon: Brain, text: 'ذكاء اصطناعي لفحص تعارض الأدوية' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3.5">
                            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                <item.icon size={18} className="text-white" />
                            </div>
                            <span className="text-white text-sm font-medium">{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 bg-gray-50/50">
                <div className="w-full max-w-2xl mx-auto">

                    {/* Mobile logo */}
                    <div className="text-center mb-6 lg:hidden">
                        <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shadow-md">MC</div>
                            <div className="flex flex-col leading-none text-right">
                                <span className="text-xl font-extrabold text-gray-900">MedCore</span>
                                <span className="text-[9px] font-semibold text-teal-600 tracking-widest">UMR SYSTEM</span>
                            </div>
                        </Link>
                    </div>

                    {/* Form card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                        <div className="p-6 pb-4 border-b border-gray-100">
                            <h1 className="text-2xl font-black text-gray-900">إنشاء حساب جديد</h1>
                            <p className="text-sm text-gray-500 mt-1">اختر نوع الحساب وأكمل بياناتك</p>
                        </div>

                        <div className="p-6">
                            {/* Role Toggle */}
                            <div className="grid grid-cols-2 gap-1.5 mb-6 bg-gray-100/80 p-1.5 rounded-xl relative">
                                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-all duration-300 border border-gray-200/50 ${role === 'patient' ? 'right-1.5' : 'right-[calc(50%+3px)]'}`}></div>
                                <button onClick={() => { setRole('patient'); setErrors({}); setFile(null); setFilePreview(null); }}
                                    className={`flex items-center justify-center gap-2 relative z-10 py-2.5 text-sm font-bold transition-colors ${role === 'patient' ? 'text-sky-700' : 'text-gray-500'}`}>
                                    <UserCircle2 size={16} /> تسجيل كمريض
                                </button>
                                <button onClick={() => { setRole('doctor'); setErrors({}); setFile(null); setFilePreview(null); }}
                                    className={`flex items-center justify-center gap-2 relative z-10 py-2.5 text-sm font-bold transition-colors ${role === 'doctor' ? 'text-sky-700' : 'text-gray-500'}`}>
                                    <Stethoscope size={16} /> تسجيل كطبيب
                                </button>
                            </div>

                            {/* Org Registration Links */}
                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-3">أو سجل كمنظمة طبية</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <Link to="/register/hospital" className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors text-xs font-bold">
                                        <Building2 size={14} /> مستشفى
                                    </Link>
                                    <Link to="/register/lab" className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors text-xs font-bold">
                                        <Microscope size={14} /> مختبر
                                    </Link>
                                    <Link to="/register/pharmacy" className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors text-xs font-bold">
                                        <Pill size={14} /> صيدلية
                                    </Link>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Section 1: Basic Info */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-black">1</span>
                                    <span className="text-sm font-bold text-gray-800">البيانات الأساسية</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700">الاسم بالكامل</label>
                                        <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="الاسم الرباعي" className={inputCls('fullName')} />
                                        {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700">الرقم القومي</label>
                                        <Input name="nationalId" value={formData.nationalId} onChange={handleChange} placeholder="14 رقم" maxLength="14" dir="ltr" className={`text-left ${inputCls('nationalId')}`} />
                                        {errors.nationalId && <p className="text-xs text-red-500 font-medium text-right">{errors.nationalId}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                                        <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@mail.com" dir="ltr" className={`text-left ${inputCls('email')}`} />
                                        {errors.email && <p className="text-xs text-red-500 font-medium text-right">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-sm font-bold text-gray-700">رقم الهاتف</label>
                                        <Input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="رقم الهاتف المحمول" dir="ltr" className={`text-left ${inputCls('phoneNumber')}`} />
                                        {errors.phoneNumber && <p className="text-xs text-red-500 font-medium text-right">{errors.phoneNumber}</p>}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-700">النوع</label>
                                    <div className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={handleChange} className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-gray-300" />
                                            <span className="text-sm font-bold text-gray-700">ذكر</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={handleChange} className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300" />
                                            <span className="text-sm font-bold text-gray-700">أنثى</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Section 2: Verification */}
                                <div className="border-t border-gray-100 pt-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-black">2</span>
                                        <span className="text-sm font-bold text-gray-800">بيانات التحقق {role === 'doctor' ? 'المهنية' : 'الشخصية'}</span>
                                    </div>

                                    {role === 'patient' ? (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="block text-sm font-bold text-gray-700">فصيلة الدم</label>
                                                <select name="bloodType" value={formData.bloodType} onChange={handleChange} dir="ltr"
                                                    className="w-full border border-gray-200 rounded-xl h-11 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium text-gray-700">
                                                    <option value="unknown">غير معروف</option>
                                                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-sm font-bold text-gray-700">الأمراض المزمنة (إن وجدت)</label>
                                                <Input name="chronicDiseases" value={formData.chronicDiseases} onChange={handleChange} placeholder="السكري، الضغط (افصل بفاصلة)" className="h-11 rounded-xl border-gray-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-sm font-bold text-gray-700">الحساسية (إن وجدت)</label>
                                                <Input name="allergies" value={formData.allergies} onChange={handleChange} placeholder="البنسلين، الفول السوداني (افصل بفاصلة)" className="h-11 rounded-xl border-gray-200" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-sm font-bold text-gray-700">اسم الأم بالكامل (للمطابقة الأمنية)</label>
                                                <Input name="motherName" value={formData.motherName} onChange={handleChange} placeholder="الاسم الرباعي للأم" className={inputCls('motherName')} />
                                                {errors.motherName && <p className="text-xs text-red-500 font-medium">{errors.motherName}</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="block text-sm font-bold text-gray-700">التخصص</label>
                                                <Input name="specialty" value={formData.specialty} onChange={handleChange} placeholder="أسنان، أطفال، عظام..." className={inputCls('specialty')} />
                                                {errors.specialty && <p className="text-xs text-red-500 font-medium text-right">{errors.specialty}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-sm font-bold text-gray-700">رقم العضوية بنقابة الأطباء</label>
                                                <Input name="syndicateNumber" value={formData.syndicateNumber} onChange={handleChange} placeholder="رقم القيد/العضوية" dir="ltr" className={`text-left ${inputCls('syndicateNumber')}`} />
                                                {errors.syndicateNumber && <p className="text-xs text-red-500 font-medium text-right">{errors.syndicateNumber}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* File Upload */}
                                    <div className="mt-5 space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">
                                            {role === 'patient' ? 'صورة بطاقة الرقم القومي' : 'صورة كارنيه النقابة / مزاولة المهنة'}
                                            <span className="text-red-500 mr-1">*</span>
                                        </label>
                                        {!filePreview ? (
                                            <div className={`border-2 border-dashed rounded-2xl p-8 text-center hover:bg-sky-50/30 transition-colors relative ${errors.file ? 'border-red-300 bg-red-50/20' : 'border-gray-200 hover:border-sky-300'}`}>
                                                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                <UploadCloud className={`mx-auto h-10 w-10 mb-3 ${errors.file ? 'text-red-400' : 'text-sky-400'}`} />
                                                <p className="text-sm text-gray-600 font-bold mb-1">اضغط أو اسحب الملف هنا</p>
                                                <p className="text-xs text-gray-400">JPG, PNG, PDF — حد أقصى 5 ميجابايت</p>
                                            </div>
                                        ) : (
                                            <div className="relative border border-gray-200 rounded-2xl p-3 flex items-center gap-4 bg-gray-50/50 group">
                                                <div className="w-14 h-14 shrink-0 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                                                    {filePreview === 'document' ? <FileText className="text-sky-500" size={24} /> : <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-gray-800 truncate">{file?.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{(file?.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                                <button type="button" onClick={removeFile} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={18} /></button>
                                            </div>
                                        )}
                                        {errors.file && <p className="text-xs text-red-500 font-medium">{errors.file}</p>}
                                    </div>
                                </div>

                                <Button type="submit" disabled={isLoading}
                                    className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-700 hover:to-teal-600 text-white shadow-lg shadow-sky-600/20 mt-4 gap-2">
                                    {isLoading ? 'جاري إنشاء الحساب...' : <>تأكيد وإنشاء الحساب <ArrowLeft size={16} /></>}
                                </Button>

                                <p className="text-center text-sm text-gray-500 pb-2">
                                    لديك حساب بالفعل؟{' '}
                                    <Link to="/login" className="text-sky-600 font-bold hover:underline underline-offset-4 decoration-2">سجل الدخول</Link>
                                </p>
                            </form>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">
                        © {new Date().getFullYear()} MedCore — صنع بـ <Heart size={10} className="text-rose-400 fill-rose-400" /> لصحة أفضل
                    </p>
                </div>
            </div>
        </div>
    );
}
