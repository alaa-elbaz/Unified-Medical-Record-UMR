/**
 * patients.tsx — Doctor's "My Patients" tab.
 * Lists patients via GET /patients/my-patients with search by name / national ID / phone.
 * Tapping a patient opens /patient/[id].
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Alert } from 'react-native';
import type { Patient } from '../../types/api';

export default function DoctorPatientsScreen() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery]       = useState('');

  const fetchPatients = async () => {
    try {
      const { data } = await api.get('/patients/my-patients');
      setPatients(data?.data || data?.patients || []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    const q = query.trim().toLowerCase();
    return patients.filter((p) =>
      (p.fullName || '').toLowerCase().includes(q) ||
      (p.nationalId || '').includes(q) ||
      (p.phoneNumber || '').includes(q),
    );
  }, [patients, query]);

  // Only doctors should be here
  if (user?.role !== 'doctor') {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="lock-closed-outline" size={48} color="#cbd5e1" />
        <Text style={{ color: '#64748b', marginTop: 12 }}>هذه الشاشة متاحة للأطباء فقط</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      <View style={{ backgroundColor: '#0284c7', padding: 16, paddingTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/qr')}
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 }}>
            <Ionicons name="scan" size={18} color="white" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#bae6fd', fontSize: 11, fontWeight: '600' }}>قائمة المرضى</Text>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>مرضاي ({patients.length})</Text>
          </View>
        </View>

        <View style={{
          backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4,
        }}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            value={query} onChangeText={setQuery}
            placeholder="بحث بالاسم أو الرقم القومي أو الهاتف"
            placeholderTextColor="#94a3b8"
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 }}
            textAlign="right"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPatients(); }}
              tintColor="#0284c7" />
          }
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="people-outline" size={56} color="#cbd5e1" />
              <Text style={{ color: '#64748b', marginTop: 12, fontWeight: '600' }}>
                {query ? 'لا توجد نتائج' : 'لا يوجد مرضى مرتبطين بحسابك'}
              </Text>
              <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 12 }}>
                امسح كود QR لمريض جديد لإضافته
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-row gap-3 items-center">
                  <View className="w-12 h-12 rounded-2xl bg-sky-50 items-center justify-center border border-sky-100">
                    <Text className="text-sky-600 text-xl font-black">
                      {(item.fullName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-slate-800 font-bold text-base" numberOfLines={1}>
                      {item.fullName || 'بدون اسم'}
                    </Text>
                    {item.nationalId && (
                      <Text className="text-slate-500 text-xs mt-0.5">
                        {item.nationalId}
                      </Text>
                    )}
                    <View className="flex-row gap-2 mt-1">
                      {item.bloodType && item.bloodType !== 'unknown' && (
                        <View className="bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                          <Text className="text-red-700 text-[10px] font-bold">{item.bloodType}</Text>
                        </View>
                      )}
                      {item.allergies?.length > 0 && (
                        <View className="bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                          <Text className="text-amber-700 text-[10px] font-bold">
                            {item.allergies.length} حساسية
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <TouchableOpacity onPress={() => router.push(`/patient/${item._id}` as any)}>
                  <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

              {/* Quick Actions */}
              <View className="flex-row gap-2 pt-3 border-t border-slate-50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-9 border-indigo-200 text-indigo-700" 
                  onPress={() => router.push(`/patient/${item._id}` as any)}
                >
                  <Ionicons name="folder-open" size={16} color="#4338ca" className="mr-1" /> سجلاتي
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 w-14 border-purple-200 text-purple-700 items-center justify-center" 
                  onPress={() => Alert.alert('تحليل ذكي', 'سيتم توفير أداة التحليل الذكي قريباً على تطبيق الهاتف.')}
                >
                  <Ionicons name="sparkles" size={16} color="#7e22ce" />
                </Button>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
