import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';
import { useAuth, getDisplayName } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { Appointment, Doctor, Patient } from '../../types/api';

interface Department { _id: string; name: string; head?: string; }

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  Pending:       { label: 'قيد الانتظار', bg: '#fef9c3', text: '#854d0e' },
  Confirmed:     { label: 'مؤكد',         bg: '#dcfce7', text: '#166534' },
  'In-Progress': { label: 'جارٍ',          bg: '#dbeafe', text: '#1e40af' },
  Completed:     { label: 'مكتمل',        bg: '#e0e7ff', text: '#3730a3' },
  Cancelled:     { label: 'ملغى',         bg: '#fee2e2', text: '#991b1b' },
};
type Tab = 'overview' | 'appointments' | 'departments' | 'doctors' | 'search';

export default function HospitalHome() {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalAppointmentsToday: 0, totalDoctors: 0, activeDepartments: 0 });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, d, doc, a] = await Promise.allSettled([
        api.get('/hospital/stats'),
        api.get('/hospital/departments'),
        api.get('/hospital/doctors'),
        api.get('/appointments'),
      ]);
      if (s.status === 'fulfilled')   setStats(s.value.data.data || s.value.data);
      if (d.status === 'fulfilled')   setDepartments(d.value.data.data || []);
      if (doc.status === 'fulfilled') setDoctors(doc.value.data.data || []);
      if (a.status === 'fulfilled')   setAppointments(a.value.data.data || []);
    } finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
      const results = res.data.data || [];
      setSearchResults(results);
      if (!results.length) Alert.alert('بحث', 'لا يوجد مرضى مطابقون');
    } catch { Alert.alert('خطأ', 'تعذّر البحث.'); }
    finally { setIsSearching(false); }
  };

  const handleLogout = () => Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'خروج', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
  ]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'نظرة عامة' }, { id: 'appointments', label: 'المواعيد' },
    { id: 'departments', label: 'الأقسام' }, { id: 'doctors', label: 'الأطباء' },
    { id: 'search', label: 'بحث عن مريض' },
  ];

  const card = { backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', elevation: 1 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
      <View style={{ backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
            <Ionicons name="log-out-outline" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#e9d5ff', fontSize: 12, fontWeight: '600' }}>مستشفى</Text>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>{getDisplayName(user)}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(hospital)/scan' as any)}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="scan" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: isDark ? '#0f172a' : 'white', borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f1f5f9', maxHeight: 52 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={{ paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: activeTab === t.id ? '#7c3aed' : 'transparent', marginRight: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === t.id ? '#7c3aed' : (isDark ? '#cbd5e1' : '#94a3b8') }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#7c3aed" /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchAll(); }} colors={['#7c3aed']} />} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>

          {activeTab === 'overview' && (<>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {[
                { label: 'مواعيد اليوم', value: stats.totalAppointmentsToday, color: '#7c3aed', bg: '#ede9fe', icon: 'calendar' },
                { label: 'الأطباء',      value: stats.totalDoctors,           color: '#0d9488', bg: '#ccfbf1', icon: 'medkit' },
                { label: 'الأقسام',      value: stats.activeDepartments,      color: '#0284c7', bg: '#e0f2fe', icon: 'business' },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 14, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ionicons name={s.icon as any} size={18} color={s.color} />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#1e293b' }}>{s.value}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 10 }}>آخر المواعيد</Text>
            {appointments.slice(0, 5).map((a, i) => {
              const st = STATUS_MAP[a.status] || { label: a.status, bg: '#f1f5f9', text: '#64748b' };
              return (
                <View key={a._id || i} style={card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: st.text }}>{st.label}</Text></View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 14 }}>{a.patient?.fullName || 'مريض'}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{a.date ? new Date(a.date).toLocaleDateString('ar-EG') : ''}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {!appointments.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>لا توجد مواعيد</Text>}
          </>)}

          {activeTab === 'appointments' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 10 }}>المواعيد ({appointments.length})</Text>
            {appointments.map((a, i) => {
              const st = STATUS_MAP[a.status] || { label: a.status, bg: '#f1f5f9', text: '#64748b' };
              return (
                <View key={a._id || i} style={card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: st.text }}>{st.label}</Text></View>
                    <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{a.patientId?.fullName || a.patient?.fullName || 'مريض'}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>د. {a.doctorId?.fullName || a.doctor?.fullName || '—'}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{a.date ? new Date(a.date).toLocaleString('ar-EG') : ''}</Text>
                    </View>
                  </View>
                  {a.status === 'Pending' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity onPress={async () => {
                        try { await api.patch(`/appointments/${a._id}/status`, { status: 'Cancelled' }); fetchAll(); }
                        catch { Alert.alert('خطأ', 'فشل التحديث'); }
                      }} style={{ flex: 1, backgroundColor: '#fee2e2', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 12 }}>رفض</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={async () => {
                        try { await api.patch(`/appointments/${a._id}/status`, { status: 'Confirmed' }); fetchAll(); }
                        catch { Alert.alert('خطأ', 'فشل التحديث'); }
                      }} style={{ flex: 1, backgroundColor: '#dcfce7', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>تأكيد</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
            {!appointments.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد مواعيد</Text>}
          </>)}

          {activeTab === 'departments' && (<>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => router.push('/(hospital)/add-department' as any)}
                style={{ backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="add" size={16} color="white" />
                <Text style={{ color: 'white', fontWeight: '700', marginRight: 4, fontSize: 13 }}>إضافة قسم</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b' }}>الأقسام ({departments.length})</Text>
            </View>
            {departments.map((d, i) => (
              <View key={d._id || i} style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ede9fe', borderRadius: 12 }}><Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 13 }}>{d.doctorsCount || 0} طبيب</Text></View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{d.name}</Text>
                  {Boolean(d.head) && <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{d.head}</Text>}
                </View>
              </View>
            ))}
            {!departments.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد أقسام</Text>}
          </>)}

          {activeTab === 'doctors' && (<>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => router.push('/(hospital)/add-doctor' as any)}
                style={{ backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="add" size={16} color="white" />
                <Text style={{ color: 'white', fontWeight: '700', marginRight: 4, fontSize: 13 }}>إضافة طبيب</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b' }}>الأطباء ({doctors.length})</Text>
            </View>
            {doctors.map((d, i) => (
              <View key={d._id || i} style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '900', color: '#0d9488', fontSize: 16 }}>{(d.fullName || 'D').charAt(0)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>د. {d.fullName}</Text>
                  <Text style={{ color: '#0d9488', fontSize: 13, fontWeight: '600' }}>{d.specialty || 'طب عام'}</Text>
                  {Boolean(d.phoneNumber) && <Text style={{ color: '#94a3b8', fontSize: 12 }}>{d.phoneNumber}</Text>}
                </View>
              </View>
            ))}
            {!doctors.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا يوجد أطباء</Text>}
          </>)}

          {activeTab === 'search' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 12 }}>البحث عن مريض</Text>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TouchableOpacity onPress={handleSearch} style={{ backgroundColor: '#7c3aed', paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                {isSearching ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={20} color="white" />}
              </TouchableOpacity>
              <TextInput style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : 'white', borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, textAlign: 'right', color: isDark ? '#f8fafc' : '#1e293b', fontSize: 15 }} placeholder="ابحث بالاسم أو الرقم القومي..." placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} onSubmitEditing={handleSearch} returnKeyType="search" textAlign="right" />
            </View>
            {searchResults.map((p, i) => (
              <View key={p._id || i} style={card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontWeight: '900', color: '#0284c7', fontSize: 16 }}>{(p.fullName || 'M').charAt(0)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{p.fullName}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>{p.nationalId}</Text>
                    {Boolean(p.phoneNumber) && <Text style={{ color: '#94a3b8', fontSize: 12 }}>{p.phoneNumber}</Text>}
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push(`/appointment/book?patientId=${p._id}` as any)}
                  style={{ backgroundColor: '#7c3aed', paddingVertical: 10, borderRadius: 12, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>حجز موعد</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>)}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
