import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Building2 } from 'lucide-react';

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#14b8a6', '#10b981'];

export default function HospitalCharts({ doctors = [], departments = [] }) {
  // Aggregate doctors by department
  const chartData = useMemo(() => {
    const dataMap = {};
    
    // Initialize with departments
    departments.forEach(dept => {
      dataMap[dept.name] = { name: dept.name, count: 0 };
    });

    // Count doctors
    doctors.forEach(doc => {
      const deptName = doc.hospitalDepartment;
      if (deptName) {
        if (!dataMap[deptName]) {
          dataMap[deptName] = { name: deptName, count: 0 };
        }
        dataMap[deptName].count += 1;
      }
    });

    return Object.values(dataMap).sort((a, b) => b.count - a.count);
  }, [doctors, departments]);

  if (chartData.length === 0 || doctors.length === 0) return null; // Don't show chart if no data

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
          <Building2 size={18} className="text-sky-600 dark:text-sky-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">توزيع الكوادر الطبية</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">عدد الأطباء في كل قسم بالمستشفى</p>
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
              cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }}
              formatter={(value) => [value, 'طبيب']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
