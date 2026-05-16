/**
 * (hospital)/add-department.tsx
 * POST /hospital/departments { name, description, bedCapacity }
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { toast } from '../../components/Toast';

export default function AddDepartmentScreen() {
  const [name, setName]                 = useState('');
  const [description, setDescription]   = useState('');
  const [bedCapacity, setBedCapacity]   = useState('');
  const [busy, setBusy]                 = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return toast.warn('اسم القسم مطلوب');
    setBusy(true);
    try {
      await api.post('/hospital/departments', {
        name: name.trim(),
        description: description.trim(),
        bedCapacity: parseInt(bedCapacity, 10) || 0,
      });
      toast.success('تم إضافة القسم');
      router.back();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الحفظ');
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
          <Text style={{ color: '#ddd6fe', fontSize: 11 }}>إضافة جديدة</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>قسم جديد</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <Field label="اسم القسم *">
            <TextInput value={name} onChangeText={setName} placeholder="مثال: قسم الباطنة"
              placeholderTextColor="#94a3b8" textAlign="right" style={F.input} />
          </Field>

          <Field label="الوصف">
            <TextInput value={description} onChangeText={setDescription} placeholder="وصف مختصر"
              placeholderTextColor="#94a3b8" textAlign="right" multiline style={[F.input, { minHeight: 80, textAlignVertical: 'top' }]} />
          </Field>

          <Field label="عدد الأسرّة">
            <TextInput value={bedCapacity} onChangeText={setBedCapacity} placeholder="0"
              placeholderTextColor="#94a3b8" textAlign="right" keyboardType="number-pad" style={F.input} />
          </Field>

          <TouchableOpacity onPress={handleSave} disabled={busy}
            style={{ backgroundColor: busy ? '#c4b5fd' : '#7c3aed', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}>
            {busy ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>حفظ القسم</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
      <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 8 }}>{label}</Text>
      {children}
    </View>
  );
}

const H = {
  header: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22, flexDirection: 'row' as const, alignItems: 'center' as const },
  btn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 },
};
const F = {
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
};
