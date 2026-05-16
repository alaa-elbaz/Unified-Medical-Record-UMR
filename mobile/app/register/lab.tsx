import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const SECTOR_TYPES = [{ label: 'خاص', value: 'Private' }, { label: 'حكومي', value: 'Public' }];

const si = { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'right' as const, color: '#1e293b', fontSize: 16 };
const sl = { fontSize: 11, fontWeight: '700' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, textAlign: 'right' as const };

export default function RegisterLab() {
  // sectorType is part of state — backend requires 'Private' or 'Public'
  // (was previously hardcoded to the literal string 'lab' which the
  // express-validator rejected with 400).
  const [form, setForm] = useState({ name: '', email: '', healthRegNumber: '', phoneNumber: '', address: '', city: '', doctorsCount: '', description: '', testTypes: '', sectorType: '' });
  const [isLoading, setIsLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.healthRegNumber || !form.phoneNumber || !form.address || !form.city || !form.sectorType) {
      Alert.alert('بيانات ناقصة', 'يرجى ملء جميع الحقول الإلزامية بما في ذلك نوع القطاع.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Alert.alert('بريد غير صالح', 'صيغة البريد الإلكتروني غير صحيحة.');
      return;
    }
    try {
      setIsLoading(true);
      const testTypes = form.testTypes ? form.testTypes.split(',').map(t => t.trim()).filter(Boolean) : [];
      await api.post('/auth/register/lab', { ...form, doctorsCount: Number(form.doctorsCount) || 0, testTypes });
      Alert.alert('تم التسجيل ✓', 'تم إرسال طلب التسجيل. سيتم مراجعته من قِبل الإدارة.', [{ text: 'حسناً', onPress: () => router.replace('/login') }]);
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'فشل التسجيل.');
    } finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" backgroundColor="#d97706" />
      <View style={{ backgroundColor: '#d97706', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 8 }}><Ionicons name="arrow-back" size={20} color="white" /></TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>تسجيل مختبر</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 16 }}><Text style={sl}>اسم المختبر *</Text><TextInput style={si} placeholder="مختبر..." placeholderTextColor="#94a3b8" value={form.name} onChangeText={set('name')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>البريد الإلكتروني *</Text><TextInput style={si} placeholder="lab@email.com" placeholderTextColor="#94a3b8" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>رقم التسجيل الصحي *</Text><TextInput style={si} placeholder="رقم التسجيل الصحي" placeholderTextColor="#94a3b8" value={form.healthRegNumber} onChangeText={set('healthRegNumber')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>رقم الهاتف *</Text><TextInput style={si} placeholder="0xxxxxxxxx" placeholderTextColor="#94a3b8" value={form.phoneNumber} onChangeText={set('phoneNumber')} keyboardType="phone-pad" textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>العنوان *</Text><TextInput style={si} placeholder="الشارع، الحي..." placeholderTextColor="#94a3b8" value={form.address} onChangeText={set('address')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>المدينة *</Text><TextInput style={si} placeholder="القاهرة..." placeholderTextColor="#94a3b8" value={form.city} onChangeText={set('city')} textAlign="right" /></View>

        <View style={{ marginBottom: 16 }}>
          <Text style={sl}>نوع القطاع *</Text>
          <View style={{ flexDirection: 'row' }}>
            {SECTOR_TYPES.map((s, i) => (
              <TouchableOpacity key={s.value} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 2, marginLeft: i === 0 ? 6 : 0, borderColor: form.sectorType === s.value ? '#d97706' : '#e2e8f0', backgroundColor: form.sectorType === s.value ? '#fef3c7' : 'white' }} onPress={() => set('sectorType')(s.value)}>
                <Text style={{ fontWeight: 'bold', color: form.sectorType === s.value ? '#d97706' : '#64748b' }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}><Text style={sl}>عدد الفنيين / الأطباء</Text><TextInput style={si} placeholder="0" placeholderTextColor="#94a3b8" value={form.doctorsCount} onChangeText={set('doctorsCount')} keyboardType="number-pad" textAlign="right" /></View>
        <View style={{ marginBottom: 4 }}><Text style={sl}>أنواع التحاليل (افصل بفاصلة)</Text><TextInput style={[si, { height: 80, textAlignVertical: 'top' }]} placeholder="CBC، HbA1c، TSH، فيروس كبدي..." placeholderTextColor="#94a3b8" value={form.testTypes} onChangeText={set('testTypes')} multiline textAlign="right" /></View>
        <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginBottom: 16 }}>مثال: تحليل دم شامل، هرمونات، أشعة سينية</Text>
        <View style={{ marginBottom: 16 }}><Text style={sl}>الوصف</Text><TextInput style={[si, { height: 80, textAlignVertical: 'top' }]} placeholder="وصف مختصر عن المختبر وخدماته..." placeholderTextColor="#94a3b8" value={form.description} onChangeText={set('description')} multiline textAlign="right" /></View>
        <TouchableOpacity style={{ backgroundColor: isLoading ? '#fbbf24' : '#d97706', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 40 }} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <View style={{ flexDirection: 'row', alignItems: 'center' }}><ActivityIndicator color="#fff" size="small" /><Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginRight: 8 }}>جاري التسجيل...</Text></View> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>إرسال طلب التسجيل</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
