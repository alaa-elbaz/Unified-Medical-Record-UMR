/**
 * (admin)/organizations.tsx — Admin org list with approve/reject + view document.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator,
  StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { confirm } from '../../components/ConfirmDialog';
import { openSecureDocument } from '../../components/DocumentViewer';
import { useTheme } from '../../context/ThemeContext';
import type { Organization } from '../../types/api';

// Backend exposes more fields than the canonical Organization. Admin list
// view also tracks status, sectorType (legacy), document paths, etc.
type AdminOrg = Organization & {
  status?: string;
  sectorType?: string;
  email?: string;
  healthRegNumber?: string;
  registrationDocPath?: string;
};

const TYPE_LABELS: Record<string, string> = {
  hospital: 'مستشفى', lab: 'مختبر', pharmacy: 'صيدلية',
};
const STATUS_LABELS: Record<string, { l: string; bg: string; t: string }> = {
  active:   { l: 'نشط',   bg: '#dcfce7', t: '#166534' },
  pending:  { l: 'معلق',  bg: '#fef9c3', t: '#854d0e' },
  rejected: { l: 'مرفوض', bg: '#fee2e2', t: '#991b1b' },
};

export default function AdminOrgsScreen() {
  const { isDark } = useTheme();
  const [orgs, setOrgs]         = useState<AdminOrg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery]       = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchAll = async () => {
    try {
      const { data } = await api.get('/admin/organizations');
      setOrgs(data?.data || data?.organizations || []);
    } catch {
      toast.error('فشل تحميل المنظمات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => {
    let list = orgs;
    if (typeFilter !== 'all') list = list.filter((o) => (o.type || o.sectorType) === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((o) =>
        (o.name || '').toLowerCase().includes(q) ||
        (o.email || '').toLowerCase().includes(q) ||
        (o.healthRegNumber || '').includes(q),
      );
    }
    return list;
  }, [orgs, query, typeFilter]);

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/admin/approve-organization/${id}`);
      toast.success('تمت الموافقة');
      setOrgs((prev) => prev.map((o) => o._id === id ? { ...o, status: 'active' } : o));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'حذف المنظمة', message: 'هذا الإجراء لا يمكن التراجع عنه.',
      destructive: true, confirmText: 'حذف نهائي',
    });
    if (!ok) return;
    try {
      await api.delete(`/admin/organization/${id}`);
      toast.success('تم الحذف');
      setOrgs((prev) => prev.filter((o) => o._id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل الحذف');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={{ backgroundColor: isDark ? '#020617' : '#0f172a', padding: 16, paddingTop: 14, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>إدارة المنظمات</Text>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>المنظمات ({orgs.length})</Text>
          </View>
        </View>

        <View style={{
          backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)', borderRadius: 14,
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
        }}>
          <Ionicons name="search" size={18} color={isDark ? '#cbd5e1' : '#94a3b8'} />
          <TextInput value={query} onChangeText={setQuery} placeholder="بحث بالاسم/البريد/رقم التسجيل"
            placeholderTextColor="#94a3b8" textAlign="right"
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: isDark ? '#e2e8f0' : '#0f172a' }} />
        </View>
      </View>

      <View style={{ paddingVertical: 10, paddingHorizontal: 12 }}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={[
            { key: 'all', label: 'الكل' },
            { key: 'hospital', label: 'مستشفيات' },
            { key: 'lab', label: 'مختبرات' },
            { key: 'pharmacy', label: 'صيدليات' },
          ]}
          keyExtractor={(f) => f.key}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const active = typeFilter === item.key;
            return (
              <TouchableOpacity onPress={() => setTypeFilter(item.key)} style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
                backgroundColor: active ? (isDark ? '#334155' : '#0f172a') : (isDark ? '#0f172a' : 'white'),
                borderWidth: 1, borderColor: active ? (isDark ? '#334155' : '#0f172a') : (isDark ? '#334155' : '#e2e8f0'),
              }}>
                <Text style={{ color: active ? 'white' : (isDark ? '#cbd5e1' : '#64748b'), fontWeight: '700', fontSize: 12 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={isDark ? '#f1f5f9' : '#0f172a'} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={isDark ? '#f1f5f9' : '#0f172a'} />
          }
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="business-outline" size={48} color={isDark ? '#475569' : '#cbd5e1'} />
              <Text style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: 12 }}>لا توجد نتائج</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const st = STATUS_LABELS[item.status] || STATUS_LABELS.pending;
            const docUrl = item.licenseDocument || item.commercialRegistry || item.idDocument || item.document;
            const t = item.type || item.sectorType;
            return (
              <View style={{ backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: st.bg }}>
                      <Text style={{ color: st.t, fontSize: 10, fontWeight: '700' }}>{st.l}</Text>
                    </View>
                    {t && (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                        <Text style={{ color: isDark ? '#cbd5e1' : '#475569', fontSize: 10, fontWeight: '700' }}>
                          {TYPE_LABELS[t] || t}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', fontSize: 14 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {Boolean(item.email) && <Text style={{ color: isDark ? '#cbd5e1' : '#64748b', fontSize: 11 }} numberOfLines={1}>{item.email}</Text>}
                    {item.healthRegNumber && (
                      <Text style={{ color: '#94a3b8', fontSize: 11 }}>رقم التسجيل: {item.healthRegNumber}</Text>
                    )}
                    {Boolean(item.city) && <Text style={{ color: '#94a3b8', fontSize: 11 }}>{item.city}</Text>}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {docUrl && (
                    <TouchableOpacity onPress={() => openSecureDocument(docUrl)}
                      style={{ flex: 1, backgroundColor: isDark ? '#082f49' : '#dbeafe', paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="document-attach" size={14} color={isDark ? '#7dd3fc' : '#1e40af'} />
                      <Text style={{ color: isDark ? '#7dd3fc' : '#1e40af', fontWeight: '700', fontSize: 12, marginRight: 4 }}>الترخيص</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'pending' && (
                    <TouchableOpacity onPress={() => handleApprove(item._id)}
                      style={{ flex: 1, backgroundColor: '#dcfce7', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>قبول</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(item._id)}
                    style={{ width: 40, backgroundColor: isDark ? '#7f1d1d' : '#fee2e2', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                    <Ionicons name="trash-outline" size={16} color={isDark ? '#fecaca' : '#dc2626'} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
