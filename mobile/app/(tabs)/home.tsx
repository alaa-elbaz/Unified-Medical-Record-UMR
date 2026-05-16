import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { usePatientData } from '../../hooks/usePatientData';
import { useDoctorData } from '../../hooks/useDoctorData';
import { Button } from '../../components/ui/Button';
import DoctorCharts from '../../components/doctor/DoctorCharts';
import api from '../../services/api';
import { Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const STATUS_LABEL: Record<string, string> = {
  Pending: 'قيد الانتظار', Confirmed: 'مؤكد', 'In-Progress': 'جارٍ',
  Completed: 'مكتمل', Cancelled: 'ملغى', 'Follow-up': 'متابعة',
};
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Confirmed:     { bg: '#dcfce7', text: '#166534' },
  Pending:       { bg: '#fef9c3', text: '#854d0e' },
  'In-Progress': { bg: '#dbeafe', text: '#1e40af' },
  Completed:     { bg: '#e0e7ff', text: '#3730a3' },
  Cancelled:     { bg: '#fee2e2', text: '#991b1b' },
  'Follow-up':   { bg: '#f3e8ff', text: '#6b21a8' },
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const isDoctor = user?.role === 'doctor';
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'M';

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      {/* Sky gradient header */}
      <View className="bg-sky-600 dark:bg-sky-700 px-5 pt-4 pb-8">
        <View className="flex-row items-center justify-between">
          <View className="bg-white/20 px-3 py-1 rounded-full">
            <Text className="text-white text-xs font-bold">
              {isDoctor ? 'طبيب' : 'مريض'}
            </Text>
          </View>
          <View className="flex-1 items-end mr-3">
            <Text className="text-sky-200 text-xs font-medium">مرحباً،</Text>
            <Text className="text-white text-base font-bold" numberOfLines={1}>
              {isDoctor ? `د. ${user?.fullName}` : user?.fullName}
            </Text>
          </View>
          <View className="w-11 h-11 rounded-2xl bg-white/20 items-center justify-center">
            <Text className="text-white text-lg font-black">{initial}</Text>
          </View>
        </View>
      </View>

      {/* Content card pulls up over the header */}
      <View className="flex-1 -mt-4">
        {isDoctor ? <DoctorDashboard isDark={isDark} /> : <PatientDashboard isDark={isDark} />}
      </View>
    </SafeAreaView>
  );
}

// ─── Patient Dashboard ───────────────────────────────────────────────────────

function PatientDashboard({ isDark }: { isDark: boolean }) {
  const { user } = useAuth();
  const {
    appointments, upcomingAppointments, profileWarnings, isLoading, errors,
    medicalRecords, labResults, prescriptions, refetch,
  } = usePatientData();

  const qrValue = user?._id ? `medcore://emergency/${user._id}` : '';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-t-3xl">
        <ActivityIndicator size="large" color={isDark ? '#7dd3fc' : '#0284c7'} />
        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-3">جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-t-3xl"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={isDark ? '#7dd3fc' : '#0284c7'} />
      }
    >
      {/* Data load errors */}
      {errors.length > 0 && (
        <TouchableOpacity
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-center mt-5 mb-1"
          onPress={refetch}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={16} color="#dc2626" style={{ marginLeft: 4 }} />
          <View className="flex-1 mx-2">
            <Text className="text-red-800 font-bold text-sm text-right">تعذّر تحميل بعض البيانات</Text>
            <Text className="text-red-600 text-xs text-right mt-0.5" numberOfLines={1}>
              {errors.join('، ')} — اضغط لإعادة المحاولة
            </Text>
          </View>
          <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center">
            <Ionicons name="cloud-offline" size={16} color="#dc2626" />
          </View>
        </TouchableOpacity>
      )}

      {/* Profile completion warning */}
      {profileWarnings.length > 0 && (
        <TouchableOpacity
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center mt-5 mb-1"
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={16} color="#d97706" style={{ marginLeft: 4 }} />
          <View className="flex-1 mx-2">
            <Text className="text-amber-800 font-bold text-sm text-right">أكمل ملفك الطبي</Text>
            <Text className="text-amber-600 text-xs text-right mt-0.5" numberOfLines={1}>
              ينقصك: {profileWarnings.join('، ')}
            </Text>
          </View>
          <View className="w-8 h-8 bg-amber-100 rounded-full items-center justify-center">
            <Ionicons name="warning" size={16} color="#d97706" />
          </View>
        </TouchableOpacity>
      )}

      {/* ── Emergency QR Card ── */}
      <View className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 mt-4 mb-4">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            className="bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/50 px-3 py-1.5 rounded-full"
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text className="text-sky-600 dark:text-sky-300 text-xs font-bold">عرض الملف</Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Text className="text-slate-800 dark:text-slate-100 font-bold text-base ml-2">بطاقة الطوارئ</Text>
            <View className="w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-full items-center justify-center">
              <Ionicons name="medical" size={16} color="#ef4444" />
            </View>
          </View>
        </View>

        <View className="flex-row items-center">
          {/* QR Code block */}
          <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
            {qrValue ? (
              <QRCode value={qrValue} size={112} color="#0f172a" backgroundColor="#ffffff" />
            ) : (
              <View style={{ width: 112, height: 112, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="qr-code-outline" size={48} color="#cbd5e1" />
              </View>
            )}
          </View>

          {/* Critical health info */}
          <View className="flex-1 mr-4 gap-2">
            <InfoChip
              icon="water" iconColor="#dc2626" label="فصيلة الدم"
              value={user?.bloodType && user.bloodType !== 'unknown' ? user.bloodType : '—'}
            />
            <InfoChip
              icon="alert-circle" iconColor="#d97706" label="حساسية"
              value={user?.allergies?.length ? user.allergies[0] : 'لا يوجد'}
            />
            <InfoChip
              icon="heart" iconColor="#7c3aed" label="أمراض مزمنة"
              value={user?.chronicDiseases?.length ? user.chronicDiseases[0] : 'لا يوجد'}
            />
          </View>
        </View>

        <Text className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3 leading-5">
          أبرز هذا الكود للطبيب أو المسعف للوصول الفوري لبياناتك الحرجة
        </Text>
      </View>

      {/* ── AI Chatbot banner ── */}
      <TouchableOpacity
        className="bg-teal-600 rounded-2xl p-4 mb-4 flex-row items-center justify-between shadow-sm"
        onPress={() => router.push('/chatbot' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="chevron-back" size={20} color="#99f6e4" />
        <View className="flex-row items-center">
          <Text className="text-white font-bold text-sm ml-3">اسأل المساعد الطبي الذكي</Text>
          <View className="w-9 h-9 bg-teal-500 rounded-xl items-center justify-center">
            <Ionicons name="sparkles" size={18} color="#ffffff" />
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Quick Actions (add new records) ── */}
      <Text className="text-slate-800 dark:text-slate-100 font-bold text-base text-right mb-2">إضافة سريعة</Text>
      <View className="flex-row gap-2 mb-4">
        <QuickAction icon="document-text" label="تقرير ذاتي" color="#0284c7" bg="#e0f2fe" onPress={() => router.push('/records/self-report' as any)} />
        <QuickAction icon="medkit" label="دواء" color="#7c3aed" bg="#ede9fe" onPress={() => router.push('/medications/add' as any)} />
        <QuickAction icon="flask" label="تحليل" color="#0d9488" bg="#ccfbf1" onPress={() => router.push('/labs/upload' as any)} />
        <QuickAction icon="scan-circle" label="أشعة" color="#d97706" bg="#fef3c7" onPress={() => router.push('/radiology/upload' as any)} />
      </View>

      {/* ── Quick Stats ── */}
      <View className="flex-row gap-3 mb-3">
        <StatCard
          icon="calendar" iconColor="#2563eb" iconBg="#dbeafe"
          count={appointments?.length || 0} label="المواعيد"
          onPress={() => router.push('/(tabs)/appointments')}
        />
        <StatCard
          icon="document-text" iconColor="#059669" iconBg="#d1fae5"
          count={medicalRecords?.length || 0} label="السجلات"
          onPress={() => router.push('/(tabs)/records')}
        />
      </View>
      <View className="flex-row gap-3 mb-4">
        <StatCard
          icon="medkit" iconColor="#9333ea" iconBg="#f3e8ff"
          count={prescriptions?.length || 0} label="الأدوية"
          onPress={() => router.push('/(tabs)/records')}
        />
        <StatCard
          icon="flask" iconColor="#e11d48" iconBg="#ffe4e6"
          count={labResults?.length || 0} label="التحاليل"
          onPress={() => router.push('/(tabs)/records')}
        />
      </View>

      {/* ── Next Appointment ── */}
      <View className="flex-row justify-between items-center mb-3">
        <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
          <Text className="text-sky-600 dark:text-sky-300 text-sm font-bold">عرض الكل</Text>
        </TouchableOpacity>
        <Text className="text-slate-800 dark:text-slate-100 font-bold text-base">الموعد القادم</Text>
      </View>

      {upcomingAppointments.length > 0 ? (
        <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 rounded-2xl items-center justify-center ml-3">
              <Ionicons name="calendar" size={20} color="#0284c7" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-slate-800 dark:text-slate-100 text-right" numberOfLines={1}>
                {upcomingAppointments[0].doctorId
                  ? `د. ${upcomingAppointments[0].doctorId.fullName}`
                  : upcomingAppointments[0].organizationId?.name || 'موعد طبي'}
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-xs text-right">
                {upcomingAppointments[0].type || 'زيارة طبية'}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between bg-sky-50 dark:bg-sky-900/30 rounded-xl px-4 py-2">
            <Text className="text-sky-700 font-bold text-sm">{upcomingAppointments[0].time}</Text>
            <Text className="text-sky-700 font-bold text-sm">
              {new Date(upcomingAppointments[0].date).toLocaleDateString('ar-EG', {
                weekday: 'short', day: 'numeric', month: 'short',
              })}
            </Text>
          </View>
          {(() => {
            const s = upcomingAppointments[0].status;
            const sc = STATUS_COLOR[s] || STATUS_COLOR['Pending'];
            return (
              <View style={{ backgroundColor: sc.bg }} className="self-end mt-2 px-3 py-1 rounded-full">
                <Text style={{ color: sc.text }} className="text-xs font-bold">
                  {STATUS_LABEL[s] || s}
                </Text>
              </View>
            );
          })()}
        </View>
      ) : (
        <View className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 items-center">
          <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
          <Text className="text-slate-500 dark:text-slate-400 font-medium mt-3 mb-3">لا توجد مواعيد قادمة</Text>
          <TouchableOpacity
            className="bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800/50 px-5 py-2 rounded-xl"
            onPress={() => router.push('/(tabs)/appointments')}
          >
            <Text className="text-sky-600 dark:text-sky-300 font-bold text-sm">احجز موعداً الآن</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Doctor Dashboard ────────────────────────────────────────────────────────

function DoctorDashboard({ isDark }: { isDark: boolean }) {
  const { appointments, patients, prescriptions, todayAppointments, pendingCount, completedCount, isLoading, errors, refetch } = useDoctorData();

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status });
      Alert.alert('تم', 'تم تحديث حالة الموعد بنجاح');
      refetch();
    } catch {
      Alert.alert('خطأ', 'تعذر تحديث الحالة');
    }
  };

  const startExam = async (apt: any) => {
    try {
      if (apt.status === 'Confirmed') {
        await api.patch(`/appointments/${apt._id}/status`, { status: 'In-Progress' });
        refetch();
      }
      router.push(`/exam/${apt._id}` as any);
    } catch {
      Alert.alert('خطأ', 'لم نتمكن من بدء الكشف');
    }
  };

  if (isLoading && appointments.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-t-3xl">
        <ActivityIndicator size="large" color={isDark ? '#7dd3fc' : '#0284c7'} />
        <Text className="text-slate-400 dark:text-slate-500 text-xs mt-3">جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-t-3xl"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={isDark ? '#7dd3fc' : '#0284c7'} />}
    >
      {errors.length > 0 && (
        <TouchableOpacity className="bg-red-50 border border-red-200 rounded-2xl p-4 flex-row items-center mt-5 mb-1" onPress={refetch}>
          <Ionicons name="refresh" size={16} color="#dc2626" style={{ marginLeft: 4 }} />
          <View className="flex-1 mx-2">
            <Text className="text-red-800 font-bold text-sm text-right">تعذّر تحميل بعض البيانات</Text>
            <Text className="text-red-600 text-xs text-right mt-0.5">{errors.join('، ')}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Stats Cards */}
      <View className="flex-row flex-wrap mt-5 mb-2 mx-[-4px]">
        {[
          { label: 'المرضى', value: patients.length, color: '#0284c7', bg: 'bg-sky-100 dark:bg-sky-900/30', icon: 'people', route: '/(tabs)/patients' },
          { label: 'اليوم', value: todayAppointments.length, color: '#059669', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: 'calendar', route: '/(tabs)/appointments' },
          { label: 'انتظار', value: pendingCount, color: '#d97706', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'time', route: '/(tabs)/appointments' },
          { label: 'روشتات', value: prescriptions.length, color: '#7c3aed', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'document-text', route: null },
        ].map((s, i) => (
          <View key={i} className="w-[48%] mx-[1%] mb-2">
            <TouchableOpacity 
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 items-center"
              onPress={() => s.route && router.push(s.route as any)}
              activeOpacity={0.8}
            >
              <View className={`w-10 h-10 rounded-xl ${s.bg} items-center justify-center mb-2`}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text className="text-2xl font-black text-slate-800 dark:text-slate-100">{s.value}</Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">{s.label}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <DoctorCharts appointments={appointments} />

      <View className="flex-row justify-between items-center mb-3">
        <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
          <Text className="text-sky-600 dark:text-sky-300 text-sm font-bold">عرض الكل</Text>
        </TouchableOpacity>
        <Text className="text-slate-800 dark:text-slate-100 font-bold text-lg">مواعيد اليوم</Text>
      </View>

      {todayAppointments.slice(0, 5).length > 0 ? (
        todayAppointments.slice(0, 5).map((apt) => {
          const sc = STATUS_COLOR[apt.status] || STATUS_COLOR['Pending'];
          return (
            <View key={apt._id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 mb-3">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800/50 px-3 py-1.5 rounded-lg">
                    <Text className="text-sky-700 font-bold text-sm">{apt.time}</Text>
                  </View>
                  <View style={{ backgroundColor: sc.bg }} className="px-2 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                    <Text style={{ color: sc.text }} className="text-xs font-bold">{STATUS_LABEL[apt.status] || apt.status}</Text>
                  </View>
                </View>
                <View className="items-end flex-1 ml-3">
                  <Text className="font-bold text-slate-800 dark:text-slate-100 text-base" numberOfLines={1}>
                    {apt.patientId?.fullName || apt.patient?.fullName || 'مريض غير معروف'}
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{apt.appointmentType || apt.type || 'كشف'}</Text>
                </View>
              </View>
              
              {/* Quick Actions */}
              <View className="flex-row gap-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                {apt.status === 'Pending' && (
                  <>
                    <Button variant="destructive" size="sm" className="flex-1 h-9" onPress={() => handleUpdateStatus(apt._id, 'Cancelled')}>
                      <Ionicons name="close-circle" size={16} color="white" className="mr-1" /> رفض
                    </Button>
                    <Button size="sm" className="flex-1 h-9 bg-green-600" onPress={() => handleUpdateStatus(apt._id, 'Confirmed')}>
                      <Ionicons name="checkmark-circle" size={16} color="white" className="mr-1" /> قبول
                    </Button>
                  </>
                )}
                {(apt.status === 'Confirmed' || apt.status === 'In-Progress') && (
                  <Button size="sm" className="flex-1 h-9 bg-indigo-600" onPress={() => startExam(apt)}>
                    <Ionicons name="medkit" size={16} color="white" className="mr-1" /> 
                    {apt.status === 'In-Progress' ? 'استئناف' : 'بدء الكشف'}
                  </Button>
                )}
                {apt.status === 'Completed' && (
                  <Button variant="outline" size="sm" className="flex-1 h-9 border-purple-200 text-purple-700" onPress={() => handleUpdateStatus(apt._id, 'Follow-up')}>
                    <Ionicons name="time" size={16} color="#7e22ce" className="mr-1" /> متابعة
                  </Button>
                )}
              </View>
            </View>
          );
        })
      ) : (
        <View className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 items-center mb-6">
          <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
          <Text className="text-slate-500 dark:text-slate-400 font-bold mt-3">لا توجد مواعيد اليوم</Text>
          <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1 text-center">يبدو أن جدولك فارغ اليوم. يمكنك الاستراحة أو متابعة أعمال أخرى.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Shared components ───────────────────────────────────────────────────────

function StatCard({
  icon, iconColor, iconBg, count, label, onPress,
}: {
  icon: string; iconColor: string; iconBg: string;
  count: number; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 items-center"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ backgroundColor: iconBg }} className="w-11 h-11 rounded-2xl items-center justify-center mb-2">
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text className="text-2xl font-black text-slate-800 dark:text-slate-100">{count}</Text>
      <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{label}</Text>
    </TouchableOpacity>
  );
}

function QuickAction({
  icon, label, color, bg, onPress,
}: { icon: string; label: string; color: string; bg: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1, backgroundColor: 'white', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6,
        alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9',
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10, backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center', marginBottom: 6,
      }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InfoChip({
  icon, iconColor, label, value,
}: {
  icon: string; iconColor: string; label: string; value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="flex-1 items-end">
        <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-4">{label}</Text>
        <Text className="text-xs text-slate-800 dark:text-slate-100 font-bold text-right leading-4" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <View
        className="w-7 h-7 rounded-full items-center justify-center ml-2"
        style={{ backgroundColor: `${iconColor}20` }}
      >
        <Ionicons name={icon as any} size={13} color={iconColor} />
      </View>
    </View>
  );
}
