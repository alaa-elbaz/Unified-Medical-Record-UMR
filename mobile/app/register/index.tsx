import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ROLES = [
  { id: 'patient',  label: 'مريض',    sub: 'تسجيل ملفك الطبي الشخصي', icon: 'person-outline',   color: '#0284c7', bg: '#e0f2fe' },
  { id: 'doctor',   label: 'طبيب',    sub: 'سجّل كطبيب معتمد',         icon: 'medkit-outline',   color: '#0d9488', bg: '#ccfbf1' },
  { id: 'hospital', label: 'مستشفى', sub: 'أضف مؤسستك الصحية',         icon: 'business-outline', color: '#7c3aed', bg: '#ede9fe' },
  { id: 'lab',      label: 'مختبر',   sub: 'سجّل مختبرك الطبي',        icon: 'flask-outline',    color: '#d97706', bg: '#fef3c7' },
  { id: 'pharmacy', label: 'صيدلية', sub: 'سجّل صيدليتك',              icon: 'bandage-outline',  color: '#dc2626', bg: '#fee2e2' },
] as const;

export default function RegisterIndex() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#0284c7', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 56, alignItems: 'center' }}>
          <TouchableOpacity
            style={{ alignSelf: 'flex-start', marginBottom: 24, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, marginRight: 4 }}>رجوع</Text>
          </TouchableOpacity>
          <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: 'white' }}>MC</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: 'white' }}>إنشاء حساب جديد</Text>
          <Text style={{ color: '#bae6fd', fontSize: 14, marginTop: 8, textAlign: 'center' }}>اختر نوع حسابك للمتابعة</Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -24 }}>
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={{
                backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 12,
                shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06,
                shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              }}
              onPress={() => router.push(`/register/${role.id}` as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color="#cbd5e1" />
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                <View style={{ alignItems: 'flex-end', marginRight: 16, flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>{role.label}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{role.sub}</Text>
                </View>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: role.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={role.icon} size={24} color={role.color} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => router.replace('/login')}>
          <Text style={{ color: '#94a3b8', fontSize: 14 }}>
            لديك حساب؟ <Text style={{ color: '#0284c7', fontWeight: 'bold' }}>سجّل الدخول</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
