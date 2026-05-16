import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { usePatientData } from '../../hooks/usePatientData';
import { useDoctorData } from '../../hooks/useDoctorData';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/Toast';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  Pending:       { label: 'قيد الانتظار', color: '#854d0e', bg: '#fef9c3' },
  Confirmed:     { label: 'مؤكد',         color: '#166534', bg: '#dcfce7' },
  'In-Progress': { label: 'جارٍ',         color: '#1e40af', bg: '#dbeafe' },
  Completed:     { label: 'مكتمل',        color: '#3730a3', bg: '#e0e7ff' },
  Cancelled:     { label: 'ملغي',         color: '#991b1b', bg: '#fee2e2' },
  'Follow-up':   { label: 'متابعة',       color: '#6b21a8', bg: '#f3e8ff' },
};

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Sky header */}
      <View className="bg-sky-600 px-5 pt-4 pb-8 flex-row items-center justify-between">
        <View>
          {!isDoctor && (
            <TouchableOpacity
              className="w-10 h-10 bg-white/20 rounded-2xl items-center justify-center"
              onPress={() => router.push('/appointment/book')}
            >
              <Ionicons name="add" size={22} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
        <View className="items-end">
          <Text className="text-white text-xl font-black">المواعيد</Text>
          <Text className="text-sky-200 text-xs mt-0.5">
            {isDoctor ? 'إدارة مواعيد المرضى' : 'مواعيدك الطبية'}
          </Text>
        </View>
      </View>

      <View className="flex-1 -mt-4 bg-slate-50 rounded-t-3xl overflow-hidden">
        {isDoctor ? <DoctorAppointments /> : <PatientAppointments />}
      </View>
    </SafeAreaView>
  );
}

// ─── Patient View ────────────────────────────────────────────────────────────

function PatientAppointments() {
  const { appointments, isLoading, refetch } = usePatientData();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === 'upcoming') {
      return appointments.filter(
        (a) => ['Pending', 'Confirmed'].includes(a.status) && new Date(a.date) >= now,
      );
    }
    if (filter === 'past') {
      return appointments.filter(
        (a) => a.status === 'Completed' || new Date(a.date) < now,
      );
    }
    return appointments;
  }, [appointments, filter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filtered],
  );

  return (
    <View className="flex-1 pt-4 px-4">
      <View className="flex-row gap-2 mb-4">
        {([['all', 'الكل'], ['upcoming', 'القادمة'], ['past', 'السابقة']] as const).map(([k, label]) => (
          <TouchableOpacity
            key={k}
            onPress={() => setFilter(k)}
            className={`px-4 py-2 rounded-full ${
              filter === k ? 'bg-sky-600' : 'bg-white border border-slate-200'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`font-bold text-sm ${filter === k ? 'text-white' : 'text-slate-600'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0284c7" />
          }
          ListEmptyComponent={() => (
            <View className="items-center justify-center mt-20">
              <Ionicons name="calendar-outline" size={56} color="#cbd5e1" />
              <Text className="text-slate-500 font-medium text-base mt-4">لا توجد مواعيد</Text>
              <TouchableOpacity
                className="mt-4 bg-sky-50 border border-sky-200 px-5 py-2.5 rounded-xl"
                onPress={() => router.push('/appointment/book')}
              >
                <Text className="text-sky-600 font-bold">احجز موعداً الآن</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => <PatientAppointmentCard appointment={item} onChanged={refetch} />}
        />
      )}
    </View>
  );
}

function PatientAppointmentCard({ appointment: a, onChanged }: { appointment: any; onChanged: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const statusObj = STATUS_MAP[a.status] || STATUS_MAP['Pending'];
  const providerName =
    a.doctorId         ? `د. ${a.doctorId.fullName}`
    : a.hospitalId?.name ? a.hospitalId.name
    : a.labId?.name      ? a.labId.name
    : 'غير محدد';
  const dateStr = new Date(a.date).toLocaleDateString('ar-EG', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const handleCancel = () => {
    Alert.alert('إلغاء الموعد', 'هل أنت متأكد أنك تريد إلغاء هذا الموعد؟', [
      { text: 'تراجع', style: 'cancel' },
      { text: 'نعم، إلغاء', style: 'destructive', onPress: async () => {
        setCancelling(true);
        try {
          await api.patch(`/appointments/${a._id}/status`, { status: 'Cancelled' });
          toast.success('تم إلغاء الموعد بنجاح');
          // Trigger a real refetch — mutating `a.status` directly does not
          // notify React, so the list wouldn't re-render until pull-to-refresh.
          onChanged?.();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'تعذر الإلغاء');
        } finally {
          setCancelling(false);
        }
      }}
    ]);
  };

  return (
    <View className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 overflow-hidden">
      <View style={{ backgroundColor: statusObj.bg, height: 4 }} />
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View style={{ backgroundColor: statusObj.bg }} className="px-3 py-1 rounded-full">
            <Text style={{ color: statusObj.color }} className="text-xs font-bold">
              {statusObj.label}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-slate-800 text-base text-right" numberOfLines={1}>
              {providerName}
            </Text>
            <Text className="text-slate-500 text-xs text-right mt-0.5">
              {a.type || 'زيارة طبية'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={15} color="#64748b" style={{ marginLeft: 4 }} />
            <Text className="text-slate-600 text-sm font-medium">{a.time}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-slate-600 text-sm font-medium ml-2">{dateStr}</Text>
            <Ionicons name="calendar-outline" size={15} color="#64748b" />
          </View>
        </View>

        {Boolean(a.notes) && (
          <Text className="text-slate-500 text-xs text-right mt-2 leading-5">{a.notes}</Text>
        )}

        {a.status === 'Pending' && (
          <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-50">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 h-9 border-red-200 text-red-700 bg-red-50" 
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <ActivityIndicator size="small" color="#dc2626" /> : (
                <>
                  <Ionicons name="close-circle" size={16} color="#dc2626" className="mr-1" />
                  <Text style={{ color: '#dc2626', fontWeight: 'bold' }}>إلغاء الموعد</Text>
                </>
              )}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Doctor View ─────────────────────────────────────────────────────────────

function DoctorAppointments() {
  const { appointments, isLoading, refetch } = useDoctorData();
  const [filter, setFilter] = useState<'all' | 'today' | 'pending'>('all');

  const filtered = useMemo(() => {
    const todayStr = new Date().toDateString();
    if (filter === 'today') {
      return appointments.filter((a) => new Date(a.date).toDateString() === todayStr);
    }
    if (filter === 'pending') {
      return appointments.filter((a) => a.status === 'Pending');
    }
    return appointments;
  }, [appointments, filter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [filtered],
  );

  const pendingCount = useMemo(
    () => appointments.filter((a) => a.status === 'Pending').length,
    [appointments],
  );

  return (
    <View className="flex-1 pt-4 px-4">
      {/* Summary row */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-white border border-slate-200 rounded-2xl px-3 py-2.5 items-center">
          <Text className="text-2xl font-black text-sky-600">{appointments.length}</Text>
          <Text className="text-xs text-slate-500 mt-0.5">إجمالي</Text>
        </View>
        <View className="flex-1 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5 items-center">
          <Text className="text-2xl font-black text-amber-500">{pendingCount}</Text>
          <Text className="text-xs text-amber-700 mt-0.5">معلق</Text>
        </View>
        <View className="flex-1 bg-sky-50 border border-sky-200 rounded-2xl px-3 py-2.5 items-center">
          <Text className="text-2xl font-black text-sky-600">
            {appointments.filter(
              (a) => new Date(a.date).toDateString() === new Date().toDateString(),
            ).length}
          </Text>
          <Text className="text-xs text-sky-700 mt-0.5">اليوم</Text>
        </View>
      </View>

      {/* Filter pills */}
      <View className="flex-row gap-2 mb-4">
        {([['all', 'الكل'], ['today', 'اليوم'], ['pending', 'معلق']] as const).map(([k, label]) => (
          <TouchableOpacity
            key={k}
            onPress={() => setFilter(k)}
            className={`px-4 py-2 rounded-full ${
              filter === k ? 'bg-sky-600' : 'bg-white border border-slate-200'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`font-bold text-sm ${filter === k ? 'text-white' : 'text-slate-600'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0284c7" />
          }
          ListEmptyComponent={() => (
            <View className="items-center justify-center mt-16">
              <Ionicons name="calendar-outline" size={56} color="#cbd5e1" />
              <Text className="text-slate-500 font-medium text-base mt-4">لا توجد مواعيد</Text>
            </View>
          )}
          renderItem={({ item }) => <DoctorAppointmentCard appointment={item} onChanged={refetch} />}
        />
      )}
    </View>
  );
}

function DoctorAppointmentCard({ appointment: a, onChanged }: { appointment: any; onChanged: () => void }) {
  const statusObj = STATUS_MAP[a.status] || STATUS_MAP['Pending'];
  const isActionable = a.status === 'Confirmed' || a.status === 'In-Progress';
  const isPending    = a.status === 'Pending';
  const isCompleted  = a.status === 'Completed';
  const dateStr = new Date(a.date).toLocaleDateString('ar-EG', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  const updateStatus = async (newStatus: string) => {
    try {
      await api.patch(`/appointments/${a._id}/status`, { status: newStatus });
      toast.success('تم التحديث');
      // Trigger a real refetch via the parent — mutating `a.status` directly
      // does not notify React and the list would not re-render.
      onChanged?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر التحديث');
    }
  };

  return (
    <TouchableOpacity
      className={`bg-white rounded-2xl shadow-sm border mb-3 overflow-hidden ${
        isActionable ? 'border-sky-200' : 'border-slate-100'
      }`}
      onPress={() => isActionable && router.push(`/exam/${a._id}`)}
      activeOpacity={isActionable ? 0.8 : 1}
    >
      <View style={{ backgroundColor: statusObj.bg, height: 4 }} />
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-row items-center gap-2">
            <View style={{ backgroundColor: statusObj.bg }} className="px-2.5 py-1 rounded-full">
              <Text style={{ color: statusObj.color }} className="text-xs font-bold">
                {statusObj.label}
              </Text>
            </View>
            {isActionable && (
              <View className="bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                <Text className="text-sky-600 text-xs font-bold">اضغط للفحص</Text>
              </View>
            )}
          </View>
          <View className="items-end flex-1 mr-3">
            <Text className="font-bold text-slate-800 text-base text-right" numberOfLines={1}>
              {a.patient?.fullName || a.patientId?.fullName || 'مريض'}
            </Text>
            <Text className="text-slate-500 text-xs text-right mt-0.5">
              {a.type || 'زيارة طبية'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={15} color="#64748b" style={{ marginLeft: 4 }} />
            <Text className="text-slate-600 text-sm font-medium">{a.time}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-slate-600 text-sm font-medium ml-2">{dateStr}</Text>
            <Ionicons name="calendar-outline" size={15} color="#64748b" />
          </View>
        </View>

        {/* Action row */}
        {isPending && (
          <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-50">
            <Button variant="destructive" size="sm" className="flex-1 h-9" onPress={() => updateStatus('Cancelled')}>
              <Ionicons name="close-circle" size={16} color="white" className="mr-1" /> <Text style={{color: 'white', fontWeight: 'bold'}}>رفض</Text>
            </Button>
            <Button size="sm" className="flex-1 h-9 bg-green-600" onPress={() => updateStatus('Confirmed')}>
              <Ionicons name="checkmark-circle" size={16} color="white" className="mr-1" /> <Text style={{color: 'white', fontWeight: 'bold'}}>قبول</Text>
            </Button>
          </View>
        )}
        {isCompleted && (
          <View className="mt-3 pt-3 border-t border-slate-50">
            <Button variant="outline" size="sm" className="w-full h-9 border-purple-200 text-purple-700" onPress={() => updateStatus('Follow-up')}>
              <Ionicons name="time" size={16} color="#7e22ce" className="mr-1" /> <Text style={{color: '#7e22ce', fontWeight: 'bold'}}>تحديد متابعة</Text>
            </Button>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
