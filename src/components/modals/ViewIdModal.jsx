import { X, CreditCard } from 'lucide-react';
import { getImageUrl } from '@/utils/getImageUrl.js';
import SecureImage from '@/components/common/SecureImage.jsx';

export default function ViewIdModal({ isOpen, onClose, documentPath }) {
  if (!isOpen) return null;

  const imageUrl = getImageUrl(documentPath);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2">
            <CreditCard className="text-blue-600" size={24} />
            <h3 className="text-lg font-bold text-gray-800">صورة إثبات الهوية</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex items-center justify-center bg-gray-100 min-h-[300px]">
          {documentPath ? (
            <SecureImage 
              src={imageUrl} 
              alt="ID Document" 
              className="max-w-full max-h-[70vh] rounded-lg shadow-sm object-contain"
            />
          ) : (
            <p className="text-gray-500 font-medium">لا توجد صورة هوية متاحة</p>
          )}
        </div>
      </div>
    </div>
  );
}
