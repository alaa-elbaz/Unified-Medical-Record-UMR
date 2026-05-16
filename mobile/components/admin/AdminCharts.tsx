import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent, CardHeader } from '../ui/Card';

const COLORS = ['#f43f5e', '#0ea5e9', '#6366f1', '#10b981', '#8b5cf6', '#f59e0b'];

export default function AdminCharts({ stats, users = [] }: { stats: any; users?: any[] }) {
  const roleData = useMemo(() => {
    if (stats) {
      const map = [];
      if (stats.totalPatients) map.push({ label: 'مرضى', value: stats.totalPatients });
      if (stats.totalDoctors) map.push({ label: 'أطباء', value: stats.totalDoctors });
      if (stats.totalHospitals) map.push({ label: 'مستشفيات', value: stats.totalHospitals });
      if (stats.totalLabs) map.push({ label: 'مختبرات', value: stats.totalLabs });
      if (stats.totalPharmacies) map.push({ label: 'صيدليات', value: stats.totalPharmacies });
      return map.filter(d => d.value > 0);
    }
    return [];
  }, [stats]);

  if (roleData.length === 0) return null;

  const barData = roleData.map((item, index) => ({
    value: item.value,
    label: item.label,
    frontColor: COLORS[index % COLORS.length],
  }));

  const screenWidth = Dimensions.get('window').width;

  return (
    <Card className="mb-6">
      <CardHeader className="flex-row items-center gap-3 pb-2">
        <View className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 items-center justify-center">
          <Ionicons name="bar-chart" size={20} color="#d97706" />
        </View>
        <View>
          <Text className="font-bold text-slate-800 dark:text-slate-100 text-base">توزيع المستخدمين</Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">إجمالي {stats?.totalUsers || 0} مستخدم مسجل</Text>
        </View>
      </CardHeader>
      <CardContent>
        <View style={{ width: '100%', alignItems: 'center', marginTop: 10 }}>
          <BarChart
            data={barData}
            barWidth={32}
            spacing={24}
            roundedTop
            hideRules
            xAxisThickness={1}
            xAxisColor="#e2e8f0"
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#94a3b8', fontSize: 10, fontWeight: '600' }}
            noOfSections={4}
            maxValue={Math.max(...barData.map(d => d.value), 10) * 1.2}
            width={screenWidth - 110}
            height={200}
            isAnimated
            showValuesAsTopLabel
            topLabelTextStyle={{ color: '#64748b', fontSize: 10, fontWeight: 'bold' }}
            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10, fontWeight: 'bold', rotation: -45, textAlign: 'center' }}
          />
        </View>
      </CardContent>
    </Card>
  );
}
