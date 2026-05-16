import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import Loader from '@/components/ui/loader.jsx'
import { Pill, FileText } from 'lucide-react'
import api from '@/services/api.js'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext.jsx'

export default function Medications() {
    const { user } = useAuth();
    const role = user?.role;
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formData, setFormData] = useState({
        patientId: '',
        medication: '',
        dose: '',
        duration: ''
    });
    const [formLoading, setFormLoading] = useState(false);

    /* جلب الوصفات عند تحميل الصفحة إذا كان المستخدم مريضاً */
    useEffect(() => {
        if (role === 'patient' && user?._id) {
            fetchPrescriptions(user._id);
        }
    }, [role, user]);

    const fetchPrescriptions = async (patientId) => {
        try {
            setLoading(true);
            const res = await api.get(`/prescriptions/${patientId}`);
            setPrescriptions(res.data || []);
        } catch (err) {
            console.error('Error fetching prescriptions:', err);
            toast.error('تعذر تحميل الوصفات الطبية');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchId.trim()) return;
        fetchPrescriptions(searchId.trim());
    };

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddPrescription = async (e) => {
        e.preventDefault();
        if (!formData.patientId || !formData.medication || !formData.dose || !formData.duration) {
            toast.error('يرجى ملء جميع الحقول');
            return;
        }
        try {
            setFormLoading(true);
            await api.post('/prescriptions', formData);
            toast.success('تم إضافة الوصفة بنجاح');
            setIsFormOpen(false);
            setFormData({ patientId: '', medication: '', dose: '', duration: '' });
            fetchPrescriptions(formData.patientId);
        } catch (err) {
            const msg = err.response?.data?.message || 'حدث خطأ أثناء إضافة الوصفة';
            toast.error(msg);
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Pill className="text-blue-600" />
                        الأدوية والوصفات
                    </h2>
                    <p className="text-gray-500">سجل الوصفات الطبية والأدوية المصروفة للمرضى</p>
                </div>
                {role === 'doctor' && (
                    <Button className="gap-2" onClick={() => setIsFormOpen(!isFormOpen)}>
                        <span className="text-xl leading-none">+</span> إضافة وصفة طبية
                    </Button>
                )}
            </div>

            {/* نموذج إضافة وصفة - للأطباء فقط */}
            {isFormOpen && role === 'doctor' && (
                <Card className="p-5 border-blue-100 bg-blue-50/30">
                    <h3 className="font-bold text-gray-800 mb-4">وصفة طبية جديدة</h3>
                    <form onSubmit={handleAddPrescription} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input name="patientId" value={formData.patientId} onChange={handleFormChange} placeholder="الصق ID المريض هنا" required />
                        <Input name="medication" value={formData.medication} onChange={handleFormChange} placeholder="مثال: Amoxicillin 500mg" required />
                        <Input name="dose" value={formData.dose} onChange={handleFormChange} placeholder="مثال: قرص واحد كل 8 ساعات" required />
                        <Input name="duration" value={formData.duration} onChange={handleFormChange} placeholder="مثال: 7 أيام" required />
                        <div className="md:col-span-2 flex gap-3 justify-end pt-2">
                            <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={formLoading}>{formLoading ? 'جاري الحفظ...' : 'حفظ الوصفة'}</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* شريط البحث */}
            {role !== 'patient' && (
                <Card className="p-4 border-gray-200">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="flex-1">
                            <Input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="أدخل ID المريض للبحث عن وصفاته..." className="bg-gray-50 h-11" />
                        </div>
                        <Button variant="secondary" type="submit" className="px-8 h-11">بحث</Button>
                    </form>
                </Card>
            )}

            {/* جدول الوصفات */}
            <Card className="overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-48"><Loader size="md" /></div>
                ) : prescriptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 space-y-4">
                        <FileText size={48} className="text-gray-300" />
                        <p className="text-lg font-medium text-gray-500">لا توجد وصفات طبية</p>
                        <p className="text-sm">استخدم شريط البحث للوصول لوصفات المرضى</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">الدواء</th>
                                    <th className="px-6 py-4 font-semibold">الجرعة</th>
                                    <th className="px-6 py-4 font-semibold">المدة</th>
                                    <th className="px-6 py-4 font-semibold">الحالة</th>
                                    <th className="px-6 py-4 font-semibold">الطبيب</th>
                                    <th className="px-6 py-4 font-semibold">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {prescriptions.map((p) => (
                                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-800">{p.medication}</td>
                                        <td className="px-6 py-4 text-gray-600">{p.dose}</td>
                                        <td className="px-6 py-4 text-gray-600">{p.duration}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === 'dispensed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {p.status === 'dispensed' ? 'تم الصرف' : 'قيد الانتظار'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{p.doctorId?.fullName || '—'}</td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">{new Date(p.createdAt).toLocaleDateString('ar-EG')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
