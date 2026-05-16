/**
 * records/self-report.tsx — Patient self-reports a medical event.
 * Mirrors web's PatientPage self-report modal:
 *   - free-text diagnosis + notes
 *   - optional file (image/PDF)
 *   - optional visit date (date picker)
 *   - "تنقيح الصياغة" AI format button (POST /ai/format-record)
 *   - submit POST /records/self-report (multipart)
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

export default function SelfReportScreen() {
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes]         = useState('');
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [file, setFile]           = useState<PickedFile | null>(null);
  const [aiProcessed, setAiProcessed] = useState<any>(null);
  const [aiBusy, setAiBusy]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDateChange = (_e: DateTimePickerEvent, d?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (d) setVisitDate(d);
  };

  const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtAr  = (d: Date) => d.toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'});

  const handleAiFormat = async () => {
    if (!diagnosis.trim()) { toast.warn('أدخل التشخيص أولاً'); return; }
    setAiBusy(true);
    try {
      const { data } = await api.post('/ai/format-record', { rawText: diagnosis });
      const result = data?.data;
      if (result?.structuredText) {
        setDiagnosis(result.structuredText);
        setAiProcessed(result);
        toast.success('تم تنقيح الصياغة');
      } else { toast.error('تعذر تنقيح النص'); }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل الذكاء الاصطناعي');
    } finally { setAiBusy(false); }
  };

  const handlePick = async () => { const f = await pickFile({types:['image','camera','pdf']}); if(f) setFile(f); };

  const handleSubmit = async () => {
    if (!diagnosis.trim()) { toast.warn('التشخيص مطلوب'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('diagnosis', diagnosis.trim());
      if (notes.trim())     fd.append('notes', notes.trim());
      if (visitDate)        fd.append('visitDate', fmtISO(visitDate));
      if (file)             appendFile(fd, 'file', file);
      if (aiProcessed)      fd.append('aiProcessed', JSON.stringify(aiProcessed));
      await api.post('/records/self-report', fd);
      toast.success('تم حفظ التقرير الذاتي');
      router.back();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الحفظ');
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:'#f8fafc'}} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0284c7" />
      <View style={S.header}>
        <TouchableOpacity onPress={()=>router.back()} style={S.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={{flex:1,alignItems:'flex-end',marginRight:12}}>
          <Text style={{color:'#bae6fd',fontSize:11,fontWeight:'600'}}>سجل طبي</Text>
          <Text style={{color:'white',fontSize:17,fontWeight:'900'}}>تقرير ذاتي</Text>
        </View>
        <View style={S.headerIcon}><Ionicons name="document-text" size={20} color="white" /></View>
      </View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={{padding:16,paddingBottom:48}} keyboardShouldPersistTaps="handled">

          <View style={S.card}>
            <View style={S.fieldHeaderRow}>
              <TouchableOpacity onPress={handleAiFormat} disabled={aiBusy} style={S.aiBtn}>
                {aiBusy ? <ActivityIndicator size="small" color="#7c3aed" />
                        : <Ionicons name="sparkles" size={14} color="#7c3aed" />}
                <Text style={{color:'#7c3aed',fontWeight:'800',fontSize:12,marginLeft:4}}>
                  تنقيح الصياغة AI
                </Text>
              </TouchableOpacity>
              <Text style={S.label}>التشخيص / الوصف *</Text>
            </View>
            <TextInput value={diagnosis}
              onChangeText={(t)=>{setDiagnosis(t);setAiProcessed(null);}}
              placeholder="اكتب وصفًا مفصلاً للحالة" placeholderTextColor="#94a3b8"
              textAlign="right" multiline
              style={[S.input,{minHeight:110,textAlignVertical:'top'}]} />
          </View>

          <View style={S.card}>
            <Text style={S.label}>ملاحظات إضافية</Text>
            <TextInput value={notes} onChangeText={setNotes}
              placeholder="أي تفاصيل أخرى" placeholderTextColor="#94a3b8"
              textAlign="right" multiline
              style={[S.input,{minHeight:80,textAlignVertical:'top'}]} />
          </View>

          <View style={S.card}>
            <Text style={S.label}>تاريخ الزيارة</Text>
            <TouchableOpacity onPress={()=>setShowDatePicker(true)} style={S.dateBtn} activeOpacity={0.7}>
              <Ionicons name="calendar-outline" size={20} color={visitDate?'#0284c7':'#94a3b8'} />
              <Text style={{flex:1,textAlign:'right',fontSize:14,color:visitDate?'#1e293b':'#94a3b8',fontWeight:visitDate?'700':'400',marginRight:8}}>
                {visitDate ? fmtAr(visitDate) : 'اضغط لاختيار التاريخ'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={visitDate||new Date()} mode="date"
                display={Platform.OS==='ios'?'spinner':'default'}
                maximumDate={new Date()} onChange={handleDateChange} />
            )}
          </View>

          <View style={S.card}>
            <Text style={S.label}>ملف مرفق (اختياري)</Text>
            <TouchableOpacity onPress={handlePick} style={S.pickBtn}>
              <Ionicons name={file?'checkmark-circle':'cloud-upload-outline'} size={20} color={file?'#16a34a':'#0284c7'} />
              <Text style={{color:file?'#16a34a':'#0284c7',fontWeight:'700',marginRight:8}}>
                {file ? file.name : 'اضغط لاختيار ملف / صورة'}
              </Text>
            </TouchableOpacity>
            {file && (
              <TouchableOpacity onPress={()=>setFile(null)} style={{marginTop:8,alignSelf:'flex-end'}}>
                <Text style={{color:'#dc2626',fontSize:12}}>إزالة</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={S.submitBtn(submitting)}>
            {submitting
              ? <ActivityIndicator color="white" />
              : <Text style={{color:'white',fontWeight:'900',fontSize:16}}>حفظ التقرير</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = {
  header: {backgroundColor:'#0284c7',paddingHorizontal:16,paddingTop:14,paddingBottom:22,flexDirection:'row' as const,alignItems:'center' as const},
  headerBtn: {backgroundColor:'rgba(255,255,255,0.2)',borderRadius:10,padding:8},
  headerIcon: {width:42,height:42,borderRadius:21,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center' as const,justifyContent:'center' as const},
  card: {backgroundColor:'white',borderRadius:16,padding:14,marginBottom:14,borderWidth:1,borderColor:'#f1f5f9'},
  fieldHeaderRow: {flexDirection:'row' as const,justifyContent:'space-between' as const,alignItems:'center' as const,marginBottom:8},
  label: {color:'#475569',fontSize:13,fontWeight:'700' as const,textAlign:'right' as const,marginBottom:8},
  input: {backgroundColor:'#f8fafc',borderWidth:1,borderColor:'#e2e8f0',borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:'#1e293b'},
  dateBtn: {flexDirection:'row' as const,alignItems:'center' as const,backgroundColor:'#f8fafc',borderWidth:1,borderColor:'#e2e8f0',borderRadius:12,paddingHorizontal:14,paddingVertical:14},
  aiBtn: {flexDirection:'row' as const,alignItems:'center' as const,backgroundColor:'#ede9fe',paddingHorizontal:10,paddingVertical:6,borderRadius:10},
  pickBtn: {flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'center' as const,backgroundColor:'#eff6ff',borderRadius:12,paddingVertical:14,borderWidth:1,borderColor:'#bfdbfe'},
  submitBtn: (busy: boolean) => ({backgroundColor:busy?'#93c5fd':'#0284c7',borderRadius:16,paddingVertical:16,alignItems:'center' as const,marginTop:8,elevation:2}),
};
