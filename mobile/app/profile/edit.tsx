/**
 * profile/edit.tsx — Edit Profile Screen
 * Allows users to update their profile information.
 *
 * API:
 *   PUT /auth/profile → sends only changed fields
 *
 * Auth:
 *   useAuth() provides `user` (current data) and `refreshUserData()` (re-fetch after save)
 */

import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, Alert, StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const GENDERS = [
  { value: 'male', label: 'ذكر' },
  { value: 'female', label: 'أنثى' },
];

export default function EditProfileScreen() {
  const { user, refreshUserData } = useAuth();
  const isPatient = user?.role === 'patient';
  const isDoctor  = user?.role === 'doctor';

  // ── Form state (pre-populated from user) ──────────────────────────────────
  const [fullName, setFullName]             = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber]       = useState(user?.phoneNumber || '');
  const [address, setAddress]               = useState(user?.address || '');
  const [city, setCity]                     = useState(user?.city || '');

  // Doctor-only fields
  const [specialty, setSpecialty]           = useState((user as any)?.specialty || '');

  // Patient-only fields
  const [bloodType, setBloodType]           = useState(user?.bloodType || '');
  const [allergies, setAllergies]           = useState(
    user?.allergies?.length ? user.allergies.join('، ') : '',
  );
  const [chronicDiseases, setChronicDiseases] = useState(
    user?.chronicDiseases?.length ? user.chronicDiseases.join('، ') : '',
  );
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');
  const [dateOfBirth, setDateOfBirth]       = useState<Date | null>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : null,
  );
  const [showDobPicker, setShowDobPicker]   = useState(false);

  const handleDobChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowDobPicker(Platform.OS === 'ios');
    if (d) setDateOfBirth(d);
  };

  const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtAr  = (d: Date) => d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'});
  const [gender, setGender]                 = useState(user?.gender || '');
  const [mothersName, setMothersName]       = useState(user?.mothersName || '');

  const [isSubmitting, setIsSubmitting]     = useState(false);

  // ── Initial snapshot for diffing ──────────────────────────────────────────
  const initial = useMemo(() => ({
    fullName:         user?.fullName || '',
    phoneNumber:      user?.phoneNumber || '',
    address:          user?.address || '',
    city:             user?.city || '',
    specialty:        (user as any)?.specialty || '',
    bloodType:        user?.bloodType || '',
    allergies:        user?.allergies?.length ? user.allergies.join('، ') : '',
    chronicDiseases:  user?.chronicDiseases?.length ? user.chronicDiseases.join('، ') : '',
    emergencyContact: user?.emergencyContact || '',
    dateOfBirth:      user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : null,
    gender:           user?.gender || '',
    mothersName:      user?.mothersName || '',
  }), []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helper: split comma-separated Arabic/English text into trimmed array ──
  const splitList = (text: string): string[] =>
    text
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('خطأ', 'الاسم الكامل مطلوب');
      return;
    }

    // Date picker ensures valid format — no manual validation needed

    // Build payload with only changed fields
    const payload: Record<string, any> = {};

    if (fullName.trim()    !== initial.fullName)    payload.fullName    = fullName.trim();
    if (phoneNumber.trim() !== initial.phoneNumber) payload.phoneNumber = phoneNumber.trim();
    if (address.trim()     !== initial.address)     payload.address     = address.trim();
    if (city.trim()        !== initial.city)        payload.city        = city.trim();

    if (isDoctor) {
      if (specialty.trim() !== initial.specialty) payload.specialty = specialty.trim();
    }

    if (isPatient) {
      if (bloodType         !== initial.bloodType)        payload.bloodType        = bloodType;
      if (emergencyContact.trim() !== initial.emergencyContact) payload.emergencyContact = emergencyContact.trim();
      const dobStr = dateOfBirth ? fmtISO(dateOfBirth) : '';
      if (dobStr !== (initial.dateOfBirth || ''))           payload.dateOfBirth      = dobStr;
      if (gender             !== initial.gender)           payload.gender           = gender;
      if (mothersName.trim() !== initial.mothersName)      payload.mothersName      = mothersName.trim();

      if (allergies !== initial.allergies) {
        payload.allergies = splitList(allergies);
      }
      if (chronicDiseases !== initial.chronicDiseases) {
        payload.chronicDiseases = splitList(chronicDiseases);
      }
    }

    if (Object.keys(payload).length === 0) {
      Alert.alert('تنبيه', 'لم يتم تغيير أي بيانات');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.put('/auth/profile', payload);
      await refreshUserData();
      Alert.alert('تم الحفظ ✓', 'تم تحديث بيانات الملف الشخصي بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'تعذر حفظ التعديلات');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      {/* Header */}
      <View style={{
        backgroundColor: '#0284c7', paddingHorizontal: 16,
        paddingTop: 14, paddingBottom: 22,
        flexDirection: 'row', alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ color: '#bae6fd', fontSize: 11, fontWeight: '600' }}>الإعدادات</Text>
          <Text style={{ color: 'white', fontSize: 17, fontWeight: '900' }}>تعديل الملف الشخصي</Text>
        </View>
        <View style={{
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="person" size={20} color="white" />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── General Information ─────────────────────────────────── */}
          <View style={{
            backgroundColor: 'white', borderRadius: 20, padding: 16,
            marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9',
          }}>
            <Text style={{
              color: '#94a3b8', fontSize: 12, fontWeight: '700',
              textAlign: 'right', marginBottom: 14,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              المعلومات الأساسية
            </Text>

            <FormField label="الاسم الكامل" icon="person-outline">
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="أدخل الاسم الكامل"
                placeholderTextColor="#94a3b8"
                textAlign="right"
                style={styles.input}
              />
            </FormField>

            <FormField label="رقم الهاتف" icon="call-outline">
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="مثال: 01012345678"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                textAlign="right"
                style={styles.input}
              />
            </FormField>

            <FormField label="العنوان" icon="location-outline">
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="أدخل العنوان"
                placeholderTextColor="#94a3b8"
                textAlign="right"
                style={styles.input}
              />
            </FormField>

            <FormField label="المدينة" icon="business-outline">
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="أدخل المدينة"
                placeholderTextColor="#94a3b8"
                textAlign="right"
                style={styles.input}
              />
            </FormField>

            {/* Doctor-only: Specialty */}
            {isDoctor && (
              <FormField label="التخصص الطبي" icon="medical-outline">
                <TextInput
                  value={specialty}
                  onChangeText={setSpecialty}
                  placeholder="مثال: طب باطني، جراحة عامة"
                  placeholderTextColor="#94a3b8"
                  textAlign="right"
                  style={styles.input}
                />
              </FormField>
            )}
          </View>

          {/* ── Patient-only: Medical Information ──────────────────── */}
          {isPatient && (
            <View style={{
              backgroundColor: 'white', borderRadius: 20, padding: 16,
              marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9',
            }}>
              <Text style={{
                color: '#94a3b8', fontSize: 12, fontWeight: '700',
                textAlign: 'right', marginBottom: 14,
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                المعلومات الطبية
              </Text>

              {/* Blood Type Picker */}
              <FormField label="فصيلة الدم" icon="water-outline">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {BLOOD_TYPES.map((bt) => (
                      <TouchableOpacity
                        key={bt}
                        onPress={() => setBloodType(bt)}
                        style={{
                          paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                          backgroundColor: bloodType === bt ? '#0284c7' : '#f8fafc',
                          borderWidth: 1,
                          borderColor: bloodType === bt ? '#0284c7' : '#e2e8f0',
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{
                          fontWeight: '800', fontSize: 14,
                          color: bloodType === bt ? 'white' : '#64748b',
                        }}>
                          {bt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </FormField>

              {/* Gender Picker */}
              <FormField label="الجنس" icon="male-female-outline">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.value}
                      onPress={() => setGender(g.value)}
                      style={{
                        flex: 1, paddingVertical: 12, borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: gender === g.value ? '#0284c7' : '#f8fafc',
                        borderWidth: 1,
                        borderColor: gender === g.value ? '#0284c7' : '#e2e8f0',
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{
                        fontWeight: '700', fontSize: 14,
                        color: gender === g.value ? 'white' : '#64748b',
                      }}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="تاريخ الميلاد" icon="calendar-outline">
                <TouchableOpacity onPress={() => setShowDobPicker(true)} activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
                  }}>
                  <Ionicons name="calendar-outline" size={20} color={dateOfBirth ? '#0284c7' : '#94a3b8'} />
                  <Text style={{flex:1,textAlign:'right',fontSize:15,color:dateOfBirth?'#1e293b':'#94a3b8',fontWeight:dateOfBirth?'700':'400',marginRight:8}}>
                    {dateOfBirth ? fmtAr(dateOfBirth) : 'اضغط لاختيار تاريخ الميلاد'}
                  </Text>
                </TouchableOpacity>
                {showDobPicker && (
                  <DateTimePicker value={dateOfBirth || new Date(2000, 0, 1)} mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()} onChange={handleDobChange} />
                )}
              </FormField>

              <FormField label="اسم الأم" icon="heart-outline">
                <TextInput
                  value={mothersName}
                  onChangeText={setMothersName}
                  placeholder="أدخل اسم الأم"
                  placeholderTextColor="#94a3b8"
                  textAlign="right"
                  style={styles.input}
                />
              </FormField>

              <FormField label="رقم طوارئ" icon="alert-circle-outline">
                <TextInput
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  placeholder="رقم هاتف للطوارئ"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  textAlign="right"
                  style={styles.input}
                />
              </FormField>

              <FormField label="الحساسيات" icon="warning-outline" hint="افصل بفاصلة">
                <TextInput
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="مثال: بنسلين، مكسرات"
                  placeholderTextColor="#94a3b8"
                  textAlign="right"
                  multiline
                  style={[styles.input, { minHeight: 48, textAlignVertical: 'top' }]}
                />
              </FormField>

              <FormField label="الأمراض المزمنة" icon="fitness-outline" hint="افصل بفاصلة">
                <TextInput
                  value={chronicDiseases}
                  onChangeText={setChronicDiseases}
                  placeholder="مثال: سكري، ضغط"
                  placeholderTextColor="#94a3b8"
                  textAlign="right"
                  multiline
                  style={[styles.input, { minHeight: 48, textAlignVertical: 'top' }]}
                />
              </FormField>
            </View>
          )}

          {/* ── Submit ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={{
              backgroundColor: isSubmitting ? '#93c5fd' : '#0284c7',
              borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', elevation: 2,
            }}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginLeft: 10 }}>
                  جاري الحفظ...
                </Text>
              </View>
            ) : (
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>حفظ التعديلات</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FormField({
  label, icon, hint, children,
}: {
  label: string;
  icon: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 6,
      }}>
        {hint ? (
          <Text style={{ color: '#94a3b8', fontSize: 11 }}>{hint}</Text>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700', marginRight: 6 }}>
            {label}
          </Text>
          <Ionicons name={icon as any} size={16} color="#94a3b8" />
        </View>
      </View>
      {children}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1e293b',
  },
} as const;
