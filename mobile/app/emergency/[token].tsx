import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function EmergencyAccessScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [isFullAccess, setIsFullAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        // Validate the token shape early so we don't fire requests with junk
        // values. We accept either:
        //   1. A 24-hex Mongo ObjectId (emergency QR — public minimal data)
        //   2. A signed JWT (`a.b.c` shape with reasonable length)
        const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
        const JWT_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

        if (OBJECT_ID_RE.test(token)) {
          // Emergency mode — backend `/api/emergency/:id` returns the public
          // minimal-PII subset for first responders. Do NOT call protected
          // endpoints with a raw ObjectId; that bypasses OTP.
          const { data } = await api.get(`/emergency/${token}`);
          const p = data?.data || {};
          setPatient({
            ...p,
            medicalRecords: [],
            prescriptions: [],
            labResults: [],
          });
          setIsFullAccess(false);
        } else if (JWT_RE.test(token) && token.length < 4096) {
          const { data } = await api.post('/patients/verify-qr', { token });
          const p = data.data?.patient || data.data;
          setPatient({
            ...p,
            medicalRecords: data.data?.records || [],
            prescriptions: data.data?.prescriptions || [],
            labResults: data.data?.labs || [],
          });
          setIsFullAccess(data.data?.isFullAccess ?? true);
        } else {
          throw new Error('invalid token format');
        }
      } catch {
        Alert.alert('خطأ', 'الرمز غير صالح أو منتهي الصلاحية', [
          { text: 'عودة', onPress: () => router.back() },
        ]);
      } finally { setIsLoading(false); }
    })();
  }, [token]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff1f2" />
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>جاري تحميل البيانات الحرجة...</Text>
      </SafeAreaView>
    );
  }

  if (!patient) return null;

  const section = (title: string, icon: string, color: string, bg: string, children: React.ReactNode) => (
    <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: '#1e293b' }}>{title}</Text>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
          <Ionicons name={icon as any} size={16} color={color} />
        </View>
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff1f2' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#dc2626" />

      <View style={{ backgroundColor: '#dc2626', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#fecaca', fontSize: 11, fontWeight: '600' }}>وصول الطوارئ</Text>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }}>بيانات المريض</Text>
        </View>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="warning" size={20} color="white" />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>

        <View style={{ backgroundColor: '#fee2e2', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 13 }}>هذا الوصول مخصص للطوارئ فقط</Text>
            <Text style={{ color: '#b91c1c', fontSize: 12, marginTop: 2 }}>يتم تسجيل هذا الدخول في النظام</Text>
          </View>
          <Ionicons name="warning" size={24} color="#dc2626" style={{ marginLeft: 10 }} />
        </View>

        <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#dc2626' }}>{(patient.fullName || 'م').charAt(0)}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 4 }}>{patient.fullName}</Text>
          <Text style={{ color: '#64748b', fontSize: 14 }}>{patient.nationalId}</Text>
        </View>

        {section('البيانات الحرجة', 'medkit', '#dc2626', '#fee2e2', <>
          {[
            { label: 'فصيلة الدم', value: patient.bloodType || 'غير معروف', color: '#dc2626' },
            { label: 'الحساسيات', value: Array.isArray(patient.allergies) && patient.allergies.length ? patient.allergies.join('، ') : 'لا يوجد', color: '#d97706' },
            { label: 'الأمراض المزمنة', value: Array.isArray(patient.chronicDiseases) && patient.chronicDiseases.length ? patient.chronicDiseases.join('، ') : 'لا يوجد', color: '#0284c7' },
          ].map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
              <Text style={{ color: r.color, fontWeight: '700', fontSize: 14, flex: 1 }}>{r.value}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>{r.label}</Text>
            </View>
          ))}
        </>)}

        {isFullAccess && (<>

          {section('الوصفات الطبية', 'document-text', '#7c3aed', '#ede9fe',
            patient.prescriptions?.length > 0
              ? patient.prescriptions.slice(0, 5).map((p: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: i < Math.min(patient.prescriptions.length, 5) - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{p.date ? new Date(p.date).toLocaleDateString('ar-EG') : ''}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 14 }}>{p.medication || p.name}</Text>
                    {Boolean(p.dosage) && <Text style={{ color: '#64748b', fontSize: 12 }}>{p.dosage}</Text>}
                  </View>
                </View>
              ))
              : <Text style={{ color: '#94a3b8', textAlign: 'center', paddingVertical: 8 }}>لا توجد وصفات</Text>
          )}

          {section('نتائج التحاليل', 'flask', '#d97706', '#fef3c7',
            patient.labResults?.length > 0
              ? patient.labResults.slice(0, 5).map((l: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: i < Math.min(patient.labResults.length, 5) - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{l.date ? new Date(l.date).toLocaleDateString('ar-EG') : ''}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 14 }}>{l.testType}</Text>
                    {Boolean(l.result) && <Text style={{ color: '#d97706', fontSize: 12 }}>{l.result}</Text>}
                  </View>
                </View>
              ))
              : <Text style={{ color: '#94a3b8', textAlign: 'center', paddingVertical: 8 }}>لا توجد تحاليل</Text>
          )}

          {section('السجل الطبي', 'clipboard', '#0d9488', '#ccfbf1',
            patient.medicalRecords?.length > 0
              ? patient.medicalRecords.slice(0, 5).map((r: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < Math.min(patient.medicalRecords.length, 5) - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>{r.date ? new Date(r.date).toLocaleDateString('ar-EG') : ''}</Text>
                  <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 14, flex: 1, textAlign: 'right', marginLeft: 8 }}>{r.diagnosis || r.title}</Text>
                </View>
              ))
              : <Text style={{ color: '#94a3b8', textAlign: 'center', paddingVertical: 8 }}>لا توجد سجلات</Text>
          )}

        </>)}

        {!isFullAccess && (
          <View style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Ionicons name="lock-closed-outline" size={28} color="#94a3b8" />
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 8, textAlign: 'center' }}>الوصول الكامل للملف الطبي متاح للأطباء المعتمدين فقط</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
