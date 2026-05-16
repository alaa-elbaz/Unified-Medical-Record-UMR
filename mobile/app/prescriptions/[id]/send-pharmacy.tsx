/**
 * prescriptions/[id]/send-pharmacy.tsx
 * Lists active pharmacies, lets the patient pick one, sends prescription request.
 *
 * GET /prescriptions/pharmacies/active
 * PUT /prescriptions/:id/request-pharmacy { pharmacyId }
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';
import { toast } from '../../../components/Toast';

export default function SendToPharmacyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/prescriptions/pharmacies/active');
        setPharmacies(data?.data || []);
      } catch {
        toast.error('تعذر تحميل قائمة الصيدليات');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSend = async () => {
    if (!selected) return toast.warn('اختر صيدلية أولاً');
    setSubmitting(true);
    try {
      await api.put(`/prescriptions/${id}/request-pharmacy`, { pharmacyId: selected });
      toast.success('تم إرسال الروشتة للصيدلية');
      router.back();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الإرسال');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#dc2626" />

      <View style={[S.header, { backgroundColor: '#dc2626' }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#fecaca', fontSize: 11, fontWeight: '600' }}>إرسال روشتة</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>اختر صيدلية</Text>
        </View>
        <View style={S.headerIcon}><Ionicons name="bag-handle" size={20} color="white" /></View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      ) : (
        <FlatList
          data={pharmacies}
          keyExtractor={(p) => p._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="bag-handle-outline" size={56} color="#cbd5e1" />
              <Text style={{ color: '#64748b', marginTop: 12 }}>لا توجد صيدليات نشطة</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const active = selected === item._id;
            return (
              <TouchableOpacity
                onPress={() => setSelected(item._id)}
                style={{
                  backgroundColor: active ? '#fee2e2' : 'white',
                  borderColor: active ? '#dc2626' : '#f1f5f9',
                  borderWidth: active ? 2 : 1,
                  borderRadius: 16, padding: 14, marginBottom: 10,
                  flexDirection: 'row', alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 24, height: 24, borderRadius: 12, borderWidth: 2,
                  borderColor: active ? '#dc2626' : '#cbd5e1',
                  backgroundColor: active ? '#dc2626' : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
                  <Text style={{ fontWeight: '900', color: '#1e293b', fontSize: 15 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.address && (
                    <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {item.address}
                    </Text>
                  )}
                  {item.phoneNumber && (
                    <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 1 }}>
                      {item.phoneNumber}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {!loading && pharmacies.length > 0 && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!selected || submitting}
            style={{
              backgroundColor: !selected || submitting ? '#fca5a5' : '#dc2626',
              borderRadius: 16, paddingVertical: 16, alignItems: 'center', elevation: 4,
            }}
          >
            {submitting ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>إرسال الروشتة</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const S = {
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22, flexDirection: 'row' as const, alignItems: 'center' as const },
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
};
