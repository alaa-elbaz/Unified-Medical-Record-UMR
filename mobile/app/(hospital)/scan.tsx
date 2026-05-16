import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import api from '../../services/api';
import { toast } from '../../components/Toast';

export default function HospitalScanScreen() {
  const [mode, setMode] = useState<'scan'>('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleQrScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      if (data.includes('medcore://emergency/')) {
        const id = data.split('medcore://emergency/')[1];
        if (id) {
          router.replace(`/emergency/${id}` as any);
        } else {
          toast.error('رمز الطوارئ غير مكتمل');
        }
      } else {
        toast.error('رمز الطوارئ غير صالح');
      }
    } catch {
      toast.error('فشل التحقق من الرمز');
    } finally {
      setTimeout(() => setScanned(false), 1500);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <View style={{ backgroundColor: '#7c3aed', padding: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>ماسح الطوارئ</Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: 'black' }}>
        {!permission?.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Ionicons name="camera-outline" size={48} color="#cbd5e1" />
            <Text style={{ color: 'white', marginTop: 16, textAlign: 'center' }}>
              نحتاج صلاحية الكاميرا لمسح كود الطوارئ
            </Text>
            <TouchableOpacity onPress={requestPermission} style={{ backgroundColor: '#7c3aed', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 }}>
              <Text style={{ color: 'white', fontWeight: '700' }}>منح الصلاحية</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView style={StyleSheet.absoluteFillObject} facing="back" onBarcodeScanned={scanned ? undefined : handleQrScan}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 240, height: 240, borderWidth: 3, borderColor: '#7c3aed', borderRadius: 16 }} />
              <Text style={{ color: 'white', marginTop: 20, fontSize: 14 }}>
                وجّه الكاميرا نحو رمز الاستجابة السريعة للطوارئ
              </Text>
            </View>
          </CameraView>
        )}
      </View>
    </SafeAreaView>
  );
}
