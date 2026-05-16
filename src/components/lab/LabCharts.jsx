import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TestTubes } from 'lucide-react';

const COLORS = ['#f97316', '#eab308', '#22c55e', '#6366f1'];

export default function LabCharts({ results = [] }) {
  const chartData = useMemo(() => {
    const statusMap = {
      pending_sample: { name: 'في انتظار السحب', count: 0 },
      pending_result: { name: 'في انتظار النتيجة', count: 0 },
      completed: { name: 'مكتمل', count: 0 },
    };

    results.forEach(r => {
      if (statusMap[r.status]) {
        statusMap[r.status].count += 1;
      }
    });

    return Object.values(statusMap).filter(s => s.count > 0);
  }, [results]);

  if (chartData.length === 0 || results.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <TestTubes size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">توزيع حالات التحاليل</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400">إجمالي {results.length} تحليل</p>
        </div>
      </div>
      
      <div className="h-[250px] w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={4}
              dataKey="count"
              nameKey="name"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))' }}
              labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))', marginBottom: '4px' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value) => [value, 'تحليل']}
            />
            <Legend 
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
