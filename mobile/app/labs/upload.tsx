/**
 * labs/upload.tsx — Patient uploads a lab result manually.
 * POST /labs (multipart): testName, date, labFile
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { pickFile, appendFile, type PickedFile } from '../../components/FilePicker';
import { toast } from '../../components/Toast';

export default function LabUploadScreen() {
  const [testName, setTestName] = useState('');
  const [date, setDate]         = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [file, setFile]         = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const formatDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateAr = (d: Date) => {
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handlePick = async () => {
    const f = await pickFile({ types: ['image', 'camera', 'pdf'] });
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!testName.trim()) return toast.warn('اسم التحليل مطلوب');
    if (!file) return toast.warn('ارفع ملف النتيجة');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('testName', testName.trim());
      if (date) fd.append('date', formatDate(date));
      // Server uses `upload.array('labFiles', 10)` — field name must match
      // exactly (was 'labFile' singular which multer rejects as unexpected).
      appendFile(fd, 'labFiles', file);
      await api.post('/labs', fd);
      toast.success('تم رفع التحليل');
      router.back();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الرفع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0d9488" />

      <View style={[S.header, { backgroundColor: '#0d9488' }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#ccfbf1', fontSize: 11, fontWeight: '600' }}>رفع نتيجة</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>تحليل جديد</Text>
        </View>
        <View style={S.headerIcon}><Ionicons name="flask" size={20} color="white" /></View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">

          <View style={S.card}>
            <Text style={S.label}>اسم التحليل *</Text>
            <TextInput
              value={testName} onChangeText={setTestName}
              placeholder="مثال: صورة دم كاملة CBC"
              placeholderTextColor="#94a3b8" textAlign="right" style={S.input}
            />
          </View>

          <View style={S.card}>
            <Text style={S.label}>تاريخ التحليل</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={S.dateBtn} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={20} color={date ? '#0d9488' : '#94a3b8'} />
              <Text style={{ flex: 1, textAlign: 'right', fontSize: 14, color: date ? '#1e293b' : '#94a3b8', fontWeight: date ? '700' : '400', marginRight: 8 }}>
                {date ? formatDateAr(date) : 'اضغط لاختيار التاريخ'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>

          <View style={S.card}>
            <Text style={S.label}>ملف النتيجة *</Text>
            <TouchableOpacity onPress={handlePick} style={S.pickBtn}>
              <Ionicons name={file ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={file ? '#16a34a' : '#0d9488'} />
              <Text style={{ color: file ? '#16a34a' : '#0d9488', fontWeight: '700', marginRight: 8 }}>
                {file ? file.name : 'اضغط لاختيار ملف / صورة'}
              </Text>
            </TouchableOpacity>
            {file && (
              <TouchableOpacity onPress={() => setFile(null)} style={{ marginTop: 8, alignSelf: 'flex-end' }}>
                <Text style={{ color: '#dc2626', fontSize: 12 }}>إزالة</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[S.submitBtn, {
            backgroundColor: submitting ? '#5eead4' : '#0d9488',
          }]}>
            {submitting ? <ActivityIndicator color="white" />
              : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>رفع التحليل</Text>}
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
  dateBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  pickBtn: {
    flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    backgroundColor: '#f0fdfa', borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: '#99f6e4',
  },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' as const, marginTop: 8, elevation: 2 },
};
