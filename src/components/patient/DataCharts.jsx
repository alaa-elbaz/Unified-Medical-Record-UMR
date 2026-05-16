import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

export default function DataCharts({ records = [], prescriptions = [], labs = [], radiology = [] }) {
  // Aggregate data by month for the last 6 months
  const chartData = useMemo(() => {
    const dataMap = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = d.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
      dataMap[monthYear] = { name: monthYear, events: 0 };
    }

    const processItems = (items, dateField) => {
      items.forEach(item => {
        const d = new Date(item[dateField] || item.createdAt);
        const monthYear = d.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
        if (dataMap[monthYear]) {
          dataMap[monthYear].events += 1;
        }
      });
    };

    processItems(records, 'visitDate');
    processItems(prescriptions, 'createdAt');
    processItems(labs, 'date');
    processItems(radiology, 'date');

    return Object.values(dataMap);
  }, [records, prescriptions, labs, radiology]);

  const totalEvents = chartData.reduce((acc, curr) => acc + curr.events, 0);

  if (totalEvents === 0) return null; // Don't show chart if no data

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
          <Activity size={18} className="text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">مؤشر النشاط الطبي</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">ملخص الزيارات والتحاليل والأدوية آخر 6 أشهر</p>
        </div>
      </div>
      
      <div className="h-[200px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dx={-10} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))' }}
              labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', marginBottom: '4px' }}
              itemStyle={{ color: '#0ea5e9', fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value) => [value, 'إجراء طبي']}
            />
            <Area type="monotone" dataKey="events" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorEvents)" activeDot={{ r: 6, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
