import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity } from 'lucide-react';

export default function DoctorCharts({ appointments = [] }) {
  // Aggregate appointments by the last 7 days
  const chartData = useMemo(() => {
    const dataMap = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
      const dateKey = d.toISOString().split('T')[0];
      dataMap[dateKey] = { name: dayName, completed: 0, pending: 0, cancelled: 0 };
    }

    appointments.forEach(apt => {
      const d = new Date(apt.date);
      d.setHours(0, 0, 0, 0);
      const dateKey = d.toISOString().split('T')[0];
      
      if (dataMap[dateKey]) {
        if (apt.status === 'Completed' || apt.status === 'Confirmed' || apt.status === 'In-Progress') {
          dataMap[dateKey].completed += 1;
        } else if (apt.status === 'Pending') {
          dataMap[dateKey].pending += 1;
        } else if (apt.status === 'Cancelled') {
          dataMap[dateKey].cancelled += 1;
        }
      }
    });

    return Object.values(dataMap);
  }, [appointments]);

  const totalAppointments = chartData.reduce((acc, curr) => acc + curr.completed + curr.pending + curr.cancelled, 0);

  if (totalAppointments === 0) return null; // Don't show chart if no recent data

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
          <Activity size={18} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">كثافة المواعيد</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">حجم المواعيد خلال الأيام السبعة الماضية</p>
        </div>
      </div>
      
      <div className="h-[250px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--card)' }}
              labelStyle={{ fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="completed" name="مؤكدة/مكتملة" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" name="قيد الانتظار" fill="#eab308" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cancelled" name="ملغاة" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
