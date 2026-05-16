import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Pill } from 'lucide-react';

export default function PharmacyCharts({ requests = [], history = [], stats = {} }) {
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
      dataMap[dateKey] = { name: dayName, dispensed: 0, pending: 0 };
    }

    // Count dispensed items from history
    history.forEach(item => {
      if (item.dispensedAt || item.updatedAt) {
        const d = new Date(item.dispensedAt || item.updatedAt);
        d.setHours(0, 0, 0, 0);
        const dateKey = d.toISOString().split('T')[0];
        if (dataMap[dateKey]) {
          dataMap[dateKey].dispensed += 1;
        }
      }
    });

    // Count pending requests
    requests.forEach(item => {
      if (item.createdAt) {
        const d = new Date(item.createdAt);
        d.setHours(0, 0, 0, 0);
        const dateKey = d.toISOString().split('T')[0];
        if (dataMap[dateKey]) {
          dataMap[dateKey].pending += 1;
        }
      }
    });

    return Object.values(dataMap);
  }, [requests, history]);

  const totalActivity = chartData.reduce((acc, curr) => acc + curr.dispensed + curr.pending, 0);

  if (totalActivity === 0 && stats.totalDispensed === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-3 sm:p-5 shadow-sm mb-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
          <Pill size={18} className="text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white truncate">نشاط الصرف الأسبوعي</h3>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
            اليوم: {stats.todayDispensed || 0} • الأسبوع: {stats.weeklyDispensed || 0} • الشهر: {stats.monthlyDispensed || 0}
          </p>
        </div>
      </div>
      
      <div className="h-[180px] sm:h-[250px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} allowDecimals={false} width={30} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))' }}
              labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="dispensed" name="تم الصرف" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" name="طلبات واردة" fill="#eab308" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
