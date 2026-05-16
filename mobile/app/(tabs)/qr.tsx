import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function QRScreen() {
  const { user } = useAuth();
  const canScan = ['doctor', 'hospital', 'lab', 'pharmacy'].includes(user?.role || '');

  if (!canScan) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Ionicons name="lock-closed-outline" size={48} color="#cbd5e1" />
        <Text style={{ color: '#64748b', fontWeight: '600', textAlign: 'center', marginTop: 16 }}>
          هذه الشاشة غير متاحة لهذا الدور
        </Text>
      </SafeAreaView>
    );
  }

  return <DoctorScanner />;
}

function DoctorScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="camera-outline" size={48} color="#cbd5e1" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
        <View style={{ backgroundColor: '#0284c7', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'right' }}>مسح QR</Text>
          <Text style={{ color: '#bae6fd', fontSize: 12, textAlign: 'right', marginTop: 4 }}>
            استخدم الكاميرا لمسح كود المريض
          </Text>
        </View>
        <View style={{ flex: 1, marginTop: -16, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 80, height: 80, backgroundColor: '#e0f2fe', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="camera" size={36} color="#0284c7" />
          </View>
          <Text style={{ color: '#1e293b', fontWeight: '700', fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
            صلاحية الكاميرا مطلوبة
          </Text>
          <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            نحتاج إلى الوصول للكاميرا لمسح رمز QR الخاص بالمريض وفتح ملفه الطبي
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#0284c7', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' }}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>منح الصلاحية</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);
    setProcessing(true);

    try {
      // Format 1: emergency QR — only accept our own deep-link scheme
      // (`medcore://emergency/<id>`) or our own web origin
      // (`https://umr-project.vercel.app/emergency/<id>`). Previously the
      // regex `\/emergency\/(...)` matched ANY URL ending in `/emergency/<id>`,
      // so a malicious printed QR could trick a doctor into opening a
      // patient profile by URL guess.
      const TRUSTED_HOSTS = [
        'umr-project.vercel.app',
        'umr-project.onrender.com',
      ];
      const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

      let emergencyId: string | undefined;

      const deepMatch = data.match(/^medcore:\/\/emergency\/([a-zA-Z0-9_-]+)$/);
      if (deepMatch?.[1]) {
        emergencyId = deepMatch[1];
      } else if (/^https?:\/\//i.test(data)) {
        try {
          const u = new URL(data);
          if (TRUSTED_HOSTS.includes(u.hostname)) {
            const m = u.pathname.match(/^\/emergency\/([a-zA-Z0-9_-]+)\/?$/);
            if (m?.[1]) emergencyId = m[1];
          }
        } catch {
          // not a parseable URL — ignore
        }
      }

      // Final guard: must be a 24-hex Mongo ObjectId.
      if (emergencyId && !OBJECT_ID_RE.test(emergencyId)) {
        emergencyId = undefined;
      }

      if (emergencyId) {
        // Navigate to emergency view with the patient ObjectId
        setProcessing(false);
        Alert.alert(
          'تم التعرف على المريض',
          'هل تريد فتح ملف الطوارئ؟',
          [
            {
              text: 'فتح الملف',
              onPress: () => {
                router.push(`/emergency/${emergencyId}` as any);
                setScanned(false);
              },
            },
            { text: 'إلغاء', style: 'cancel', onPress: () => setScanned(false) },
          ],
        );
        return;
      }

      // Format 2: JWT secured token — verify via /patients/verify-qr
      const tokenMatch = data.match(/token=([A-Za-z0-9_.-]+)/);
      const extractedToken = tokenMatch ? tokenMatch[1] : data.trim();
      
      // JWT tokens look like xxxxx.xxxxx.xxxxx
      const isJWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(extractedToken);

      if (isJWT) {
        try {
          const res = await api.post('/patients/verify-qr', { token: extractedToken });
          const patient = res.data?.data?.patient || res.data?.patient;
          const patientId = patient?._id;
          setProcessing(false);
          if (patientId) {
            Alert.alert(
              'تم التحقق ✓',
              `مريض: ${patient?.fullName || 'مجهول'}`,
              [
                {
                  text: 'عرض الملف الطبي',
                  onPress: () => {
                    router.push(`/emergency/${extractedToken}` as any);
                    setScanned(false);
                  },
                },
                { text: 'إلغاء', style: 'cancel', onPress: () => setScanned(false) },
              ],
            );
          } else {
            Alert.alert('خطأ', 'تعذر التحقق من الرمز.', [{ text: 'حسناً', onPress: () => setScanned(false) }]);
          }
        } catch (err: any) {
          setProcessing(false);
          const msg = err.response?.data?.message || 'الرمز غير صالح أو انتهت صلاحيته.';
          Alert.alert('رمز منتهي الصلاحية', msg, [{ text: 'إعادة المحاولة', onPress: () => setScanned(false) }]);
        }
        return;
      }

      // Format 3: plain patient ObjectId (24 hex chars)
      const isObjectId = /^[a-fA-F0-9]{24}$/.test(data.trim());
      if (isObjectId) {
        setProcessing(false);
        Alert.alert(
          'تم التعرف على المريض',
          'فتح الملف الطبي؟',
          [
            {
              text: 'فتح',
              onPress: () => {
                router.push(`/emergency/${data.trim()}` as any);
                setScanned(false);
              },
            },
            { text: 'إلغاء', style: 'cancel', onPress: () => setScanned(false) },
          ],
        );
        return;
      }

      // Unknown format
      setProcessing(false);
      Alert.alert(
        'رمز غير معروف',
        'هذا الرمز لا ينتمي لنظام MedCore.',
        [{ text: 'إعادة المحاولة', onPress: () => setScanned(false) }],
      );
    } catch {
      setProcessing(false);
      Alert.alert('خطأ', 'حدث خطأ أثناء معالجة الرمز.', [{ text: 'إعادة المحاولة', onPress: () => setScanned(false) }]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={{ flex: 1 }}>
          {/* Header overlay */}
          <SafeAreaView edges={['top']}>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{ width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => router.back()}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 18 }}>مسح كود المريض</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>وجّه الكاميرا نحو رمز QR</Text>
              </View>
            </View>
          </SafeAreaView>

          {/* Scanner frame */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]}  />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.botLeft]}  />
              <View style={[styles.corner, styles.botRight]} />
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 24, textAlign: 'center', paddingHorizontal: 32 }}>
              ضع رمز QR الخاص بالمريض داخل الإطار
            </Text>
            {processing && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: 'white', marginLeft: 8, fontSize: 14 }}>جاري التحقق...</Text>
              </View>
            )}
          </View>

          {/* Bottom status */}
          <View style={{ paddingBottom: 48, alignItems: 'center' }}>
            {scanned && !processing ? (
              <TouchableOpacity
                style={{ backgroundColor: 'white', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 }}
                onPress={() => setScanned(false)}
              >
                <Text style={{ color: '#0284c7', fontWeight: '700', fontSize: 16 }}>مسح مرة أخرى</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0ea5e9', marginLeft: 8 }} />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' }}>جاهز للمسح</Text>
              </View>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const FRAME = 240;
const CORNER = 28;
const THICKNESS = 3;
const ACCENT = '#0ea5e9';

const styles = StyleSheet.create({
  scanFrame: {
    width: FRAME, height: FRAME, position: 'relative',
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER, borderColor: ACCENT,
  },
  topLeft:  { top: 0,    left: 0,  borderTopWidth: THICKNESS,    borderLeftWidth: THICKNESS,  borderTopLeftRadius: 8 },
  topRight: { top: 0,    right: 0, borderTopWidth: THICKNESS,    borderRightWidth: THICKNESS, borderTopRightRadius: 8 },
  botLeft:  { bottom: 0, left: 0,  borderBottomWidth: THICKNESS, borderLeftWidth: THICKNESS,  borderBottomLeftRadius: 8 },
  botRight: { bottom: 0, right: 0, borderBottomWidth: THICKNESS, borderRightWidth: THICKNESS, borderBottomRightRadius: 8 },
});
