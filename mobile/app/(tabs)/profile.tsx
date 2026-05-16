import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';

const BLOOD_TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  'A+':  { bg: '#fee2e2', text: '#991b1b' },
  'A-':  { bg: '#fecaca', text: '#7f1d1d' },
  'B+':  { bg: '#fef3c7', text: '#78350f' },
  'B-':  { bg: '#fde68a', text: '#713f12' },
  'O+':  { bg: '#dcfce7', text: '#14532d' },
  'O-':  { bg: '#bbf7d0', text: '#166534' },
  'AB+': { bg: '#ede9fe', text: '#4c1d95' },
  'AB-': { bg: '#ddd6fe', text: '#5b21b6' },
};

export default function ProfileScreen() {
  const { user, logout, refreshUserData } = useAuth();
  const { themePreference, setThemePreference } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const isDoctor = user?.role === 'doctor';
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'M';
  const qrValue = user?._id ? `medcore://emergency/${user._id}` : '';

  // Auto-refresh profile data on mount so latest data is always shown
  useEffect(() => {
    refreshUserData().catch(() => {});
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، خروج',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ],
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshUserData(); } catch { /* ignore */ }
    finally { setRefreshing(false); }
  };

  const bloodTypeStyle =
    user?.bloodType && user.bloodType !== 'unknown'
      ? (BLOOD_TYPE_COLOR[user.bloodType] || { bg: '#f1f5f9', text: '#475569' })
      : { bg: '#f1f5f9', text: '#94a3b8' };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      {/* Sky header — taller bottom padding so avatar card overlaps cleanly */}
      <View className="bg-sky-600 dark:bg-sky-700 px-5 pt-4 pb-20">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center"
            onPress={() => router.push('/profile/edit' as any)}
          >
            <Ionicons name="create-outline" size={14} color="#ffffff" />
            <Text className="text-white text-xs font-bold mr-1">تعديل</Text>
          </TouchableOpacity>
          <View className="items-end flex-1 mr-3">
            <Text className="text-white text-xl font-black">حسابي</Text>
            <Text className="text-sky-200 text-xs mt-0.5">
              {isDoctor ? 'ملف الطبيب' : 'ملفك الشخصي والطبي'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#0284c7" />
        }
      >
        {/* Avatar card — overlaps sky header */}
        <View className="mx-4 -mt-12 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 mb-4">
          <View className="flex-row items-center">
            <View className="flex-1 items-end mr-4">
              <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 text-right" numberOfLines={1}>
                {isDoctor ? `د. ${user?.fullName}` : user?.fullName}
              </Text>
              <View className="flex-row items-center mt-1.5 gap-2">
                <View className="bg-sky-100 dark:bg-sky-900/40 px-3 py-1 rounded-full">
                  <Text className="text-sky-700 dark:text-sky-300 text-xs font-bold">
                    {isDoctor ? 'طبيب' : 'مريض'}
                  </Text>
                </View>
                {user?.nationalId && (
                  <Text className="text-slate-400 dark:text-slate-500 text-xs">{user.nationalId}</Text>
                )}
              </View>
              {user?.email && (
                <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1 text-right">{user.email}</Text>
              )}
            </View>
            <View className="w-16 h-16 rounded-2xl bg-sky-100 dark:bg-sky-900/40 items-center justify-center">
              <Text className="text-3xl font-black text-sky-600 dark:text-sky-300">{initial}</Text>
            </View>
          </View>

          {/* Blood type badge — patients only */}
          {!isDoctor && user?.bloodType && user.bloodType !== 'unknown' && (
            <View className="flex-row justify-end mt-3">
              <View
                style={{ backgroundColor: bloodTypeStyle.bg }}
                className="flex-row items-center px-4 py-2 rounded-full"
              >
                <Text style={{ color: bloodTypeStyle.text }} className="font-black text-base ml-2">
                  {user.bloodType}
                </Text>
                <Ionicons name="water" size={16} color={bloodTypeStyle.text} />
              </View>
            </View>
          )}
        </View>

        {/* Contact info */}
        <SectionCard title="معلومات التواصل">
          <InfoRow icon="mail-outline"     label="البريد الإلكتروني" value={user?.email} />
          <Divider />
          <InfoRow icon="call-outline"     label="رقم الهاتف"        value={user?.phoneNumber || 'غير محدد'} />
          <Divider />
          <InfoRow icon="location-outline" label="العنوان"           value={user?.address    || 'غير محدد'} />
        </SectionCard>

        {/* Patient medical info */}
        {!isDoctor && (
          <SectionCard title="المعلومات الطبية">
            <InfoRow
              icon="water-outline"
              label="فصيلة الدم"
              value={
                user?.bloodType && user.bloodType !== 'unknown' ? user.bloodType : 'غير محدد'
              }
            />
            <Divider />
            <InfoRow
              icon="calendar-outline"
              label="تاريخ الميلاد"
              value={
                user?.dateOfBirth
                  ? new Date(user.dateOfBirth).toLocaleDateString('ar-EG', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })
                  : 'غير محدد'
              }
            />
            <Divider />
            <InfoRow
              icon="alert-circle-outline"
              label="الحساسيات"
              value={user?.allergies?.length ? user.allergies.join('، ') : 'لا يوجد'}
            />
            <Divider />
            <InfoRow
              icon="heart-outline"
              label="الأمراض المزمنة"
              value={user?.chronicDiseases?.length ? user.chronicDiseases.join('، ') : 'لا يوجد'}
            />
          </SectionCard>
        )}

        {/* Doctor specialty */}
        {isDoctor && (user as any)?.specialty && (
          <SectionCard title="التخصص">
            <InfoRow
              icon="medical-outline"
              label="التخصص الطبي"
              value={(user as any).specialty}
            />
          </SectionCard>
        )}

        {/* Doctor: schedule shortcut */}
        {isDoctor && (
          <TouchableOpacity
            className="mx-4 flex-row items-center bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 px-4 py-4 mb-4"
            onPress={() => router.push('/doctor/schedule' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color="#94a3b8" />
            <View className="flex-1 items-end mr-3">
              <Text className="text-slate-800 dark:text-slate-100 font-bold text-base">جدول العمل</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">أيام وساعات العمل ومدة المواعيد</Text>
            </View>
            <View className="w-10 h-10 bg-teal-50 dark:bg-teal-900/40 rounded-2xl items-center justify-center">
              <Ionicons name="calendar" size={20} color="#0d9488" />
            </View>
          </TouchableOpacity>
        )}

        {/* Patient QR emergency card */}
        {!isDoctor && (
          <View className="mx-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 mb-4">
            <View className="flex-row items-center justify-between mb-4">
              <View className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3 py-1 rounded-full">
                <Text className="text-red-600 dark:text-red-400 text-xs font-bold">طوارئ</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-slate-800 dark:text-slate-100 font-bold text-sm ml-2">رمز QR الخاص بك</Text>
                <Ionicons name="qr-code" size={18} color="#0284c7" />
              </View>
            </View>

            <View className="items-center">
              <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                {qrValue ? (
                  <QRCode value={qrValue} size={180} color="#0f172a" backgroundColor="#ffffff" />
                ) : (
                  <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="qr-code-outline" size={56} color="#cbd5e1" />
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>لم يتم تحميل البيانات</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3 leading-5 px-4">
                أبرز هذا الكود للطبيب أو المسعف للوصول الفوري لبياناتك الحرجة
              </Text>
            </View>
          </View>
        )}

        {/* Theme picker */}
        <SectionCard title="المظهر">
          <View className="flex-row-reverse gap-2">
            <ThemePill
              label="فاتح"
              icon="sunny"
              active={themePreference === 'light'}
              onPress={() => setThemePreference('light')}
            />
            <ThemePill
              label="داكن"
              icon="moon"
              active={themePreference === 'dark'}
              onPress={() => setThemePreference('dark')}
            />
            <ThemePill
              label="تلقائي"
              icon="phone-portrait"
              active={themePreference === 'system'}
              onPress={() => setThemePreference('system')}
            />
          </View>
          <Text className="text-xs text-slate-400 dark:text-slate-500 text-right mt-3 leading-5">
            اختر "تلقائي" لمتابعة وضع الجهاز
          </Text>
        </SectionCard>

        {/* Logout */}
        <TouchableOpacity
          className="mx-4 flex-row justify-center items-center py-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 mb-4"
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text className="text-red-500 dark:text-red-400 font-bold text-base ml-2">تسجيل الخروج</Text>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        </TouchableOpacity>

        <Text className="text-center text-xs text-slate-300 dark:text-slate-600 mt-2">
          © {new Date().getFullYear()} MedCore — UMR System
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mx-4 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 mb-4">
      <Text className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest text-right mb-3">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-slate-100 dark:bg-slate-800 my-2 ml-12" />;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View className="flex-row items-center py-1.5">
      <View className="flex-1">
        <Text className="text-xs text-slate-400 dark:text-slate-500 font-medium text-right mb-0.5">{label}</Text>
        <Text className="text-sm text-slate-800 dark:text-slate-100 font-semibold text-right" numberOfLines={2}>
          {value || '—'}
        </Text>
      </View>
      <View className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full items-center justify-center mr-3">
        <Ionicons name={icon as any} size={18} color="#64748b" />
      </View>
    </View>
  );
}

function ThemePill({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ${
        active
          ? 'bg-sky-600 border-sky-600 dark:bg-sky-500 dark:border-sky-500'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={active ? '#ffffff' : '#64748b'}
      />
      <Text
        className={`text-sm font-bold mr-2 ${
          active ? 'text-white' : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
