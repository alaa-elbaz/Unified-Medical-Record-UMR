import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';
import { useAuth, getDisplayName } from '../../context/AuthContext';
import type { Prescription } from '../../types/api';

// Pharmacy view enriches prescriptions with grouped `medications` and
// `dispensedAt` fields populated by the backend list endpoint.
type PharmacyRequest = Prescription & {
  medications?: { name?: string; medication?: string; dose?: string }[];
  patientId?: { fullName?: string; nationalId?: string } | string;
};

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  Pending:   { label: 'بانتظار الصرف', bg: '#fef9c3', text: '#854d0e' },
  Dispensed: { label: 'تم الصرف',     bg: '#dcfce7', text: '#166534' },
  Cancelled: { label: 'ملغى',         bg: '#fee2e2', text: '#991b1b' },
};

type Tab = 'overview' | 'requests' | 'history';

export default function PharmacyHome() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalPrescriptions: 0, pendingPrescriptions: 0, dispensedPrescriptions: 0, todayDispensed: 0, weeklyDispensed: 0, monthlyDispensed: 0 });
  const [requests, setRequests] = useState<PharmacyRequest[]>([]);
  const [history, setHistory] = useState<PharmacyRequest[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      const [s, p, h] = await Promise.allSettled([
        api.get('/prescriptions/pharmacy/stats'),
        api.get('/prescriptions/pharmacy/requests'),
        api.get('/prescriptions/pharmacy/history?limit=50'),
      ]);
      if (s.status === 'fulfilled') {
        const d = s.value.data.data || s.value.data;
        setStats({
          totalPrescriptions: d.total ?? d.totalPrescriptions ?? 0,
          pendingPrescriptions: d.pending ?? d.pendingPrescriptions ?? 0,
          dispensedPrescriptions: d.dispensed ?? d.dispensedPrescriptions ?? 0,
          todayDispensed: d.todayDispensed ?? 0,
          weeklyDispensed: d.weeklyDispensed ?? 0,
          monthlyDispensed: d.monthlyDispensed ?? 0,
        });
      }
      if (p.status === 'fulfilled') setRequests(p.value.data.data || p.value.data.prescriptions || []);
      if (h.status === 'fulfilled') setHistory(h.value.data.data || []);
    } finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDispense = (id: string) => Alert.alert('تأكيد الصرف', 'هل تريد تأكيد صرف هذه الوصفة؟', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'تأكيد الصرف', onPress: async () => {
      try {
        await api.put(`/prescriptions/${id}/dispense`);
        setRequests(prev => prev.filter(p => p._id !== id));
        setStats(prev => ({
          ...prev,
          pendingPrescriptions: Math.max(0, prev.pendingPrescriptions - 1),
          dispensedPrescriptions: prev.dispensedPrescriptions + 1,
        }));
        Alert.alert('تم الصرف ✓', 'تم تأكيد صرف الوصفة الطبية بنجاح.');
        await fetchAll(); // Bug 4 fix: full refresh to sync stats + history
      } catch (err: any) {
        const msg = err.response?.data?.message || 'تعذّر تأكيد الصرف.';
        Alert.alert('خطأ', msg);
        await fetchAll(); // refresh to show actual current state
      }
    }},
  ]);

  const handleLogout = () => Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'خروج', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
  ]);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'requests', label: 'الطلبات الواردة' },
    { id: 'history',  label: 'سجل الصرف' },
  ];

  const card = { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#dc2626" />
      <View style={{ backgroundColor: '#dc2626', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
            <Ionicons name="log-out-outline" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#fecaca', fontSize: 12, fontWeight: '600' }}>صيدلية</Text>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>{getDisplayName(user)}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(pharmacy)/scan' as any)}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="scan" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', maxHeight: 52 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={{ paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: activeTab === t.id ? '#dc2626' : 'transparent', marginRight: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === t.id ? '#dc2626' : '#94a3b8' }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#dc2626" /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchAll(); }} colors={['#dc2626']} />} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>

          {activeTab === 'overview' && (<>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {[
                { label: 'إجمالي الوصفات', value: stats.totalPrescriptions,    color: '#dc2626', bg: '#fee2e2', icon: 'document-text' },
                { label: 'قيد الانتظار',   value: stats.pendingPrescriptions,   color: '#d97706', bg: '#fef3c7', icon: 'time' },
                { label: 'تم الصرف',       value: stats.dispensedPrescriptions, color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
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
            {/* Weekly/Monthly stats row */}
            <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
              {[
                { label: 'اليوم', value: stats.todayDispensed, color: '#2563eb', bg: '#dbeafe', icon: 'today' },
                { label: 'الأسبوع', value: stats.weeklyDispensed, color: '#7c3aed', bg: '#ede9fe', icon: 'calendar' },
                { label: 'الشهر', value: stats.monthlyDispensed, color: '#c026d3', bg: '#fae8ff', icon: 'stats-chart' },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
                    <Ionicons name={s.icon as any} size={16} color={s.color} />
                  </View>
                  <View style={{ alignItems: 'flex-end', flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{s.value}</Text>
                    <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: '600' }}>{s.label}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', textAlign: 'right', marginBottom: 10 }}>أحدث الطلبات</Text>
            {requests.slice(0, 5).map((p, i) => {
              const st = STATUS_MAP[p.status] || { label: p.status, bg: '#f1f5f9', text: '#64748b' };
              return (
                <View key={p._id || i} style={card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: st.text }}>{st.label}</Text></View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 14 }}>{p.patientId?.fullName || p.patient?.fullName || 'مريض'}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>د. {p.doctorId?.fullName || p.doctor?.fullName || '—'}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG') : ''}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {!requests.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>لا توجد طلبات</Text>}
          </>)}

          {activeTab === 'requests' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', textAlign: 'right', marginBottom: 10 }}>الطلبات الواردة ({requests.length})</Text>
            {requests.map((p, i) => {
              const st = STATUS_MAP[p.status] || { label: p.status, bg: '#f1f5f9', text: '#64748b' };
              const isPending = p.status === 'Pending' || p.status === 'pending';
              return (
                <View key={p._id || i} style={card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: st.text }}>{st.label}</Text></View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{p.patientId?.fullName || p.patient?.fullName || 'مريض'}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>د. {p.doctorId?.fullName || p.doctor?.fullName || '—'}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG') : ''}</Text>
                    </View>
                  </View>
                  {/* Allergy warning in request card */}
                  {(p.patientId?.allergies?.length > 0 || p.patient?.allergies?.length > 0) && (
                    <View style={{ backgroundColor: '#dc2626', borderRadius: 10, padding: 8, marginBottom: 6, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ flex: 1, color: 'white', fontWeight: '800', fontSize: 11, textAlign: 'right', marginLeft: 6 }}>
                        ⚠️ حساسية: {(p.patientId?.allergies || p.patient?.allergies || []).join(' • ')}
                      </Text>
                      <Ionicons name="warning" size={16} color="white" />
                    </View>
                  )}
                  {p.medications?.length > 0 && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8, marginBottom: isPending ? 10 : 0 }}>
                      {p.medications?.map((m, mi) => (
                        <View key={mi} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{m.dose || m.dosage}{m.duration ? ` — ${m.duration}` : ''}</Text>
                          <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '700' }}>{m.medication || m.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {isPending && (
                    <TouchableOpacity
                      onPress={() => handleDispense(p._id)}
                      style={{ backgroundColor: '#dcfce7', borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#16a34a" style={{ marginLeft: 6 }} />
                      <Text style={{ color: '#166534', fontWeight: '800', fontSize: 14 }}>تأكيد الصرف</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {!requests.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد طلبات واردة</Text>}
          </>)}

          {activeTab === 'history' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b', textAlign: 'right', marginBottom: 10 }}>سجل الصرف</Text>
            {history.map((p, i) => {
              return (
                <View key={p._id || i} style={card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#dcfce7', flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="checkmark-circle" size={12} color="#16a34a" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#166534' }}>تم الصرف</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{p.medication || p.medications?.[0]?.name}</Text>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>المريض: {p.patientId?.fullName || p.patient?.fullName || '—'}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{p.updatedAt ? new Date(p.updatedAt).toLocaleString('ar-EG') : ''}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {!history.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا يوجد سجل للصرف</Text>}
          </>)}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
