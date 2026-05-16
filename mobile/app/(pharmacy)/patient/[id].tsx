/**
 * (pharmacy)/patient/[id].tsx — Pharmacy view of patient prescriptions.
 * Shows patient info + prescription list with dispense action + manual-add button.
 *
 * GET /patients/:id          — patient info
 * GET /prescriptions/:id     — patient prescriptions
 * PUT /prescriptions/:id/dispense
 * PUT /prescriptions/:id     — edit before dispense
 * POST /prescriptions        — manual dispense
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StatusBar, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';
import { toast } from '../../../components/Toast';
import { confirm } from '../../../components/ConfirmDialog';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  Pending:   { label: 'قيد الانتظار', bg: '#fef9c3', text: '#854d0e' },
  Dispensed: { label: 'تم الصرف',     bg: '#dcfce7', text: '#166534' },
  Cancelled: { label: 'ملغى',         bg: '#fee2e2', text: '#991b1b' },
};

export default function PharmacyPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, rx] = await Promise.allSettled([
        api.get(`/patients/${id}`),
        api.get(`/prescriptions/${id}`),
      ]);
      if (p.status === 'fulfilled') setPatient(p.value.data?.data || p.value.data);
      if (rx.status === 'fulfilled') setItems(rx.value.data?.data || rx.value.data?.prescriptions || []);
    } catch {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDispense = async (rxId: string) => {
    const ok = await confirm({ title: 'تأكيد الصرف', message: 'هل تم صرف هذه الوصفة؟', confirmText: 'تأكيد' });
    if (!ok) return;
    try {
      await api.put(`/prescriptions/${rxId}/dispense`);
      toast.success('تم الصرف');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل');
      await load(); // refresh to show actual state
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#dc2626" />

      <View style={{ backgroundColor: '#dc2626', padding: 16, paddingTop: 14, paddingBottom: 18, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{
          backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10,
        }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#fecaca', fontSize: 11 }}>المريض</Text>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>
            {patient?.fullName || '...'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      ) : (
        <>
          {/* Patient summary card */}
          <View style={{ backgroundColor: 'white', margin: 16, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
            <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right' }}>{patient?.nationalId || '—'}</Text>
            {patient?.allergies?.length > 0 && (
              <View style={{ marginTop: 10, backgroundColor: '#dc2626', padding: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 10 }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>⚠️ تحذير حساسية!</Text>
                  <Text style={{ color: '#fecaca', fontWeight: '700', fontSize: 13, textAlign: 'right', marginTop: 2 }}>
                    {patient.allergies.join(' • ')}
                  </Text>
                </View>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="warning" size={24} color="white" />
                </View>
              </View>
            )}
          </View>

          <FlatList
            data={items}
            keyExtractor={(p) => p._id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
            ListHeaderComponent={() => (
              <Text style={{ fontWeight: '900', color: '#1e293b', textAlign: 'right', marginBottom: 10 }}>
                الوصفات ({items.length})
              </Text>
            )}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Ionicons name="medkit-outline" size={48} color="#cbd5e1" />
                <Text style={{ color: '#64748b', marginTop: 12 }}>لا توجد وصفات</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const st = STATUS_MAP[item.status] || STATUS_MAP.Pending;
              const isPending = item.status === 'Pending';
              return (
                <View style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: st.bg }}>
                      <Text style={{ color: st.text, fontSize: 11, fontWeight: '700' }}>{st.label}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={{ color: '#1e293b', fontWeight: '900', fontSize: 15 }}>
                        {item.medication || item.medications?.[0]?.name || '—'}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                        {item.dose || ''} • {item.duration || ''}
                      </Text>
                      {item.doctorId?.fullName && (
                        <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                          د. {item.doctorId.fullName}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isPending && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity onPress={() => setEditing(item)}
                        style={{ flex: 1, backgroundColor: '#dbeafe', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#1e40af', fontWeight: '700', fontSize: 12 }}>تعديل</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDispense(item._id)}
                        style={{ flex: 1, backgroundColor: '#dcfce7', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>صرف</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />

          {/* FAB: Manual dispense */}
          <TouchableOpacity onPress={() => setShowAdd(true)}
            style={{
              position: 'absolute', bottom: 24, left: 16, right: 16,
              backgroundColor: '#dc2626', borderRadius: 16, paddingVertical: 16,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4,
            }}>
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 15, marginRight: 8 }}>
              إضافة دواء يدوياً (OTC)
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Manual add modal */}
      <RxModal
        visible={showAdd} onClose={() => setShowAdd(false)} patientId={id as string}
        onDone={() => { setShowAdd(false); load(); }}
        patientAllergies={patient?.allergies || []}
        currentMeds={items.filter((i: any) => i.status === 'pending' || i.status === 'Pending').map((i: any) => i.medication).filter(Boolean)}
      />
      {/* Edit modal */}
      <RxModal
        visible={!!editing} onClose={() => setEditing(null)} patientId={id as string}
        existing={editing} onDone={() => { setEditing(null); load(); }}
        patientAllergies={patient?.allergies || []}
        currentMeds={items.filter((i: any) => i.status === 'pending' || i.status === 'Pending').map((i: any) => i.medication).filter(Boolean)}
      />
    </SafeAreaView>
  );
}

function RxModal({ visible, onClose, patientId, existing, onDone, patientAllergies, currentMeds }: {
  visible: boolean; onClose: () => void; patientId: string; existing?: any; onDone: () => void;
  patientAllergies?: string[]; currentMeds?: string[];
}) {
  const [medication, setMed]      = useState(existing?.medication || '');
  const [dose, setDose]           = useState(existing?.dose || '');
  const [duration, setDuration]   = useState(existing?.duration || '');
  const [busy, setBusy]           = useState(false);
  const [drugWarning, setDrugWarning] = useState<{ status: string; message: string } | null>(null);
  const [checkingDrug, setCheckingDrug] = useState(false);

  useEffect(() => {
    setMed(existing?.medication || '');
    setDose(existing?.dose || '');
    setDuration(existing?.duration || '');
    setDrugWarning(null);
  }, [existing, visible]);

  // Auto drug interaction check (debounced)
  useEffect(() => {
    if (!medication.trim() || medication.trim().length < 2) {
      setDrugWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingDrug(true);
      try {
        const { data } = await api.post('/ai/check-interactions', {
          newDrug: medication.trim(),
          currentDrugs: currentMeds || [],
          allergies: patientAllergies || [],
        });
        const result = data?.data;
        if (result && result.status !== 'Safe') {
          setDrugWarning(result);
        } else {
          setDrugWarning(null);
        }
      } catch {
        // AI unavailable — skip silently
      } finally {
        setCheckingDrug(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [medication, currentMeds, patientAllergies]);

  const handleSave = async () => {
    if (!medication.trim() || !dose.trim() || !duration.trim()) {
      return toast.warn('املأ جميع الحقول');
    }
    setBusy(true);
    try {
      if (existing) {
        await api.put(`/prescriptions/${existing._id}`, {
          medication: medication.trim(), dose: dose.trim(), duration: duration.trim(),
        });
        toast.success('تم التعديل');
      } else {
        // Manual dispense — backend sets status='dispensed' for pharmacy role
        await api.post('/prescriptions', {
          medication: medication.trim(), dose: dose.trim(), duration: duration.trim(), patientId,
        });
        toast.success('تم إضافة وصرف الدواء');
      }
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ backgroundColor: 'rgba(0,0,0,0.5)', flex: 1 }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, marginTop: 'auto' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
              <Text style={{ fontWeight: '900', fontSize: 17, color: '#1e293b' }}>
                {existing ? 'تعديل الوصفة' : 'إضافة دواء يدوياً'}
              </Text>
            </View>

            {/* Drug interaction warning banner */}
            {drugWarning && (
              <View style={{
                backgroundColor: drugWarning.status === 'Danger' ? '#dc2626' : '#d97706',
                padding: 12, borderRadius: 12, marginBottom: 14,
                flexDirection: 'row', alignItems: 'center',
              }}>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 8 }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>
                    {drugWarning.status === 'Danger' ? '🚨 خطر تعارض دوائي!' : '⚠️ تحذير تعارض'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, textAlign: 'right', marginTop: 2 }}>
                    {drugWarning.message}
                  </Text>
                </View>
                <Ionicons name={drugWarning.status === 'Danger' ? 'skull' : 'alert-circle'} size={22} color="white" />
              </View>
            )}

            {checkingDrug && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginRight: 6 }}>جاري فحص التعارض...</Text>
                <ActivityIndicator size="small" color="#94a3b8" />
              </View>
            )}

            <Text style={S.label}>اسم الدواء *</Text>
            <TextInput value={medication} onChangeText={setMed} placeholder="مثال: بنادول"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input} />

            <Text style={S.label}>الجرعة *</Text>
            <TextInput value={dose} onChangeText={setDose} placeholder="500 ملجم مرتين"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input} />

            <Text style={S.label}>المدة *</Text>
            <TextInput value={duration} onChangeText={setDuration} placeholder="7 أيام"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input} />

            <TouchableOpacity onPress={handleSave} disabled={busy}
              style={{
                backgroundColor: busy ? '#fca5a5' : '#dc2626',
                borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8,
              }}>
              {busy ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>
                    {existing ? 'حفظ التعديل' : 'تأكيد الصرف'}
                  </Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = {
  label: { color: '#475569', fontSize: 12, fontWeight: '700' as const, textAlign: 'right' as const, marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1e293b', marginBottom: 4 },
};
