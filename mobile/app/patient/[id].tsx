/**
 * patient/[id].tsx — Doctor's view of a patient's full profile.
 * Tries GET /records/doctor-patient/:id first (no OTP if previously consented).
 * On 403 → request OTP → user types 4 digits → verify → load data.
 *
 * Flow:
 *   1. fetch /records/doctor-patient/:id
 *   2. if 403: POST /records/request-access {patientId} → sessionId
 *   3. user enters code → POST /records/verify-otp {sessionId, code} → records
 *   4. emergency override: POST /records/emergency-access/:id {reason}
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { toast } from '../../components/Toast';
import { openSecureDocument } from '../../components/DocumentViewer';
import type { Patient, MedicalRecord, Prescription, LabResult, Radiology } from '../../types/api';

type PatientData = {
  patient: Patient;
  records: MedicalRecord[];
  prescriptions: Prescription[];
  labs?: LabResult[];
  radiology?: Radiology[];
};

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData]     = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);

  // OTP gate state
  const [needsOtp, setNeedsOtp]   = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpCode, setOtpCode]     = useState('');
  const [otpBusy, setOtpBusy]     = useState(false);
  const [devOtp, setDevOtp]       = useState<string | null>(null);

  const loadDirect = async () => {
    try {
      const { data: res } = await api.get(`/records/doctor-patient/${id}`);
      setData(res?.data || res);
      setNeedsOtp(false);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        setNeedsOtp(true);
      } else {
        toast.error('تعذر تحميل بيانات المريض');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDirect(); }, [id]);

  const requestOtp = async () => {
    setOtpBusy(true);
    try {
      const { data: res } = await api.post('/records/request-access', { patientId: id });
      setSessionId(res?.sessionId || res?.data?.sessionId);
      setDevOtp(res?.__dev_otp || null);
      toast.info('تم إرسال كود OTP للمريض');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر طلب الصلاحية');
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length !== 4) return toast.warn('أدخل كود من 4 أرقام');
    if (!sessionId) return toast.warn('اطلب الكود أولاً');
    setOtpBusy(true);
    try {
      const { data: res } = await api.post('/records/verify-otp', { sessionId, code: otpCode });
      setData(res?.data || res);
      setNeedsOtp(false);
      toast.success('تم التحقق ✓');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'الكود غير صحيح');
    } finally {
      setOtpBusy(false);
    }
  };

  const [emergencyReason, setEmergencyReason] = useState('');
  const [showEmergencyInput, setShowEmergencyInput] = useState(false);

  const submitEmergencyAccess = async (reason: string) => {
    if (!reason || reason.trim().length < 10) {
      toast.warn('السبب يجب أن يكون 10 أحرف على الأقل');
      return;
    }
    setOtpBusy(true);
    try {
      const { data: res } = await api.post(`/records/emergency-access/${id}`, { reason: reason.trim() });
      setData(res?.data || res);
      setNeedsOtp(false);
      setShowEmergencyInput(false);
      toast.success('تم الوصول الطارئ');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الوصول الطارئ');
    } finally {
      setOtpBusy(false);
    }
  };

  const emergencyAccess = () => {
    if (Alert.prompt) {
      // iOS — use native prompt
      Alert.prompt('وصول طارئ', 'سبب الوصول (مطلوب لأرشفة الفعل):', (reason) => {
        submitEmergencyAccess(reason);
      });
    } else {
      // Android — show inline input
      setShowEmergencyInput(true);
      setEmergencyReason('');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </SafeAreaView>
    );
  }

  // ── OTP Gate UI ─────────────────────────────────────────────────────────
  if (needsOtp) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
        <Header title="طلب صلاحية" subtitle="OTP" />

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 32 }}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 24, backgroundColor: '#dbeafe',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Ionicons name="shield-checkmark" size={40} color="#0284c7" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>
              الوصول لبيانات المريض يتطلب موافقته
            </Text>
            <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
              اطلب من المريض كود OTP المرسل لهاتفه
            </Text>
          </View>

          {!sessionId ? (
            <TouchableOpacity onPress={requestOtp} disabled={otpBusy} style={{
              backgroundColor: otpBusy ? '#93c5fd' : '#0284c7',
              borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 16,
            }}>
              {otpBusy ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>طلب الكود</Text>}
            </TouchableOpacity>
          ) : (
            <>
              {/* Dev-only OTP display — never render in production builds even
                 if the backend mistakenly leaks `__dev_otp` in its response. */}
              {__DEV__ && devOtp && (
                <View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                  <Text style={{ color: '#a16207', textAlign: 'center', fontWeight: '700' }}>
                    🛠 كود التطوير: {devOtp}
                  </Text>
                </View>
              )}
              <TextInput
                value={otpCode} onChangeText={setOtpCode}
                placeholder="000000" placeholderTextColor="#94a3b8"
                keyboardType="number-pad" maxLength={6}
                style={{
                  backgroundColor: 'white', borderRadius: 16, padding: 20,
                  fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 12,
                  borderWidth: 2, borderColor: '#e2e8f0', marginBottom: 16,
                }}
              />
              <TouchableOpacity onPress={verifyOtp} disabled={otpBusy} style={{
                backgroundColor: otpBusy ? '#93c5fd' : '#0284c7',
                borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12,
              }}>
                {otpBusy ? <ActivityIndicator color="white" />
                  : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>تحقق</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={requestOtp}>
                <Text style={{ color: '#0284c7', textAlign: 'center', fontSize: 13, fontWeight: '700' }}>
                  إعادة إرسال الكود
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 24 }} />

          <TouchableOpacity onPress={emergencyAccess} disabled={otpBusy} style={{
            backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
            borderRadius: 16, paddingVertical: 14, alignItems: 'center',
          }}>
            <Text style={{ color: '#dc2626', fontWeight: '900', fontSize: 14 }}>
              🚨 وصول طارئ (Break-the-Glass)
            </Text>
            <Text style={{ color: '#b91c1c', fontSize: 11, marginTop: 4 }}>
              سيتم تسجيل العملية بسبب
            </Text>
          </TouchableOpacity>

          {/* Android emergency input (since Alert.prompt is iOS-only) */}
          {showEmergencyInput && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 12, textAlign: 'right', marginBottom: 8 }}>
                سبب الوصول الطارئ (10 أحرف على الأقل):
              </Text>
              <TextInput
                value={emergencyReason} onChangeText={setEmergencyReason}
                placeholder="اكتب السبب هنا..."
                placeholderTextColor="#94a3b8"
                textAlign="right" multiline
                style={{
                  backgroundColor: 'white', borderRadius: 12, padding: 14,
                  borderWidth: 2, borderColor: '#fecaca', fontSize: 14, color: '#1e293b',
                  minHeight: 60, textAlignVertical: 'top', marginBottom: 10,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowEmergencyInput(false)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' }}>
                  <Text style={{ color: '#64748b', fontWeight: '700' }}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => submitEmergencyAccess(emergencyReason)} disabled={otpBusy}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: otpBusy ? '#fca5a5' : '#dc2626', alignItems: 'center' }}>
                  {otpBusy ? <ActivityIndicator color="white" size="small" />
                    : <Text style={{ color: 'white', fontWeight: '900' }}>تأكيد الوصول</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Patient Data UI ─────────────────────────────────────────────────────
  const p = data?.patient || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
      <Header title={p.fullName || 'مريض'} subtitle={p.nationalId || ''} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {/* Profile summary */}
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 56, height: 56, borderRadius: 16, backgroundColor: '#e0f2fe',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: '#0284c7', fontSize: 24, fontWeight: '900' }}>
                {(p.fullName || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
              <Text style={{ fontWeight: '900', color: '#1e293b', fontSize: 16 }}>{p.fullName}</Text>
              {p.dateOfBirth && (
                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  مواليد {new Date(p.dateOfBirth).toLocaleDateString('ar-EG')}
                </Text>
              )}
              {p.bloodType && p.bloodType !== 'unknown' && (
                <View style={{ marginTop: 4, backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: '#b91c1c', fontSize: 11, fontWeight: '900' }}>
                    🩸 {p.bloodType}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Critical info */}
        {(p.allergies?.length > 0 || p.chronicDiseases?.length > 0) && (
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ fontWeight: '900', color: '#b91c1c', textAlign: 'right', marginBottom: 8 }}>⚠️ معلومات حرجة</Text>
            {p.allergies?.length > 0 && (
              <Text style={{ color: '#7f1d1d', textAlign: 'right', marginBottom: 4 }}>
                <Text style={{ fontWeight: '700' }}>الحساسيات: </Text>
                {p.allergies.join('، ')}
              </Text>
            )}
            {p.chronicDiseases?.length > 0 && (
              <Text style={{ color: '#7f1d1d', textAlign: 'right' }}>
                <Text style={{ fontWeight: '700' }}>أمراض مزمنة: </Text>
                {p.chronicDiseases.join('، ')}
              </Text>
            )}
          </View>
        )}

        {/* Records section */}
        <Section title="السجلات الطبية" count={data?.records?.length || 0}>
          {data?.records?.slice(0, 10).map((r) => (
            <Item key={r._id}
              title={r.diagnosis || 'سجل طبي'}
              subtitle={new Date(r.createdAt).toLocaleDateString('ar-EG')}
              icon="document-text" color="#0284c7" bg="#e0f2fe"
              docUrl={r.documentPath || r.fileUrl}
            />
          ))}
        </Section>

        {/* Prescriptions section */}
        <Section title="الروشتات" count={data?.prescriptions?.length || 0}>
          {data?.prescriptions?.slice(0, 10).map((rx) => (
            <Item key={rx._id}
              title={rx.medication || rx.medications?.[0]?.name || 'روشتة'}
              subtitle={`${rx.dose || ''} • ${rx.duration || ''}`}
              icon="medkit" color="#7c3aed" bg="#ede9fe"
            />
          ))}
        </Section>

        {/* Quick actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <ActionBtn
            icon="add-circle" label="كشف جديد" color="#0284c7"
            onPress={() => router.push(`/exam/new?patientId=${id}` as any)}
          />
          <ActionBtn
            icon="medkit" label="روشتة" color="#7c3aed"
            onPress={() => router.push(`/doctor/prescribe?patientId=${id}` as any)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{
      backgroundColor: '#0284c7', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 22,
      flexDirection: 'row', alignItems: 'center',
    }}>
      <TouchableOpacity onPress={() => router.back()} style={{
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8,
      }}>
        <Ionicons name="arrow-back" size={20} color="white" />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
        <Text style={{ color: '#bae6fd', fontSize: 11 }}>{subtitle}</Text>
        <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f1f5f9' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
          <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700' }}>{count}</Text>
        </View>
        <Text style={{ color: '#1e293b', fontWeight: '900', fontSize: 14 }}>{title}</Text>
      </View>
      {count === 0
        ? <Text style={{ color: '#94a3b8', textAlign: 'center', paddingVertical: 16 }}>لا توجد بيانات</Text>
        : children}
    </View>
  );
}

function Item({ title, subtitle, icon, color, bg, docUrl }: { title: string; subtitle: string; icon: string; color: string; bg: string; docUrl?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 10 }}>
        <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{title}</Text>
        <Text style={{ color: '#94a3b8', fontSize: 11 }}>{subtitle}</Text>
      </View>
      {docUrl && (
        <TouchableOpacity onPress={() => openSecureDocument(docUrl)}>
          <Ionicons name="document-attach" size={18} color="#64748b" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ActionBtn({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      flex: 1, backgroundColor: color, borderRadius: 14, paddingVertical: 14,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons name={icon as any} size={18} color="white" />
      <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, marginLeft: 6 }}>{label}</Text>
    </TouchableOpacity>
  );
}
