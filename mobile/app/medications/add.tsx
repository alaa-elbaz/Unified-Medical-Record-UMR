/**
 * medications/add.tsx — Patient adds an own medication with AI drug-interaction check.
 * - POST /ai/check-interactions before save (warn on Danger/Warning)
 * - POST /prescriptions on confirm
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePatientData } from '../../hooks/usePatientData';
import { toast } from '../../components/Toast';

export default function AddMedicationScreen() {
  const { user } = useAuth();
  const { prescriptions } = usePatientData();
  const [medication, setMedication] = useState('');
  const [dose, setDose]             = useState('');
  const [duration, setDuration]     = useState('');
  const [isChronic, setIsChronic]   = useState(false);
  const [checking, setChecking]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [interactionResult, setInteractionResult] = useState<{ status: string; message: string } | null>(null);

  const runInteractionCheck = async (): Promise<boolean> => {
    if (!medication.trim()) return true;
    setChecking(true);
    try {
      const { data } = await api.post('/ai/check-interactions', {
        newDrug: medication.trim(),
        currentDrugs: prescriptions.map((p: any) => p.medication || p.medications?.[0]?.name).filter(Boolean),
        allergies: user?.allergies || [],
      });
      const r = data?.data;
      setInteractionResult(r);

      if (r?.status === 'Safe') return true;

      // Warning or Danger — confirm with user
      return await new Promise<boolean>((resolve) => {
        Alert.alert(
          r?.status === 'Danger' ? '⚠️ تحذير خطر' : '⚠️ تنبيه تفاعل',
          r?.message || 'تم اكتشاف احتمال تفاعل دوائي.',
          [
            { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
            { text: 'إضافة على مسؤوليتي', style: 'destructive', onPress: () => resolve(true) },
          ],
        );
      });
    } catch {
      // AI unavailable — proceed without blocking
      return true;
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!medication.trim() || !dose.trim() || !duration.trim()) {
      toast.warn('املأ كل الحقول المطلوبة');
      return;
    }
    const ok = await runInteractionCheck();
    if (!ok) return;

    setSubmitting(true);
    try {
      await api.post('/prescriptions', {
        medication: medication.trim(),
        dose: dose.trim(),
        duration: duration.trim(),
        isChronic,
      });
      toast.success('تم إضافة الدواء');
      router.back();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الحفظ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />

      <View style={[S.header, { backgroundColor: '#7c3aed' }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#ddd6fe', fontSize: 11, fontWeight: '600' }}>إضافة دواء</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>دواء جديد</Text>
        </View>
        <View style={S.headerIcon}><Ionicons name="medkit" size={20} color="white" /></View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

          <View style={S.card}>
            <Text style={S.label}>اسم الدواء *</Text>
            <TextInput
              value={medication} onChangeText={setMedication}
              placeholder="مثال: بنادول، أوجمنتين"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input}
            />
          </View>

          <View style={S.card}>
            <Text style={S.label}>الجرعة *</Text>
            <TextInput
              value={dose} onChangeText={setDose}
              placeholder="مثال: 500 ملجم مرتين يوميًا"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input}
            />
          </View>

          <View style={S.card}>
            <Text style={S.label}>المدة *</Text>
            <TextInput
              value={duration} onChangeText={setDuration}
              placeholder="مثال: 7 أيام"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input}
            />
          </View>

          <TouchableOpacity onPress={() => setIsChronic(!isChronic)} style={[S.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{
              width: 26, height: 26, borderRadius: 8, borderWidth: 2,
              borderColor: isChronic ? '#7c3aed' : '#cbd5e1',
              backgroundColor: isChronic ? '#7c3aed' : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {isChronic && <Ionicons name="checkmark" size={18} color="white" />}
            </View>
            <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 14 }}>دواء مزمن (طويل المدى)</Text>
          </TouchableOpacity>

          {interactionResult && (
            <View style={[S.card, {
              backgroundColor: interactionResult.status === 'Safe' ? '#dcfce7' :
                               interactionResult.status === 'Warning' ? '#fef3c7' : '#fee2e2',
              borderColor: interactionResult.status === 'Safe' ? '#86efac' :
                           interactionResult.status === 'Warning' ? '#fde68a' : '#fca5a5',
            }]}>
              <Text style={{ fontWeight: '900', color: '#1e293b', textAlign: 'right', marginBottom: 4 }}>
                نتيجة فحص التفاعلات: {interactionResult.status}
              </Text>
              <Text style={{ color: '#475569', textAlign: 'right' }}>{interactionResult.message}</Text>
            </View>
          )}

          <TouchableOpacity onPress={handleSubmit} disabled={submitting || checking} style={[S.submitBtn, {
            backgroundColor: (submitting || checking) ? '#c4b5fd' : '#7c3aed',
          }]}>
            {(submitting || checking) ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
                  فحص التفاعلات وحفظ
                </Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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
  card: { backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  label: { color: '#475569', fontSize: 13, fontWeight: '700' as const, textAlign: 'right' as const, marginBottom: 8 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b',
  },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8, elevation: 2 },
};
