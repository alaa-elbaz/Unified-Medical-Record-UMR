/**
 * appointment/book.tsx — Patient: Book a New Appointment
 * Called from: (tabs)/appointments.tsx lines 34 & 119 via router.push('/appointment/book')
 *
 * API:
 *   GET  /booking/providers  → { doctors:[{_id,fullName,specialty}], hospitals:[{_id,name,sectorType}] }
 *   POST /appointments        → { doctorId?, hospitalId?, date:"YYYY-MM-DD", time:"HH:MM", type:string }
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import type { Doctor, Organization } from '../../types/api';

type ProviderKind = 'doctor' | 'hospital';

// /booking/providers returns a flat list with a `providerType` discriminator.
type Provider = (Doctor | Organization) & {
  providerType: 'doctor' | 'hospital' | 'lab';
  type?: 'hospital' | 'lab' | 'pharmacy';
  specialty?: string;
};

const VISIT_TYPES = ['كشف جديد', 'متابعة', 'استشارة', 'تحليل', 'طوارئ'];

export default function BookAppointmentScreen() {
  const [doctors,      setDoctors]      = useState<Provider[]>([]);
  const [hospitals,    setHospitals]    = useState<Provider[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search,       setSearch]       = useState('');

  const [providerKind, setProviderKind] = useState<ProviderKind>('doctor');
  const [selectedId,   setSelectedId]   = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('كشف جديد');

  // Load providers via /booking/providers
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/booking/providers');
        // Backend returns flat array at data.data with providerType field
        // OR separate data.doctors / data.hospitals arrays
        const allProviders: Provider[] = data.data || [];
        if (Array.isArray(allProviders) && allProviders.length > 0 && allProviders[0]?.providerType) {
          // Flat array from backend — split by providerType
          setDoctors(allProviders.filter((p) => p.providerType === 'doctor'));
          setHospitals(allProviders.filter((p) => p.providerType === 'hospital' || p.providerType === 'lab'));
        } else {
          // Fallback: try legacy separate arrays
          setDoctors(data.doctors     || data.data?.doctors   || []);
          setHospitals(data.hospitals || data.data?.hospitals || []);
        }
      } catch (err: any) {
        // Fallback: fetch doctors and organizations separately
        try {
          const [docRes, orgRes] = await Promise.allSettled([
            api.get('/admin/doctors'),
            api.get('/admin/organizations'),
          ]);
          if (docRes.status === 'fulfilled') {
            setDoctors(docRes.value.data.data || []);
          }
          if (orgRes.status === 'fulfilled') {
            const orgs = orgRes.value.data.data || [];
            setHospitals(orgs.filter((o: Organization) => o.type === 'hospital' || o.type === 'lab') as Provider[]);
          }
        } catch {
          Alert.alert('خطأ', 'تعذر جلب قائمة مقدمي الخدمة');
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const providers = providerKind === 'doctor' ? doctors : hospitals;
  const filtered  = search.trim()
    ? providers.filter((p) =>
        (p.fullName || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.specialty || '').toLowerCase().includes(search.toLowerCase()))
    : providers;

  const handleBook = async () => {
    if (!selectedId)    { Alert.alert('خطأ', 'يرجى اختيار مقدم الخدمة'); return; }
    if (!date.trim())   { Alert.alert('خطأ', 'يرجى اختيار اليوم');       return; }
    if (!time.trim())   { Alert.alert('خطأ', 'يرجى اختيار الوقت');       return; }

    // Date and time are set by visual pickers, so format is guaranteed.
    // These checks are safety nets only.

    let mappedType = 'New Check-up';
    if (type === 'متابعة') mappedType = 'Follow-up';
    else if (type === 'استشارة') mappedType = 'Consultation';

    try {
      setIsSubmitting(true);
      await api.post('/appointments', {
        ...(providerKind === 'doctor'   ? { doctorId:        selectedId } : {}),
        ...(providerKind !== 'doctor'   ? { organizationId:  selectedId } : {}),
        date: date.trim(),
        time: time.trim(),
        type,
        appointmentType: mappedType,
        reason: `حجز ${type}` // Default reason as required by backend
      });
      Alert.alert('تم الحجز ✓', 'تم إرسال طلب الحجز. انتظر تأكيداً من الطرف الآخر.', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'تعذر إتمام الحجز.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      {/* Header */}
      <View style={{
        backgroundColor: '#0284c7', paddingHorizontal: 16,
        paddingTop: 14, paddingBottom: 22,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#bae6fd', fontSize: 11, fontWeight: '600' }}>المريض</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>حجز موعد جديد</Text>
        </View>
        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="calendar" size={20} color="white" />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Provider type toggle */}
        <View style={{
          flexDirection: 'row', backgroundColor: '#e2e8f0',
          borderRadius: 16, padding: 4, marginBottom: 16,
        }}>
          {(['doctor', 'hospital'] as ProviderKind[]).map((k) => (
            <TouchableOpacity
              key={k}
              onPress={() => { setProviderKind(k); setSelectedId(''); setSearch(''); }}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
                backgroundColor: providerKind === k ? 'white' : 'transparent',
                elevation: providerKind === k ? 2 : 0,
              }}
              activeOpacity={0.8}
            >
              <Text style={{
                fontWeight: '700', fontSize: 14,
                color: providerKind === k ? '#0284c7' : '#64748b',
              }}>
                {k === 'doctor' ? 'طبيب' : 'مستشفى / مؤسسة'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
          borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14,
          paddingHorizontal: 14, marginBottom: 12,
        }}>
          <Ionicons name="search" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={providerKind === 'doctor' ? 'ابحث عن طبيب...' : 'ابحث عن مستشفى...'}
            placeholderTextColor="#94a3b8"
            textAlign="right"
            style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' }}
          />
        </View>

        {/* Provider list */}
        <View style={{
          backgroundColor: 'white', borderRadius: 20, marginBottom: 16,
          borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden',
        }}>
          {isLoading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <ActivityIndicator color="#0284c7" />
              <Text style={{ color: '#64748b', marginTop: 8, fontSize: 13 }}>جاري التحميل...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Ionicons name="people-outline" size={40} color="#cbd5e1" />
              <Text style={{ color: '#94a3b8', marginTop: 8 }}>لا يوجد نتائج</Text>
            </View>
          ) : (
            filtered.slice(0, 20).map((p, idx: number) => {
              const isSelected = selectedId === p._id;
              const label = p.fullName ? `د. ${p.fullName}` : (p.name || '');
              const sub   = p.specialty || p.sectorType || p.city || '';
              return (
                <TouchableOpacity
                  key={p._id}
                  onPress={() => setSelectedId(p._id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 14,
                    backgroundColor: isSelected ? '#f0f9ff' : 'white',
                    borderBottomWidth: idx < Math.min(filtered.length, 20) - 1 ? 1 : 0,
                    borderBottomColor: '#f1f5f9',
                  }}
                  activeOpacity={0.7}
                >
                  {isSelected
                    ? <Ionicons name="checkmark-circle" size={22} color="#0284c7" style={{ marginLeft: 12 }} />
                    : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', marginLeft: 12 }} />
                  }
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={{
                      fontSize: 15, color: isSelected ? '#0284c7' : '#1e293b',
                      fontWeight: isSelected ? '800' : '600',
                    }}>
                      {label}
                    </Text>
                    {!!sub && (
                      <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{sub}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Visit type */}
        <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 8 }}>
          نوع الزيارة
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {VISIT_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: type === t ? '#0284c7' : 'white',
                  borderWidth: 1, borderColor: type === t ? '#0284c7' : '#e2e8f0',
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, color: type === t ? 'white' : '#64748b' }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Date + Time */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}></Text>
            <Text style={{ color: '#1e293b', fontSize: 15, fontWeight: '800' }}>اختر اليوم</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 2 }}>
              {Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                const isSelected = date === dateStr;
                const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
                
                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => setDate(dateStr)}
                    style={{
                      width: 64, height: 80, borderRadius: 16,
                      backgroundColor: isSelected ? '#0284c7' : 'white',
                      borderWidth: 1, borderColor: isSelected ? '#0284c7' : '#e2e8f0',
                      alignItems: 'center', justifyContent: 'center',
                      elevation: isSelected ? 2 : 0,
                    }}
                  >
                    <Text style={{ color: isSelected ? '#bae6fd' : '#64748b', fontSize: 12, marginBottom: 4, fontWeight: '700' }}>{dayName}</Text>
                    <Text style={{ color: isSelected ? 'white' : '#1e293b', fontSize: 18, fontWeight: '900' }}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}></Text>
            <Text style={{ color: '#1e293b', fontSize: 15, fontWeight: '800' }}>اختر الوقت</Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
            {[
              '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
              '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
              '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
              '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
            ].map((slot) => {
              const isSelected = time === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setTime(slot)}
                  style={{
                    width: '22%', paddingVertical: 12, borderRadius: 12,
                    backgroundColor: isSelected ? '#0284c7' : 'white',
                    borderWidth: 1, borderColor: isSelected ? '#0284c7' : '#e2e8f0',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: isSelected ? 'white' : '#1e293b', fontWeight: '800', fontSize: 12 }}>
                    {slot.split(' ')[0]}
                  </Text>
                  <Text style={{ color: isSelected ? '#bae6fd' : '#64748b', fontSize: 10, marginTop: 2, fontWeight: '700' }}>
                    {slot.split(' ')[1] === 'AM' ? 'ص' : 'م'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={{
            backgroundColor: isSubmitting ? '#93c5fd' : '#0284c7',
            borderRadius: 16, paddingVertical: 16,
            alignItems: 'center', elevation: 2,
          }}
          onPress={handleBook}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="white" size="small" />
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginLeft: 10 }}>
                جاري الإرسال...
              </Text>
            </View>
          ) : (
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>تأكيد الحجز</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
