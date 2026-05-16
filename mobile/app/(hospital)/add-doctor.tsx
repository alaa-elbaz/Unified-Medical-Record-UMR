/**
 * (hospital)/add-doctor.tsx
 * POST /hospital/doctors/add
 * Body: { fullName, nationalId, phoneNumber, gender, specialty, department, syndicateNumber }
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { toast } from '../../components/Toast';

export default function AddDoctorScreen() {
  const [fullName, setFullName]   = useState('');
  const [nationalId, setNid]      = useState('');
  const [phone, setPhone]         = useState('');
  const [gender, setGender]       = useState<'male' | 'female' | ''>('');
  const [specialty, setSpec]      = useState('');
  const [department, setDept]     = useState('');
  const [syndicate, setSyn]       = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    api.get('/hospital/departments').then(r => setDepartments(r.data?.data || [])).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!fullName.trim() || !nationalId.trim() || !specialty.trim() || !gender) {
      return toast.warn('املأ الحقول المطلوبة');
    }
    if (nationalId.length !== 14) return toast.warn('الرقم القومي يجب أن يكون 14 رقم');
    setBusy(true);
    try {
      const { data } = await api.post('/hospital/doctors/add', {
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        phoneNumber: phone.trim(),
        gender,
        specialty: specialty.trim(),
        department: department.trim(),
        syndicateNumber: syndicate.trim(),
      });
      const email = data?.data?.email;
      Alert.alert('تم الإضافة ✓',
        email ? `تم إنشاء حساب الطبيب\nالبريد: ${email}` : 'تم إضافة الطبيب بنجاح',
        [{ text: 'حسناً', onPress: () => router.back() }],
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الإضافة');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
      <View style={H.header}>
        <TouchableOpacity onPress={() => router.back()} style={H.btn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#ddd6fe', fontSize: 11 }}>إضافة طبيب</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>طبيب جديد</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Card title="الاسم الكامل *">
            <TextInput value={fullName} onChangeText={setFullName} placeholder="د. محمد أحمد"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input} />
          </Card>

          <Card title="الرقم القومي * (14 رقم)">
            <TextInput value={nationalId} onChangeText={setNid} placeholder="29501234567890"
              placeholderTextColor="#94a3b8" textAlign="right" keyboardType="number-pad" maxLength={14} style={S.input} />
          </Card>

          <Card title="رقم الهاتف">
            <TextInput value={phone} onChangeText={setPhone} placeholder="01012345678"
              placeholderTextColor="#94a3b8" textAlign="right" keyboardType="phone-pad" style={S.input} />
          </Card>

          <Card title="الجنس *">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { key: 'male', label: 'ذكر' },
                { key: 'female', label: 'أنثى' },
              ].map((g) => (
                <TouchableOpacity key={g.key} onPress={() => setGender(g.key as any)} style={{
                  flex: 1, paddingVertical: 12, borderRadius: 12,
                  backgroundColor: gender === g.key ? '#7c3aed' : '#f8fafc',
                  borderWidth: 1, borderColor: gender === g.key ? '#7c3aed' : '#e2e8f0',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: gender === g.key ? 'white' : '#64748b', fontWeight: '700' }}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card title="التخصص *">
            <TextInput value={specialty} onChangeText={setSpec} placeholder="باطنة، جراحة..."
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input} />
          </Card>

          {departments.length > 0 && (
            <Card title="القسم">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {departments.map((d: any) => {
                  const active = department === d.name;
                  return (
                    <TouchableOpacity key={d._id} onPress={() => setDept(d.name)} style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: active ? '#7c3aed' : '#f8fafc',
                      borderWidth: 1, borderColor: active ? '#7c3aed' : '#e2e8f0',
                    }}>
                      <Text style={{ color: active ? 'white' : '#64748b', fontWeight: '700', fontSize: 12 }}>
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Card>
          )}

          <Card title="رقم النقابة">
            <TextInput value={syndicate} onChangeText={setSyn} placeholder="رقم القيد"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input} />
          </Card>

          <TouchableOpacity onPress={handleSave} disabled={busy}
            style={{ backgroundColor: busy ? '#c4b5fd' : '#7c3aed', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}>
            {busy ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>إضافة الطبيب</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
}

const H = {
  header: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22, flexDirection: 'row' as const, alignItems: 'center' as const },
  btn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 },
};
const S = {
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
};
