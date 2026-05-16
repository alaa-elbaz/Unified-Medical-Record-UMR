import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';

const COLORS = ['#f43f5e', '#0ea5e9', '#6366f1', '#10b981', '#8b5cf6', '#f59e0b'];

const roleLabelsAr = {
  patient: 'مرضى',
  doctor: 'أطباء',
  hospital: 'مستشفيات',
  lab: 'مختبرات',
  pharmacy: 'صيدليات',
  admin: 'مديرين',
};

export default function AdminCharts({ stats = null, users = [] }) {
  const roleData = useMemo(() => {
    if (stats) {
      // Use stats directly if available
      const map = [];
      if (stats.totalPatients) map.push({ name: 'مرضى', count: stats.totalPatients });
      if (stats.totalDoctors) map.push({ name: 'أطباء', count: stats.totalDoctors });
      if (stats.totalHospitals) map.push({ name: 'مستشفيات', count: stats.totalHospitals });
      if (stats.totalLabs) map.push({ name: 'مختبرات', count: stats.totalLabs });
      if (stats.totalPharmacies) map.push({ name: 'صيدليات', count: stats.totalPharmacies });
      return map.filter(d => d.count > 0);
    }

    // Fallback: count from users array
    const counts = {};
    users.forEach(u => {
      const label = roleLabelsAr[u.role] || u.role;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [stats, users]);

  if (roleData.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
          <BarChart3 size={18} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">توزيع المستخدمين حسب الدور</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">إجمالي {stats?.totalUsers || users.length} مستخدم مسجل</p>
        </div>
      </div>
      
      <div className="h-[280px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={roleData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} width={70} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))' }}
              labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value) => [value, 'مستخدم']}
              cursor={{ fill: 'rgba(245, 158, 11, 0.05)' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {roleData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
