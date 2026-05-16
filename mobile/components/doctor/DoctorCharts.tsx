import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent, CardHeader } from '../ui/Card';

export default function DoctorCharts({ appointments = [] }: { appointments: any[] }) {
  const chartData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
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

  if (totalAppointments === 0) return null;

  // Transform data for gifted-charts stack bar
  const stackData = chartData.map(item => {
    return {
      stacks: [
        { value: item.completed, color: '#4f46e5', marginBottom: item.pending > 0 || item.cancelled > 0 ? 2 : 0 },
        { value: item.pending, color: '#eab308', marginBottom: item.cancelled > 0 ? 2 : 0 },
        { value: item.cancelled, color: '#ef4444', marginBottom: 0 },
      ],
      label: item.name,
    };
  });

  const screenWidth = Dimensions.get('window').width;

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-center gap-3 pb-2">
        <View className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center">
          <Ionicons name="pulse" size={20} color="#4f46e5" />
        </View>
        <View>
          <Text className="font-bold text-slate-800 dark:text-slate-100 text-base">كثافة المواعيد</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">حجم المواعيد خلال الأيام السبعة الماضية</Text>
        </View>
      </CardHeader>
      <CardContent>
        <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
          <BarChart
            stackData={stackData}
            barWidth={24}
            spacing={20}
            roundedTop
            hideRules
            xAxisThickness={1}
            xAxisColor="#e2e8f0"
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#94a3b8', fontSize: 10, fontWeight: '600' }}
            noOfSections={4}
            maxValue={Math.max(...chartData.map(d => d.completed + d.pending + d.cancelled), 5) * 1.2}
            width={screenWidth - 110}
            height={200}
            isAnimated
            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10, fontWeight: 'bold' }}
          />
          {/* Legend */}
          <View className="flex-row justify-center flex-wrap gap-4 mt-6">
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-full bg-[#4f46e5]" />
              <Text className="text-xs text-slate-500 font-bold">مؤكدة/مكتملة</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-full bg-[#eab308]" />
              <Text className="text-xs text-slate-500 font-bold">انتظار</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-full bg-[#ef4444]" />
              <Text className="text-xs text-slate-500 font-bold">ملغاة</Text>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
