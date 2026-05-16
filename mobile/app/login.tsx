import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getHomeRoute } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [loginType, setLoginType] = useState<'individual' | 'organization'>('individual');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [healthRegNumber, setHealthRegNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) { setError('يرجى إدخال البريد الإلكتروني.'); return; }
    if (loginType === 'individual' && !nationalId.trim()) { setError('يرجى إدخال الرقم القومي.'); return; }
    if (loginType === 'organization' && !healthRegNumber.trim()) { setError('يرجى إدخال رقم التسجيل الصحي.'); return; }

    try {
      setIsSubmitting(true);
      const data = await login(
        email.trim(),
        loginType === 'individual' ? nationalId.trim() : null,
        loginType,
        loginType === 'organization' ? healthRegNumber.trim() : undefined,
      );
      router.replace(getHomeRoute(data?.user?.role) as any);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'فشل تسجيل الدخول. تحقق من بياناتك وحاول مجدداً.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeSwitch = (t: 'individual' | 'organization') => {
    setLoginType(t);
    setError('');
    setNationalId('');
    setHealthRegNumber('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0284c7' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={{ backgroundColor: '#0284c7', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 64, alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: 'white' }}>MC</Text>
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 }}>MedCore</Text>
            <Text style={{ color: '#bae6fd', fontSize: 14, fontWeight: '600', letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' }}>
              UMR System
            </Text>
            <Text style={{ color: '#7dd3fc', fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
              سجلاتك الطبية الموحدة{'\n'}في متناول يدك
            </Text>
          </View>

          {/* Form Card */}
          <View style={{ flex: 1, backgroundColor: '#f8fafc', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e293b', textAlign: 'right', marginBottom: 24 }}>
              تسجيل الدخول
            </Text>

            {/* Login type toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 16, padding: 4, marginBottom: 24 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: loginType === 'individual' ? 'white' : 'transparent', elevation: loginType === 'individual' ? 2 : 0 }}
                onPress={() => handleTypeSwitch('individual')}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: loginType === 'individual' ? '#0284c7' : '#94a3b8' }}>
                  فرد (مريض / طبيب)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: loginType === 'organization' ? 'white' : 'transparent', elevation: loginType === 'organization' ? 2 : 0 }}
                onPress={() => handleTypeSwitch('organization')}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: loginType === 'organization' ? '#0284c7' : '#94a3b8' }}>
                  مؤسسة / إدارة
                </Text>
              </TouchableOpacity>
            </View>

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'right' }}>
                البريد الإلكتروني
              </Text>
              <TextInput
                style={{ width: '100%', backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, textAlign: 'right', color: '#1e293b', fontSize: 16 }}
                placeholder="example@email.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                onFocus={() => scrollRef.current?.scrollTo({ y: 200, animated: true })}
              />
            </View>

            {/* Individual: national ID */}
            {loginType === 'individual' && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'right' }}>
                  الرقم القومي
                </Text>
                <TextInput
                  style={{ width: '100%', backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, textAlign: 'right', color: '#1e293b', fontSize: 16 }}
                  placeholder="أدخل الرقم القومي (14 رقم)"
                  placeholderTextColor="#94a3b8"
                  value={nationalId}
                  onChangeText={(v) => { setNationalId(v); setError(''); }}
                  keyboardType="number-pad"
                  maxLength={14}
                  secureTextEntry
                  editable={!isSubmitting}
                  onFocus={() => scrollRef.current?.scrollTo({ y: 280, animated: true })}
                />
              </View>
            )}

            {/* Organization: health reg number */}
            {loginType === 'organization' && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, textAlign: 'right' }}>
                  رقم التسجيل الصحي
                </Text>
                <TextInput
                  style={{ width: '100%', backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, textAlign: 'right', color: '#1e293b', fontSize: 16 }}
                  placeholder="أدخل رقم التسجيل الصحي"
                  placeholderTextColor="#94a3b8"
                  value={healthRegNumber}
                  onChangeText={(v) => { setHealthRegNumber(v); setError(''); }}
                  editable={!isSubmitting}
                  onFocus={() => scrollRef.current?.scrollTo({ y: 280, animated: true })}
                />
              </View>
            )}

            {/* Error */}
            {!!error && (
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 }}>
                <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '700', textAlign: 'right', lineHeight: 20 }}>{error}</Text>
              </View>
            )}

            {/* Login button */}
            <TouchableOpacity
              style={{ width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isSubmitting ? '#38bdf8' : '#0284c7' }}
              onPress={handleLogin}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>جاري الدخول...</Text>
                </View>
              ) : (
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>دخول</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
              <Text style={{ color: '#94a3b8', fontSize: 12, marginHorizontal: 12 }}>أو</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
            </View>

            {/* Create account */}
            <TouchableOpacity
              style={{ width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
              onPress={() => router.push('/register' as any)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="person-add-outline" size={18} color="#0284c7" />
                <Text style={{ color: '#0284c7', fontWeight: '900', fontSize: 16, marginRight: 8 }}>إنشاء حساب جديد</Text>
              </View>
            </TouchableOpacity>

            <View style={{ marginTop: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2dd4bf', marginHorizontal: 8 }} />
              <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                بياناتك محمية ومشفرة وفق أعلى المعايير الطبية
              </Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2dd4bf', marginHorizontal: 8 }} />
            </View>

            <Text style={{ textAlign: 'center', fontSize: 12, color: '#cbd5e1', marginTop: 24 }}>
              © {new Date().getFullYear()} MedCore — UMR System
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
