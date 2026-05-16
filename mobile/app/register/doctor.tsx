import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

const GENDERS = [{ label: 'ذكر', value: 'male' }, { label: 'أنثى', value: 'female' }];
const SPECIALTIES = ['طب عام', 'جراحة عامة', 'أطفال', 'نساء وولادة', 'قلب وأوعية', 'أعصاب', 'عيون', 'أسنان', 'جلدية', 'نفسية', 'عظام وعمود فقري', 'باطنة', 'أنف وأذن وحنجرة', 'أورام', 'مسالك بولية', 'تخدير'];

const si = { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, textAlign: 'right' as const, color: '#1e293b', fontSize: 16 };
const sl = { fontSize: 11, fontWeight: '700' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, textAlign: 'right' as const };

export default function RegisterDoctor() {
  const [form, setForm] = useState({ fullName: '', nationalId: '', email: '', phoneNumber: '', gender: '', syndicateNumber: '', specialty: '' });
  const [syndicateImage, setSyndicateImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('صلاحية مطلوبة', 'نحتاج إلى الوصول لمعرض الصور لرفع صورة بطاقة النقابة.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSyndicateImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('صلاحية مطلوبة', 'نحتاج إلى الوصول للكاميرا لتصوير بطاقة النقابة.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSyndicateImage(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.nationalId || !form.email || !form.phoneNumber || !form.gender || !form.syndicateNumber || !form.specialty) {
      Alert.alert('بيانات ناقصة', 'يرجى ملء جميع الحقول الإلزامية.');
      return;
    }
    if (!/^\d{14}$/.test(form.nationalId.trim())) {
      Alert.alert('رقم قومي غير صالح', 'الرقم القومي يجب أن يتكون من 14 رقماً.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      Alert.alert('بريد غير صالح', 'صيغة البريد الإلكتروني غير صحيحة.');
      return;
    }
    if (!/^01[0125]\d{8}$/.test(form.phoneNumber.trim())) {
      Alert.alert('هاتف غير صالح', 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقماً.');
      return;
    }
    if (!/^\d{4,10}$/.test(form.syndicateNumber.trim())) {
      Alert.alert('رقم نقابة غير صالح', 'رقم العضوية يجب أن يتكون من 4 إلى 10 أرقام.');
      return;
    }
    // Backend requires the syndicate ID image — was previously optional on
    // the client which produced a confusing "صورة بطاقة النقابة مطلوبة" 400.
    if (!syndicateImage) {
      Alert.alert('صورة النقابة مطلوبة', 'يرجى تصوير أو اختيار صورة بطاقة النقابة لإتمام التسجيل.');
      return;
    }

    try {
      setIsLoading(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const uri = syndicateImage.uri;
      const name = uri.split('/').pop() || 'syndicate_card.jpg';
      const type = syndicateImage.mimeType || 'image/jpeg';
      fd.append('syndicateId', { uri, name, type } as any);

      await api.post('/auth/register/doctor', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('تم التسجيل ✓', 'تم إرسال طلبك. سيتم مراجعته من قِبل الإدارة.', [{ text: 'حسناً', onPress: () => router.replace('/login') }]);
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'فشل التسجيل. حاول مجدداً.');
    } finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0d9488" />
      <View style={{ backgroundColor: '#0d9488', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 8 }}><Ionicons name="arrow-back" size={20} color="white" /></TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '900' }}>تسجيل طبيب</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 16 }}><Text style={sl}>الاسم الكامل *</Text><TextInput style={si} placeholder="د. محمد أحمد" placeholderTextColor="#94a3b8" value={form.fullName} onChangeText={set('fullName')} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>الرقم القومي *</Text><TextInput style={si} placeholder="14 رقم" placeholderTextColor="#94a3b8" value={form.nationalId} onChangeText={set('nationalId')} keyboardType="number-pad" maxLength={14} textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>البريد الإلكتروني *</Text><TextInput style={si} placeholder="doctor@email.com" placeholderTextColor="#94a3b8" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" textAlign="right" /></View>
        <View style={{ marginBottom: 16 }}><Text style={sl}>رقم الهاتف *</Text><TextInput style={si} placeholder="01xxxxxxxxx" placeholderTextColor="#94a3b8" value={form.phoneNumber} onChangeText={set('phoneNumber')} keyboardType="phone-pad" textAlign="right" /></View>

        <View style={{ marginBottom: 16 }}>
          <Text style={sl}>الجنس *</Text>
          <View style={{ flexDirection: 'row' }}>
            {GENDERS.map((g, i) => (
              <TouchableOpacity key={g.value} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 2, marginLeft: i === 0 ? 6 : 0, borderColor: form.gender === g.value ? '#0d9488' : '#e2e8f0', backgroundColor: form.gender === g.value ? '#ccfbf1' : 'white' }} onPress={() => set('gender')(g.value)}>
                <Text style={{ fontWeight: 'bold', color: form.gender === g.value ? '#0d9488' : '#64748b' }}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}><Text style={sl}>رقم النقابة *</Text><TextInput style={si} placeholder="رقم نقابة الأطباء" placeholderTextColor="#94a3b8" value={form.syndicateNumber} onChangeText={set('syndicateNumber')} keyboardType="numeric" textAlign="right" /></View>

        <View style={{ marginBottom: 16 }}>
          <Text style={sl}>التخصص *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {SPECIALTIES.map(sp => (
              <TouchableOpacity key={sp} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 2, marginRight: 6, marginBottom: 8, borderColor: form.specialty === sp ? '#0d9488' : '#e2e8f0', backgroundColor: form.specialty === sp ? '#ccfbf1' : 'white' }} onPress={() => set('specialty')(sp)}>
                <Text style={{ fontWeight: '600', fontSize: 13, color: form.specialty === sp ? '#0d9488' : '#64748b' }}>{sp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={sl}>صورة بطاقة النقابة *</Text>
          {syndicateImage ? (
            <View style={{ alignItems: 'center' }}>
              <Image source={{ uri: syndicateImage.uri }} style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 8 }} resizeMode="cover" />
              <TouchableOpacity onPress={() => setSyndicateImage(null)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                <Ionicons name="trash-outline" size={16} color="#dc2626" style={{ marginLeft: 4 }} />
                <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 13 }}>إزالة الصورة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={pickImage} style={{ flex: 1, backgroundColor: '#ccfbf1', borderWidth: 2, borderColor: '#99f6e4', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderStyle: 'dashed' }}>
                <Ionicons name="images-outline" size={24} color="#0d9488" />
                <Text style={{ color: '#0d9488', fontWeight: 'bold', fontSize: 13, marginTop: 6 }}>من المعرض</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} style={{ flex: 1, backgroundColor: '#ccfbf1', borderWidth: 2, borderColor: '#99f6e4', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderStyle: 'dashed' }}>
                <Ionicons name="camera-outline" size={24} color="#0d9488" />
                <Text style={{ color: '#0d9488', fontWeight: 'bold', fontSize: 13, marginTop: 6 }}>التقاط صورة</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={{ backgroundColor: isLoading ? '#2dd4bf' : '#0d9488', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 40 }} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <View style={{ flexDirection: 'row', alignItems: 'center' }}><ActivityIndicator color="#fff" size="small" /><Text style={{ color: 'white', fontWeight: '900', fontSize: 16, marginRight: 8 }}>جاري التسجيل...</Text></View> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>إرسال طلب التسجيل</Text>}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
