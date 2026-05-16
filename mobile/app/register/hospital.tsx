import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const si = { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'right' as const, color: '#1e293b', fontSize: 16 };
const sl = { fontSize: 11, fontWeight: '700' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, textAlign: 'right' as const };

const SECTOR_TYPES = [{ label: 'خاص', value: 'Private' }, { label: 'حكومي', value: 'Public' }];

export default function RegisterHospital() {
  const [form, setForm] = useState({ name: '', email: '', healthRegNumber: '', phoneNumber: '', address: '', city: '', bedCount: '', departmentCount: '', roomsCount: '', doctorsCount: '', description: '', sectorType: '' });
  const [isLoading, setIsLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.healthRegNumber || !form.phoneNumber || !form.address || !form.city || !form.sectorType) {
      Alert.alert('بيانات ناقصة', 'يرجى ملء الحقول الإلزامية (بما في ذلك نوع القطاع).'); return;
    }
    try {
      setIsLoading(true);
      await api.post('/auth/register/hospital', { ...form, bedCount: Number(form.bedCount) || 0, departmentCount: Number(form.departmentCount) || 0, roomsCount: Number(form.roomsCount) || 0, doctorsCount: Number(form.doctorsCount) || 0 });
      Alert.alert('تم التسجيل ✓', 'تم إرسال طلب التسجيل. سيتم مراجعته من قِبل الإدارة.', [{ text: 'حسناً', onPress: () => router.replace('/login') }]);
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'فشل التسجيل.');
    } finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
      <View style={{ backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 8 }}><Ionicons name="arrow-back" size={20} color="white" /></TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>تسجيل مستشفى</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 16 }}><Text style={sl}>اسم المستشفى *</Text><TextInput style={si} placeholder="مستشفى..." placeholderTextColor="#94a3b8" value={form.name} onChangeText={set('name')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>البريد الإلكتروني *</Text><TextInput style={si} placeholder="hospital@email.com" placeholderTextColor="#94a3b8" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>رقم التسجيل الصحي *</Text><TextInput style={si} placeholder="رقم التسجيل الصحي" placeholderTextColor="#94a3b8" value={form.healthRegNumber} onChangeText={set('healthRegNumber')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>رقم الهاتف *</Text><TextInput style={si} placeholder="0xxxxxxxxx" placeholderTextColor="#94a3b8" value={form.phoneNumber} onChangeText={set('phoneNumber')} keyboardType="phone-pad" textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>العنوان *</Text><TextInput style={si} placeholder="الشارع، الحي..." placeholderTextColor="#94a3b8" value={form.address} onChangeText={set('address')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>المدينة *</Text><TextInput style={si} placeholder="القاهرة، الإسكندرية..." placeholderTextColor="#94a3b8" value={form.city} onChangeText={set('city')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}>
          <Text style={sl}>نوع القطاع *</Text>
          <View style={{ flexDirection: 'row' }}>
            {SECTOR_TYPES.map((s, i) => (
              <TouchableOpacity key={s.value} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 2, marginLeft: i === 0 ? 6 : 0, borderColor: form.sectorType === s.value ? '#7c3aed' : '#e2e8f0', backgroundColor: form.sectorType === s.value ? '#ede9fe' : 'white' }} onPress={() => set('sectorType')(s.value)}>
                <Text style={{ fontWeight: 'bold', color: form.sectorType === s.value ? '#7c3aed' : '#64748b' }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <View style={{ flex: 1, marginLeft: 8 }}><Text style={sl}>عدد الأسرّة</Text><TextInput style={si} placeholder="0" placeholderTextColor="#94a3b8" value={form.bedCount} onChangeText={set('bedCount')} keyboardType="number-pad" textAlign="right" /></View>
          <View style={{ flex: 1 }}><Text style={sl}>عدد الأقسام</Text><TextInput style={si} placeholder="0" placeholderTextColor="#94a3b8" value={form.departmentCount} onChangeText={set('departmentCount')} keyboardType="number-pad" textAlign="right" /></View>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <View style={{ flex: 1, marginLeft: 8 }}><Text style={sl}>عدد الغرف</Text><TextInput style={si} placeholder="0" placeholderTextColor="#94a3b8" value={form.roomsCount} onChangeText={set('roomsCount')} keyboardType="number-pad" textAlign="right" /></View>
          <View style={{ flex: 1 }}><Text style={sl}>عدد الأطباء</Text><TextInput style={si} placeholder="0" placeholderTextColor="#94a3b8" value={form.doctorsCount} onChangeText={set('doctorsCount')} keyboardType="number-pad" textAlign="right" /></View>
        </View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>الوصف</Text><TextInput style={[si, { height: 90, textAlignVertical: 'top' }]} placeholder="وصف مختصر عن المستشفى..." placeholderTextColor="#94a3b8" value={form.description} onChangeText={set('description')} multiline textAlign="right" /></View>
        <TouchableOpacity style={{ backgroundColor: isLoading ? '#a78bfa' : '#7c3aed', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 40 }} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <View style={{ flexDirection: 'row', alignItems: 'center' }}><ActivityIndicator color="#fff" size="small" /><Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginRight: 8 }}>جاري التسجيل...</Text></View> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>إرسال طلب التسجيل</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
