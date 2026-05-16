// Shared label maps for admin-side tabs. Pure constants — no React import.

export const roleLabels = {
  patient: 'مريض',
  doctor: 'طبيب',
  hospital: 'مستشفى',
  lab: 'مختبر',
  pharmacy: 'صيدلية',
  admin: 'مدير',
  super_admin: 'مدير عام',
  sub_admin: 'مدير مساعد',
}

export const typeLabels = {
  hospital: 'مستشفى',
  lab: 'مختبر',
  pharmacy: 'صيدلية',
}

export const apptStatusLabels = {
  Pending: 'قيد الانتظار',
  Confirmed: 'مؤكد',
  Cancelled: 'ملغي',
  Completed: 'مكتمل',
  'In-Progress': 'قيد التنفيذ',
  'Follow-up': 'متابعة',
}

export const apptStatusColors = {
  Confirmed: 'bg-green-100 text-green-800 border-green-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
  Completed: 'bg-blue-100 text-blue-800 border-blue-200',
  'In-Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Follow-up': 'bg-purple-100 text-purple-800 border-purple-200',
  Pending: 'bg-gray-100 text-gray-700 border-gray-200',
}
