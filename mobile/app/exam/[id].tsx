/**
 * exam/[id].tsx — Doctor Exam Mode (Enhanced)
 * Matches web ExamModeModal with:
 *  - Full patient medical history
 *  - AI-powered diagnosis assistance
 *  - Lab ordering
 *  - Radiology ordering
 *  - Bulk prescriptions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import type { Appointment, MedicalRecord, LabResult, Prescription } from '../../types/api';

interface MedEntry {
  id: string;
  medication: string;
  dose: string;
  duration: string;
}

type SectionTab = 'exam' | 'history' | 'orders';

export default function ExamModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [appointment, setAppointment]   = useState<Appointment | null>(null);
  const [patientRecords, setPatientRecords] = useState<MedicalRecord[]>([]);
  const [patientLabs, setPatientLabs]   = useState<LabResult[]>([]);
  const [patientPrescriptions, setPatientPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading]   = useState(false);
  const [activeTab, setActiveTab]       = useState<SectionTab>('exam');

  // Exam form
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis]           = useState('');
  const [notes, setNotes]                   = useState('');
  const [meds, setMeds] = useState<MedEntry[]>([
    { id: '1', medication: '', dose: '', duration: '' },
  ]);

  // Orders
  const [requestedLabs, setRequestedLabs]         = useState<string[]>([]);
  const [newLabOrder, setNewLabOrder]             = useState('');
  const [requestedRadiology, setRequestedRadiology] = useState<string[]>([]);
  const [newRadOrder, setNewRadOrder]             = useState('');

  const loadData = useCallback(async () => {
    try {
      // Try single appointment fetch first (more efficient)
      let apt: Appointment | null = null;
      try {
        const { data: singleData } = await api.get(`/appointments/${id}`);
        apt = singleData.data || singleData.appointment || singleData;
      } catch {
        // Fallback: fetch all and find by ID
        const { data } = await api.get('/appointments');
        const list: Appointment[] = data.data || data.appointments || data || [];
        apt = list.find((a) => a._id === id) || null;
      }

      if (!apt) {
        Alert.alert('خطأ', 'لم يتم العثور على الموعد', [
          { text: 'عودة', onPress: () => router.back() },
        ]);
        return;
      }
      setAppointment(apt);

      const aptPatient = apt.patientId;
      const patientId = typeof aptPatient === 'string'
        ? aptPatient
        : aptPatient?._id;

      if (patientId) {
        const [recRes, labRes, presRes] = await Promise.allSettled([
          api.get(`/records/patient/${patientId}`),
          api.get('/labs'),
          api.get(`/prescriptions/${patientId}`),
        ]);
        if (recRes.status === 'fulfilled') {
          setPatientRecords(recRes.value.data.data || []);
        }
        if (labRes.status === 'fulfilled') {
          const allLabs: LabResult[] = labRes.value.data.data || [];
          setPatientLabs(allLabs.filter((l) => {
            const pid = typeof l.patientId === 'string' ? l.patientId : l.patientId?._id;
            return pid === patientId;
          }));
        }
        if (presRes.status === 'fulfilled') {
          setPatientPrescriptions(presRes.value.data.data || []);
        }
      }
    } catch {
      Alert.alert('خطأ', 'تعذر جلب بيانات الموعد');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // AI Format/Assist
  const handleAiAssist = async () => {
    if (!chiefComplaint.trim() && !diagnosis.trim()) {
      Alert.alert('بيانات ناقصة', 'أدخل الشكوى أو التشخيص أولاً للحصول على مساعدة الذكاء الاصطناعي.');
      return;
    }
    try {
      setIsAiLoading(true);
      const patientId = appointment?.patientId?._id || appointment?.patient?._id || appointment?.patientId;
      const { data } = await api.post('/ai/format-record', {
        patientId,
        chiefComplaint: chiefComplaint.trim(),
        diagnosis: diagnosis.trim(),
        notes: notes.trim(),
      });
      const formatted = data.data?.formattedDiagnosis || data.data?.formatted || data.formattedDiagnosis || data.formatted || '';
      if (formatted) {
        Alert.alert(
          '🤖 اقتراح الذكاء الاصطناعي',
          formatted,
          [
            { text: 'استخدام الاقتراح', onPress: () => setDiagnosis(formatted) },
            { text: 'إغلاق', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('AI', 'لم يتم الحصول على اقتراح. حاول مجدداً.');
      }
    } catch {
      Alert.alert('خطأ', 'تعذر الاتصال بخدمة الذكاء الاصطناعي.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Medication helpers
  const addMed = () =>
    setMeds(p => [...p, { id: Date.now().toString(), medication: '', dose: '', duration: '' }]);
  const removeMed = (medId: string) =>
    setMeds(p => p.filter(m => m.id !== medId));
  const updateMed = (medId: string, field: keyof MedEntry, value: string) =>
    setMeds(p => p.map(m => m.id === medId ? { ...m, [field]: value } : m));

  // Lab/Radiology order helpers
  const addLabOrder = () => {
    if (!newLabOrder.trim()) return;
    setRequestedLabs(p => [...p, newLabOrder.trim()]);
    setNewLabOrder('');
  };
  const addRadOrder = () => {
    if (!newRadOrder.trim()) return;
    setRequestedRadiology(p => [...p, newRadOrder.trim()]);
    setNewRadOrder('');
  };

  const handleSubmit = async () => {
    if (!diagnosis.trim()) {
      Alert.alert('حقل مطلوب', 'يرجى إدخال التشخيص الطبي.');
      return;
    }
    const patientId = appointment?.patientId?._id || appointment?.patient?._id || appointment?.patientId;
    if (!patientId) {
      Alert.alert('خطأ', 'تعذر تحديد معرّف المريض.');
      return;
    }
    const validMeds = meds.filter(m => m.medication.trim() && m.dose.trim() && m.duration.trim());

    try {
      setIsSubmitting(true);

      // 1. Medical record (with lab/radiology orders)
      await api.post('/records', {
        patientId,
        diagnosis: diagnosis.trim(),
        ...(chiefComplaint.trim() ? { chiefComplaint: chiefComplaint.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(requestedLabs.length > 0 ? { requestedLabs } : {}),
        ...(requestedRadiology.length > 0 ? { requestedRadiology } : {}),
      });

      // 2. Bulk prescriptions
      if (validMeds.length > 0) {
        await api.post('/prescriptions/bulk', {
          patientId,
          medications: validMeds.map(({ medication, dose, duration }) => ({
            medication, dose, duration,
          })),
        });
      }

      // 3. Create lab requests if any
      for (const lab of requestedLabs) {
        await api.post('/labs', {
          patientId,
          testName: lab,
          status: 'pending_sample',
        }).catch(() => {});
      }

      // 4. Create radiology requests if any
      for (const rad of requestedRadiology) {
        await api.post('/radiology', {
          patientId,
          scanType: rad,
        }).catch(() => {});
      }

      // 5. Mark appointment Completed
      await api.patch(`/appointments/${id}/status`, { status: 'Completed' });

      Alert.alert(
        'تم الحفظ ✓',
        'تم تسجيل الكشف الطبي' +
          (validMeds.length > 0 ? ' وإصدار الوصفة الدوائية' : '') +
          (requestedLabs.length > 0 ? ` وطلب ${requestedLabs.length} تحليل` : '') +
          (requestedRadiology.length > 0 ? ` و${requestedRadiology.length} أشعة` : '') +
          ' بنجاح.',
        [{ text: 'حسناً', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'تعذر حفظ البيانات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={{ color: '#64748b', marginTop: 12, fontSize: 14 }}>جاري تحميل بيانات المريض...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const patientName =
    appointment?.patient?.fullName || appointment?.patientId?.fullName || 'مريض';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      {/* Header */}
      <View style={{ backgroundColor: '#0284c7', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#bae6fd', fontSize: 11, fontWeight: '600' }}>وضع الفحص الطبي</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }} numberOfLines={1}>
            {patientName}
          </Text>
        </View>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>{patientName.charAt(0)}</Text>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={{ flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        {([
          { key: 'exam',    label: 'الفحص',    icon: 'clipboard' },
          { key: 'history', label: 'السجل',    icon: 'document-text' },
          { key: 'orders',  label: 'الطلبات',  icon: 'flask' },
        ] as { key: SectionTab; label: string; icon: string }[]).map(t => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === t.key ? '#0284c7' : 'transparent' }}
          >
            <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? '#0284c7' : '#94a3b8'} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === t.key ? '#0284c7' : '#94a3b8', marginTop: 2 }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── EXAM TAB ── */}
          {activeTab === 'exam' && (<>
            {/* AI Assist button */}
            <TouchableOpacity
              onPress={handleAiAssist}
              disabled={isAiLoading}
              style={{ backgroundColor: '#0d9488', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
            >
              {isAiLoading
                ? <ActivityIndicator color="white" size="small" />
                : <Ionicons name="sparkles" size={18} color="white" />
              }
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 14, marginRight: 8 }}>
                {isAiLoading ? 'جاري التحليل...' : 'مساعدة الذكاء الاصطناعي في التشخيص'}
              </Text>
            </TouchableOpacity>

            <Card title="نتائج الفحص" iconName="clipboard" iconBg="#e0f2fe" iconColor="#0284c7">
              <FormField label="الشكوى الرئيسية" value={chiefComplaint} onChangeText={setChiefComplaint} placeholder="ما الذي يشكو منه المريض؟" multiline />
              <FormField label="التشخيص الطبي *" value={diagnosis} onChangeText={setDiagnosis} placeholder="أدخل التشخيص بوضوح" multiline required />
              <FormField label="ملاحظات الطبيب" value={notes} onChangeText={setNotes} placeholder="توصيات إضافية (اختياري)" multiline />
            </Card>

            <Card
              title="الوصفة الطبية"
              iconName="medkit"
              iconBg="#ede9fe"
              iconColor="#7c3aed"
              action={
                <TouchableOpacity
                  onPress={addMed}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                >
                  <Ionicons name="add" size={16} color="#7c3aed" />
                  <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>إضافة دواء</Text>
                </TouchableOpacity>
              }
            >
              {meds.map((med, idx) => (
                <MedRow key={med.id} med={med} index={idx} canRemove={meds.length > 1} onUpdate={updateMed} onRemove={removeMed} />
              ))}
              <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right', marginTop: 4 }}>اترك الخانات فارغة إذا لم تحتج إلى وصفة</Text>
            </Card>

            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0', flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" style={{ marginLeft: 10 }} />
              <Text style={{ flex: 1, color: '#15803d', fontSize: 13, fontWeight: '600', textAlign: 'right', lineHeight: 20 }}>
                بعد الحفظ، سيُسجَّل الكشف في ملف المريض وتُحدَّث حالة الموعد إلى "مكتمل".
              </Text>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: isSubmitting ? '#93c5fd' : '#0284c7', borderRadius: 16, paddingVertical: 16, alignItems: 'center', elevation: 2 }}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting
                ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="white" size="small" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginLeft: 10 }}>جاري الحفظ...</Text>
                  </View>
                : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>حفظ الكشف الطبي</Text>
              }
            </TouchableOpacity>
          </>)}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (<>
            <Text style={{ color: '#64748b', fontSize: 13, textAlign: 'right', marginBottom: 12 }}>السجل الطبي الكامل للمريض</Text>

            {patientRecords.length === 0 && patientLabs.length === 0 && patientPrescriptions.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 12 }}>لا توجد سجلات سابقة</Text>
              </View>
            )}

            {patientRecords.length > 0 && (
              <SectionHeader title="الكشوفات الطبية" count={patientRecords.length} color="#0284c7" icon="clipboard" />
            )}
            {patientRecords.map((r, i) => (
              <HistoryCard key={r._id || i} title={r.diagnosis || 'كشف طبي'} subtitle={r.notes || r.chiefComplaint} date={r.createdAt} color="#0284c7" bg="#e0f2fe" />
            ))}

            {patientPrescriptions.length > 0 && (
              <SectionHeader title="الروشتات" count={patientPrescriptions.length} color="#7c3aed" icon="medkit" />
            )}
            {patientPrescriptions.map((p, i) => (
              <HistoryCard key={p._id || i} title={p.medication || 'دواء'} subtitle={`${p.dose || ''} — ${p.duration || ''}`} date={p.createdAt} color="#7c3aed" bg="#ede9fe" />
            ))}

            {patientLabs.length > 0 && (
              <SectionHeader title="التحاليل" count={patientLabs.length} color="#0d9488" icon="flask" />
            )}
            {patientLabs.map((l, i) => (
              <HistoryCard key={l._id || i} title={l.testName || 'تحليل'} subtitle={l.result || l.status} date={l.createdAt} color="#0d9488" bg="#ccfbf1" />
            ))}
          </>)}

          {/* ── ORDERS TAB ── */}
          {activeTab === 'orders' && (<>
            {/* Lab orders */}
            <Card title="طلبات التحاليل" iconName="flask" iconBg="#ccfbf1" iconColor="#0d9488">
              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={addLabOrder}
                  style={{ backgroundColor: '#0d9488', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginLeft: 8 }}
                >
                  <Ionicons name="add" size={18} color="white" />
                </TouchableOpacity>
                <TextInput
                  value={newLabOrder}
                  onChangeText={setNewLabOrder}
                  onSubmitEditing={addLabOrder}
                  placeholder="مثال: CBC، سكر صائم، وظائف كلى..."
                  placeholderTextColor="#94a3b8"
                  textAlign="right"
                  style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b' }}
                />
              </View>
              {requestedLabs.map((lab, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                  <TouchableOpacity onPress={() => setRequestedLabs(p => p.filter((_, j) => j !== i))} style={{ marginLeft: 8 }}>
                    <Ionicons name="close-circle" size={18} color="#dc2626" />
                  </TouchableOpacity>
                  <Text style={{ flex: 1, color: '#0d9488', fontWeight: '600', textAlign: 'right' }}>{lab}</Text>
                  <Ionicons name="flask" size={14} color="#0d9488" />
                </View>
              ))}
              {requestedLabs.length === 0 && (
                <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 13, paddingVertical: 8 }}>لم تطلب تحاليل بعد</Text>
              )}
            </Card>

            {/* Radiology orders */}
            <Card title="طلبات الأشعة" iconName="scan-circle" iconBg="#fef3c7" iconColor="#d97706">
              <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={addRadOrder}
                  style={{ backgroundColor: '#d97706', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginLeft: 8 }}
                >
                  <Ionicons name="add" size={18} color="white" />
                </TouchableOpacity>
                <TextInput
                  value={newRadOrder}
                  onChangeText={setNewRadOrder}
                  onSubmitEditing={addRadOrder}
                  placeholder="مثال: أشعة صدر، موجات فوق صوتية..."
                  placeholderTextColor="#94a3b8"
                  textAlign="right"
                  style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b' }}
                />
              </View>
              {requestedRadiology.map((rad, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 6 }}>
                  <TouchableOpacity onPress={() => setRequestedRadiology(p => p.filter((_, j) => j !== i))} style={{ marginLeft: 8 }}>
                    <Ionicons name="close-circle" size={18} color="#dc2626" />
                  </TouchableOpacity>
                  <Text style={{ flex: 1, color: '#d97706', fontWeight: '600', textAlign: 'right' }}>{rad}</Text>
                  <Ionicons name="scan-circle" size={14} color="#d97706" />
                </View>
              ))}
              {requestedRadiology.length === 0 && (
                <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 13, paddingVertical: 8 }}>لم تطلب أشعة بعد</Text>
              )}
            </Card>

            {(requestedLabs.length > 0 || requestedRadiology.length > 0) && (
              <View style={{ backgroundColor: '#f0f9ff', borderRadius: 16, padding: 14, marginTop: 4, borderWidth: 1, borderColor: '#bae6fd' }}>
                <Text style={{ color: '#0284c7', fontWeight: '700', textAlign: 'right', fontSize: 13 }}>
                  📋 {requestedLabs.length + requestedRadiology.length} طلب سيُرسَل عند حفظ الكشف
                </Text>
              </View>
            )}
          </>)}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, iconName, iconBg, iconColor, children, action }: {
  title: string; iconName: string; iconBg: string; iconColor: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {action ?? <View />}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b' }}>{title}</Text>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Ionicons name={iconName as any} size={16} color={iconColor} />
          </View>
        </View>
      </View>
      {children}
    </View>
  );
}

function SectionHeader({ title, count, color, icon }: { title: string; count: number; color: string; icon: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8, marginTop: 4 }}>
      <View style={{ backgroundColor: color + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 6 }}>
        <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{count}</Text>
      </View>
      <Text style={{ color: '#1e293b', fontWeight: '800', fontSize: 14 }}>{title}</Text>
      <Ionicons name={icon as any} size={15} color={color} style={{ marginRight: 6 }} />
    </View>
  );
}

function HistoryCard({ title, subtitle, date, color, bg }: { title: string; subtitle?: string; date?: string; color: string; bg: string }) {
  return (
    <View style={{ backgroundColor: bg + '60', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {date && (
          <Text style={{ color: '#94a3b8', fontSize: 11 }}>
            {new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: date ? 8 : 0 }}>
          <Text style={{ color, fontWeight: '700', fontSize: 13, textAlign: 'right' }} numberOfLines={2}>{title}</Text>
          {Boolean(subtitle) && <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'right', marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, multiline = false, required = false }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; multiline?: boolean; required?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlign="right"
        textAlignVertical={multiline ? 'top' : 'center'}
        style={{
          backgroundColor: '#f8fafc', borderWidth: 1,
          borderColor: required && !value.trim() ? '#fca5a5' : '#e2e8f0',
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          fontSize: 14, color: '#1e293b', minHeight: multiline ? 82 : 48,
        }}
      />
    </View>
  );
}

function MedRow({ med, index, canRemove, onUpdate, onRemove }: {
  med: MedEntry; index: number; canRemove: boolean;
  onUpdate: (id: string, field: keyof MedEntry, value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={{ borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        {canRemove ? (
          <TouchableOpacity onPress={() => onRemove(med.id)} style={{ backgroundColor: '#fee2e2', borderRadius: 6, padding: 5 }}>
            <Ionicons name="trash-outline" size={13} color="#ef4444" />
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
        <Text style={{ color: '#7c3aed', fontWeight: '800', fontSize: 13 }}>دواء {index + 1}</Text>
      </View>
      <TextInput
        value={med.medication} onChangeText={v => onUpdate(med.id, 'medication', v)}
        placeholder="اسم الدواء" placeholderTextColor="#94a3b8" textAlign="right"
        style={{ backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#1e293b', marginBottom: 8 }}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={med.dose} onChangeText={v => onUpdate(med.id, 'dose', v)}
          placeholder="الجرعة" placeholderTextColor="#94a3b8" textAlign="right"
          style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#1e293b' }}
        />
        <TextInput
          value={med.duration} onChangeText={v => onUpdate(med.id, 'duration', v)}
          placeholder="المدة" placeholderTextColor="#94a3b8" textAlign="right"
          style={{ flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#1e293b' }}
        />
      </View>
    </View>
  );
}
