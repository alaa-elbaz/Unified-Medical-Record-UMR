import React, { useState, useEffect } from 'react';
import { X, User, Activity, Droplet, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import QRCode from 'react-qr-code';
import api from '@/services/api.js';

export default function SmartCardModal({ isOpen, onClose, user }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      api.get(`/patients/${user.id || user._id}/qr-token`)
        .then(res => setToken(res.data.data.qrToken))
        .catch(err => console.error("Error fetching QR ticket"))
        .finally(() => setLoading(false));
    } else {
      setToken(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl animate-scale-in overflow-hidden relative">
        
        {/* Top decorative banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-24 pt-4 px-4 flex justify-between items-start">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            MedCore Smart Card
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Avatar overlapping */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white p-1 rounded-full shadow-lg">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
             <User size={40} />
          </div>
        </div>

        {/* Card Body */}
        <div className="pt-14 pb-6 px-6 flex flex-col items-center">
          <h2 className="text-xl font-extrabold text-gray-800 text-center">{user.fullName}</h2>
          <p className="text-sm text-gray-500 mb-6 font-mono bg-gray-100 px-3 py-1 rounded-full mt-2">
            ID: {user.nationalId || 'N/A'}
          </p>

          {loading || !token ? (
            <div className="bg-white border rounded-2xl p-4 shadow-sm mb-6 flex justify-center items-center w-full min-h-[200px]">
              <Spinner className="w-8 h-8 text-blue-500" />
            </div>
          ) : (
            <div className="bg-white border rounded-2xl p-4 shadow-sm mb-6 flex justify-center w-full">
              <QRCode value={`${window.location.origin}/emergency/${user.id || user._id}?token=${token}`} size={180} />
            </div>
          )}

          <div className="w-full grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex flex-col items-center">
              <Droplet size={20} className="text-red-500 mb-1" />
              <span className="text-gray-500 text-xs">فصيلة الدم</span>
              <span className="font-bold text-gray-800" dir="ltr">{user.bloodType !== 'unknown' ? user.bloodType : 'غير معروف'}</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex flex-col items-center">
              <Activity size={20} className="text-indigo-500 mb-1" />
              <span className="text-gray-500 text-xs">الحالة</span>
              <span className="font-bold text-green-600 flex items-center gap-1">
                <CheckCircle size={14} /> نشط
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100">
          <Button onClick={onClose} className="w-full text-md font-bold py-6 rounded-xl bg-gray-800 hover:bg-gray-900">
            إغلاق
          </Button>
        </div>

      </div>
    </div>
  );
}
