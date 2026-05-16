import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api.js'
import Loader from '@/components/ui/loader.jsx'
import { Card } from '@/components/ui/card.jsx'
import AddPatientModal from '@/components/modals/AddPatientModal.jsx'

export default function Patients() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async (search = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/patients?search=${search}`);
      setPatients(res.data.patients || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('تعذر تحميل بيانات المرضى');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  return (
    <div className="space-y-6 relative">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">إدارة المرضى</h2>
          <p className="text-gray-500">البحث في السجلات الطبية وإضافة مرضى جدد</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> إضافة مريض جديد
        </button>
      </div>

      {/* Search Bar */}
      <Card className="p-4 border-gray-200">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم القومي (14 رقم)..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
          />
          <button
            type="submit"
            className="bg-gray-100 text-gray-700 px-8 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
          >
            بحث
          </button>
        </form>
      </Card>

      {/* Patients Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center flex-col items-center h-48 space-y-4">
            <Loader size="md" />
            <span className="text-gray-500">جاري تحميل البيانات...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">اسم المريض</th>
                  <th className="px-6 py-4 font-semibold">الرقم القومي</th>
                  <th className="px-6 py-4 font-semibold">تاريخ التسجيل</th>
                  <th className="px-6 py-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      لا توجد نتائج للبحث
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{patient.fullName}</td>
                      <td className="px-6 py-4 text-gray-500">{patient.nationalId}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(patient.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/patients/${patient._id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-4 py-2 rounded-lg inline-block transition-colors"
                        >
                          عرض السجل
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
}