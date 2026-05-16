import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Mail, Phone, MapPin, Hash, Users, Bed, LayoutPanelTop, FileText, ArrowLeft, Heart, Shield, Stethoscope, Calendar } from 'lucide-react';
import api from '@/services/api';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';

export default function RegisterHospital() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '', sectorType: 'Private', email: '', healthRegNumber: '',
        phoneNumber: '', address: '', city: '', bedCount: '',
        departmentCount: '', roomsCount: '', doctorsCount: '', description: '',
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const n = {};
        if (!formData.name.trim()) n.name = "اسم المستشفى مطلوب";
        if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) n.email = "البريد الإلكتروني غير صالح";
        if (!formData.healthRegNumber.trim()) n.healthRegNumber = "رقم تسجيل وزارة الصحة مطلوب";
        else if (!/^[A-Za-z]-?\d{4,10}$/.test(formData.healthRegNumber.trim())) n.healthRegNumber = "صيغة رقم التسجيل غير صحيحة (مثال: H-123456)";
        if (!formData.phoneNumber.trim()) n.phoneNumber = "رقم الهاتف مطلوب";
        else if (!/^01[0125]\d{8}$/.test(formData.phoneNumber.trim())) n.phoneNumber = "رقم الهاتف غير صالح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)";
        if (!formData.address.trim()) n.address = "العنوان التفصيلي مطلوب";
        setErrors(n);
        return Object.keys(n).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) { toast.error('يرجى ملء جميع الحقول الإلزامية'); return; }
        setIsLoading(true);
        try {
            await api.post('/auth/register/hospital', formData);
            toast.success('تم إرسال طلب تسجيل المستشفى بنجاح!');
            navigate('/login');
        } catch (error) { toast.error(error.response?.data?.message || 'تعذر إرسال الطلب'); }
        finally { setIsLoading(false); }
    };

    const inputCls = (f) => `h-11 rounded-xl border-gray-200 focus:border-sky-500 focus:ring-sky-500/20 ${errors[f] ? 'border-red-300' : ''}`;

    return (
        <div className="min-h-screen flex relative" dir="rtl">
            {/* ── Side panel ── */}
            <div className="hidden lg:flex lg:w-[38%] relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-600 p-10 flex-col justify-between overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl" />
                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-2.5 mb-12">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-sm shadow-lg">MC</div>
                        <div className="flex flex-col leading-none"><span className="text-xl font-extrabold text-white">MedCore</span><span className="text-[9px] font-semibold text-indigo-200 tracking-widest">UMR SYSTEM</span></div>
                    </Link>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-5"><Building2 size={28} className="text-white" /></div>
                    <h2 className="text-3xl font-black text-white mb-3 leading-tight">تسجيل مستشفى</h2>
                    <p className="text-indigo-100 text-sm leading-relaxed max-w-xs">انضم لمنظومة MedCore الصحية وأدر أقسامك وأطبائك ومرضاك من لوحة تحكم واحدة.</p>
                </div>
                <div className="relative z-10 space-y-3">
                    {[
                        { icon: Shield, t: 'تدقيق من وزارة الصحة' },
                        { icon: Calendar, t: 'نظام مواعيد متكامل' },
                        { icon: Stethoscope, t: 'إدارة الأطباء والأقسام' },
                    ].map((x, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3.5">
                            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0"><x.icon size={16} className="text-white" /></div>
                            <span className="text-white text-sm font-medium">{x.t}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Form ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 bg-gray-50/50">
                <div className="w-full max-w-2xl mx-auto">
                    <div className="text-center mb-6 lg:hidden">
                        <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 flex items-center justify-center text-white font-black text-sm shadow-md">MC</div>
                            <span className="text-xl font-extrabold text-gray-900">MedCore</span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                        <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                            <div><h1 className="text-2xl font-black text-gray-900">بيانات المستشفى</h1><p className="text-sm text-gray-500 mt-1">أكمل البيانات لإرسال طلب التسجيل</p></div>
                            <Link to="/register" className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">العودة <ArrowLeft size={12} /></Link>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">اسم المستشفى</label>
                                    <div className="relative"><Building2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input name="name" value={formData.name} onChange={handleChange} className={`pr-10 ${inputCls('name')}`} placeholder="مستشفى الشفاء التخصصي" /></div>
                                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">القطاع</label>
                                    <select name="sectorType" value={formData.sectorType} onChange={handleChange} className="w-full h-11 border border-gray-200 rounded-xl px-3 bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-sm">{['Private','Public'].map(v => <option key={v} value={v}>{v === 'Private' ? 'خاص' : 'حكومي'}</option>)}</select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">البريد الإلكتروني</label>
                                    <div className="relative"><Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input name="email" type="email" value={formData.email} onChange={handleChange} className={`pr-10 text-left ${inputCls('email')}`} dir="ltr" placeholder="admin@hospital.com" /></div>
                                    {errors.email && <p className="text-xs text-red-500 text-right">{errors.email}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">رقم تسجيل وزارة الصحة</label>
                                    <div className="relative"><Hash size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input name="healthRegNumber" value={formData.healthRegNumber} onChange={handleChange} className={`pr-10 text-left ${inputCls('healthRegNumber')}`} dir="ltr" placeholder="H-12345678" /></div>
                                    {errors.healthRegNumber && <p className="text-xs text-red-500 text-right">{errors.healthRegNumber}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">رقم الهاتف</label>
                                    <div className="relative"><Phone size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className={`pr-10 text-left ${inputCls('phoneNumber')}`} dir="ltr" placeholder="010XXXXXXXX" /></div>
                                    {errors.phoneNumber && <p className="text-xs text-red-500 text-right">{errors.phoneNumber}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-bold text-gray-700">المدينة</label>
                                    <div className="relative"><MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input name="city" value={formData.city} onChange={handleChange} className="pr-10 h-11 rounded-xl border-gray-200" placeholder="القاهرة" /></div>
                                </div>
                            </div>
                            <div className="space-y-1"><label className="text-sm font-bold text-gray-700">العنوان بالتفصيل <span className="text-red-500">*</span></label><Input name="address" value={formData.address} onChange={handleChange} className={`h-11 rounded-xl border-gray-200 ${errors.address ? 'border-red-300' : ''}`} placeholder="شارع القصر العيني، وسط البلد..." />{errors.address && <p className="text-xs text-red-500">{errors.address}</p>}</div>

                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">السعة والإحصائيات</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[{n:'bedCount',l:'الأسرة',ic:Bed},{n:'departmentCount',l:'الأقسام',ic:LayoutPanelTop},{n:'roomsCount',l:'الغرف',ic:LayoutPanelTop},{n:'doctorsCount',l:'الأطباء',ic:Users}].map(f => (
                                        <div key={f.n} className="space-y-1">
                                            <label className="text-[11px] font-bold text-gray-500 flex items-center gap-1"><f.ic size={12} />{f.l}</label>
                                            <Input name={f.n} type="number" min="0" value={formData[f.n]} onChange={handleChange} className="h-10 rounded-xl border-gray-200 text-sm" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-1"><FileText size={14} /> وصف المستشفى</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="نبذة عن المستشفى والخدمات..." className="w-full min-h-[80px] border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none resize-none" />
                            </div>

                            <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white shadow-lg gap-2">
                                {isLoading ? 'جاري الإرسال...' : <>إرسال طلب التسجيل <ArrowLeft size={16} /></>}
                            </Button>
                            <p className="text-center text-xs text-gray-400">سيراجع فريق الإدارة طلبك وسيتم التفعيل بعد التأكد من البيانات.</p>
                            <p className="text-center text-xs text-gray-500">لديك حساب؟ <Link to="/login" className="text-sky-600 font-bold hover:underline">سجل الدخول</Link></p>
                        </form>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-6 flex items-center justify-center gap-1">© {new Date().getFullYear()} MedCore — صنع بـ <Heart size={10} className="text-rose-400 fill-rose-400" /> لصحة أفضل</p>
                </div>
            </div>
        </div>
    );
}
