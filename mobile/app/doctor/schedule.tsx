/**
 * doctor/schedule.tsx — Doctor sets working days, hours, and slot duration.
 * PUT /auth/profile { workingDays: ['Monday',...], workingHours: { start, end }, slotDuration: 10 }
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/Toast';

const DAYS_AR: { key: string; label: string }[] = [
  { key: 'Saturday',  label: 'السبت' },
  { key: 'Sunday',    label: 'الأحد' },
  { key: 'Monday',    label: 'الإثنين' },
  { key: 'Tuesday',   label: 'الثلاثاء' },
  { key: 'Wednesday', label: 'الأربعاء' },
  { key: 'Thursday',  label: 'الخميس' },
  { key: 'Friday',    label: 'الجمعة' },
];

const SLOT_DURATIONS = [5, 10, 15, 20, 30, 45, 60];

export default function DoctorScheduleScreen() {
  const { user, refreshUserData } = useAuth();

  const [workingDays, setWorkingDays] = useState<string[]>(
    (user as any)?.workingDays?.length ? (user as any).workingDays : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  );
  const parseTime = (t: string) => { const [h, m] = t.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const fmtTimeAr = (d: Date) => d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

  const [startDate, setStartDate] = useState(parseTime((user as any)?.workingHours?.start || '09:00'));
  const [endDate, setEndDate]     = useState(parseTime((user as any)?.workingHours?.end || '17:00'));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);
  const [slotDuration, setSlot] = useState((user as any)?.slotDuration || 15);
  const [saving, setSaving] = useState(false);

  const toggleDay = (key: string) => {
    setWorkingDays((prev) => prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    if (workingDays.length === 0) return toast.warn('اختر يوم عمل واحد على الأقل');
    const start = fmtTime(startDate);
    const end = fmtTime(endDate);
    setSaving(true);
    try {
      await api.put('/auth/profile', {
        workingDays,
        workingHours: { start, end },
        slotDuration,
      });
      await refreshUserData();
      toast.success('تم حفظ الجدول');
      router.back();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0d9488" />

      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#ccfbf1', fontSize: 11 }}>إعدادات</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>جدول العمل</Text>
        </View>
        <View style={S.headerIcon}><Ionicons name="calendar" size={20} color="white" /></View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

          {/* Working days */}
          <View style={S.card}>
            <Text style={S.label}>أيام العمل</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DAYS_AR.map((d) => {
                const active = workingDays.includes(d.key);
                return (
                  <TouchableOpacity key={d.key} onPress={() => toggleDay(d.key)} style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: active ? '#0d9488' : '#f8fafc',
                    borderWidth: 1, borderColor: active ? '#0d9488' : '#e2e8f0',
                  }}>
                    <Text style={{ color: active ? 'white' : '#64748b', fontWeight: '700', fontSize: 13 }}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Hours */}
          <View style={S.card}>
            <Text style={S.label}>ساعات العمل</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, textAlign: 'right' }}>إلى</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={S.timeBtn} activeOpacity={0.7}>
                  <Ionicons name="time-outline" size={18} color="#0d9488" />
                  <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900', color: '#1e293b' }}>
                    {fmtTimeAr(endDate)}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker value={endDate} mode="time" is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_e: DateTimePickerEvent, d?: Date) => { setShowEndPicker(Platform.OS === 'ios'); if (d) setEndDate(d); }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4, textAlign: 'right' }}>من</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={S.timeBtn} activeOpacity={0.7}>
                  <Ionicons name="time-outline" size={18} color="#0d9488" />
                  <Text style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900', color: '#1e293b' }}>
                    {fmtTimeAr(startDate)}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker value={startDate} mode="time" is24Hour
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_e: DateTimePickerEvent, d?: Date) => { setShowStartPicker(Platform.OS === 'ios'); if (d) setStartDate(d); }} />
                )}
              </View>
            </View>
          </View>

          {/* Slot duration */}
          <View style={S.card}>
            <Text style={S.label}>مدة الموعد (دقائق)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SLOT_DURATIONS.map((s) => {
                const active = slotDuration === s;
                return (
                  <TouchableOpacity key={s} onPress={() => setSlot(s)} style={{
                    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: active ? '#0d9488' : '#f8fafc',
                    borderWidth: 1, borderColor: active ? '#0d9488' : '#e2e8f0',
                  }}>
                    <Text style={{ color: active ? 'white' : '#64748b', fontWeight: '900', fontSize: 14 }}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity onPress={handleSave} disabled={saving} style={[S.submitBtn, {
            backgroundColor: saving ? '#5eead4' : '#0d9488',
          }]}>
            {saving ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>حفظ الجدول</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = {
  header: { backgroundColor: '#0d9488', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22, flexDirection: 'row' as const, alignItems: 'center' as const },
  headerBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  label: { color: '#475569', fontSize: 13, fontWeight: '700' as const, textAlign: 'right' as const, marginBottom: 12 },
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, fontWeight: '900' as const, color: '#1e293b',
  },
  timeBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8, elevation: 2 },
};
