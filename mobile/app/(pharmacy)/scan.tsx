/**
 * (pharmacy)/scan.tsx — Pharmacy patient lookup via QR or national-ID search.
 * Identified patient → navigate to /(pharmacy)/patient/[id]
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import api from '../../services/api';
import { toast } from '../../components/Toast';

export default function PharmacyScanScreen() {
  const [mode, setMode] = useState<'search' | 'scan'>('search');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return toast.warn('أدخل الرقم القومي أو الاسم');
    setSearching(true);
    try {
      const { data } = await api.get(`/patients?search=${encodeURIComponent(query.trim())}&limit=1`);
      const list = data?.data || data?.patients || [];
      if (list.length === 0) {
        toast.error('لم يتم العثور على المريض');
      } else {
        router.push(`/(pharmacy)/patient/${list[0]._id}` as any);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل البحث');
    } finally {
      setSearching(false);
    }
  };

  const handleQrScan = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      // Try JWT verify first (with support for deep link extraction)
      const tokenMatch = data.match(/token=([A-Za-z0-9_.-]+)/);
      const extractedToken = tokenMatch ? tokenMatch[1] : data.trim();

      if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(extractedToken)) {
        const res = await api.post('/patients/verify-qr', { token: extractedToken });
        const id = res.data?.data?.patient?._id || res.data?.data?._id;
        if (id) router.push(`/(pharmacy)/patient/${id}` as any);
        else toast.error('رمز غير صالح');
      } else {
        // Try direct ObjectId or deep link
        const m = data.match(/medcore:\/\/emergency\/([a-zA-Z0-9_-]+)/);
        const id = m?.[1] || (/^[a-fA-F0-9]{24}$/.test(data.trim()) ? data.trim() : null);
        if (id) router.push(`/(pharmacy)/patient/${id}` as any);
        else toast.error('رمز غير معروف');
      }
    } catch {
      toast.error('فشل التحقق من الرمز');
    } finally {
      setTimeout(() => setScanned(false), 1500);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <View style={{ backgroundColor: '#dc2626', padding: 16, paddingBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{
            backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12,
          }}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>تعريف المريض</Text>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 4 }}>
          <ModeBtn label="بحث بالرقم القومي" active={mode === 'search'} onPress={() => setMode('search')} />
          <ModeBtn label="مسح QR" active={mode === 'scan'} onPress={() => setMode('scan')} />
        </View>
      </View>

      {mode === 'search' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', marginBottom: 28, marginTop: 20 }}>
              <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="search" size={40} color="#dc2626" />
              </View>
              <Text style={{ color: '#1e293b', fontWeight: '900', fontSize: 17, marginTop: 16 }}>بحث عن مريض</Text>
              <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 6 }}>
                أدخل الرقم القومي أو اسم المريض
              </Text>
            </View>

            <TextInput
              value={query} onChangeText={setQuery}
              placeholder="14 رقم القومي أو الاسم"
              placeholderTextColor="#94a3b8"
              textAlign="right"
              style={{
                backgroundColor: 'white', borderRadius: 16, padding: 16, fontSize: 15,
                borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16,
              }}
              onSubmitEditing={handleSearch}
            />

            <TouchableOpacity onPress={handleSearch} disabled={searching}
              style={{
                backgroundColor: searching ? '#fca5a5' : '#dc2626',
                borderRadius: 16, paddingVertical: 16, alignItems: 'center',
              }}>
              {searching ? <ActivityIndicator color="white" />
                : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>بحث</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {mode === 'scan' && (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          {!permission?.granted ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
              <Ionicons name="camera-outline" size={48} color="#cbd5e1" />
              <Text style={{ color: 'white', marginTop: 16, textAlign: 'center' }}>
                نحتاج صلاحية الكاميرا لمسح كود QR
              </Text>
              <TouchableOpacity onPress={requestPermission} style={{
                backgroundColor: '#dc2626', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20,
              }}>
                <Text style={{ color: 'white', fontWeight: '700' }}>منح الصلاحية</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleQrScan}
            >
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 240, height: 240, borderWidth: 3, borderColor: '#dc2626', borderRadius: 16 }} />
                <Text style={{ color: 'white', marginTop: 20, fontSize: 14 }}>
                  وجّه الكاميرا نحو رمز QR
                </Text>
              </View>
            </CameraView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function ModeBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      flex: 1, paddingVertical: 10, borderRadius: 8,
      backgroundColor: active ? 'white' : 'transparent',
      alignItems: 'center',
    }}>
      <Text style={{ color: active ? '#dc2626' : 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 13 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
