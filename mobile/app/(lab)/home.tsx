import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, StatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';
import { useAuth, getDisplayName } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { pickFile, appendFile, type PickedFile } from '../../components/FilePicker';
import { openSecureDocument } from '../../components/DocumentViewer';
import { toast } from '../../components/Toast';
import type { Appointment, LabResult } from '../../types/api';

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  Pending:   { label: 'في انتظار السحب', bg: '#fef9c3', text: '#854d0e' },
  Processing:{ label: 'في انتظار النتيجة', bg: '#dbeafe', text: '#1e40af' },
  Completed: { label: 'مكتمل',        bg: '#dcfce7', text: '#166534' },
  Cancelled: { label: 'ملغى',         bg: '#fee2e2', text: '#991b1b' },
};

type Tab = 'overview' | 'new' | 'pending' | 'completed' | 'visits';

export default function LabHome() {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const stats = useMemo(() => {
    const total = labResults.length;
    const pending = labResults.filter(r => r.status === 'Pending' || r.status === 'Processing').length;
    const completed = labResults.filter(r => r.status === 'Completed').length;
    return { totalTestRequests: total, pendingRequests: pending, completedRequests: completed };
  }, [labResults]);

  const fetchAll = useCallback(async () => {
    try {
      const [rRes, aRes] = await Promise.allSettled([
        api.get('/labs'),
        api.get('/appointments')
      ]);
      if (rRes.status === 'fulfilled') setLabResults(rRes.value.data?.data || []);
      if (aRes.status === 'fulfilled') setAppointments(aRes.value.data?.data || []);
    } catch { /* silently fail */ }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = () => Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'خروج', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
  ]);

  const handleUpdateStatus = async (labId: string, status: string) => {
    try {
      await api.put(`/labs/${labId}/status`, { status });
      setLabResults(prev => prev.map(r => r._id === labId ? { ...r, status } : r));
      Alert.alert('تم التحديث', `تم تحديث الحالة إلى "${STATUS_MAP[status]?.label || status}"`);
    } catch { Alert.alert('خطأ', 'تعذّر تحديث الحالة.'); }
  };

  const handleAddResult = async (labId: string, resultDetails: string, file: PickedFile | null) => {
    try {
      // Use PUT /:id/status (the lab-result completion endpoint).
      // Backend contract:
      //   - status: 'pending_sample' | 'pending_result' | 'completed' (lowercase)
      //   - result: text body
      //   - labFiles: multer upload.array('labFiles', 10)
      // Calling PUT /:id directly would hit `updateLabResult` which requires
      // `testName` and rejects without it.
      let updated: LabResult | undefined;
      if (file) {
        const fd = new FormData();
        fd.append('result', resultDetails);
        fd.append('status', 'completed');
        appendFile(fd, 'labFiles', file);
        const { data } = await api.put(`/labs/${labId}/status`, fd);
        updated = data?.data;
      } else {
        const { data } = await api.put(`/labs/${labId}/status`, { result: resultDetails, status: 'completed' });
        updated = data?.data;
      }
      setLabResults(prev => prev.map(r => r._id === labId ? { ...r, ...(updated || { result: resultDetails, status: 'completed' }) } : r));
      toast.success('تم حفظ النتيجة');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر حفظ النتيجة');
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'new', label: 'الطلبات الجديدة' },
    { id: 'pending', label: 'نتائج معلقة' },
    { id: 'completed', label: 'مكتملة' },
    { id: 'visits', label: 'الزيارات' },
  ];

  const card = { backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', elevation: 1 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#d97706" />
      <View style={{ backgroundColor: '#d97706', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 8 }}>
            <Ionicons name="log-out-outline" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#fef3c7', fontSize: 12, fontWeight: '600' }}>مختبر طبي</Text>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '900' }} numberOfLines={1}>{getDisplayName(user)}</Text>
          </View>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flask" size={20} color="white" />
          </View>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: isDark ? '#0f172a' : 'white', borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#f1f5f9', maxHeight: 52 }} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)} style={{ paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: activeTab === t.id ? '#d97706' : 'transparent', marginRight: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: activeTab === t.id ? '#d97706' : (isDark ? '#cbd5e1' : '#94a3b8') }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#d97706" /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchAll(); }} colors={['#d97706']} />} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>

          {activeTab === 'overview' && (<>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              {[
                { label: 'إجمالي الطلبات', value: stats.totalTestRequests, color: '#d97706', bg: '#fef3c7', icon: 'document-text' },
                { label: 'قيد الانتظار',   value: stats.pendingRequests,   color: '#dc2626', bg: '#fee2e2', icon: 'time' },
                { label: 'مكتملة',         value: stats.completedRequests, color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 16, padding: 14, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', elevation: 2 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Ionicons name={s.icon as any} size={18} color={s.color} />
                  </View>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b' }}>{s.value}</Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600', textAlign: 'center', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 10 }}>آخر الطلبات</Text>
            {labResults.slice(0, 5).map((r, i) => {
              const st = STATUS_MAP[r.status] || { label: r.status, bg: '#f1f5f9', text: '#64748b' };
              return (
                <View key={r._id || i} style={card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}><Text style={{ fontSize: 11, fontWeight: '700', color: st.text }}>{st.label}</Text></View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 14 }}>{r.patientId?.fullName || r.patient?.fullName || 'مريض'}</Text>
                      <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '600' }}>{r.testName || r.testType || '—'}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-EG') : ''}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {!labResults.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>لا توجد طلبات</Text>}
          </>)}

          {activeTab === 'new' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 10 }}>الطلبات الجديدة ({labResults.filter(r => r.status === 'Pending').length})</Text>
            {labResults.filter(r => r.status === 'Pending').map((r, i) => <LabRequestCard key={r._id || i} item={r} onUpdateStatus={handleUpdateStatus} onAddResult={handleAddResult} />)}
            {!labResults.filter(r => r.status === 'Pending').length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد طلبات تحليل جديدة</Text>}
          </>)}

          {activeTab === 'pending' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 10 }}>نتائج معلقة ({labResults.filter(r => r.status === 'Processing').length})</Text>
            {labResults.filter(r => r.status === 'Processing').map((r, i) => <LabRequestCard key={r._id || i} item={r} onUpdateStatus={handleUpdateStatus} onAddResult={handleAddResult} />)}
            {!labResults.filter(r => r.status === 'Processing').length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد عينات بانتظار إدخال النتائج</Text>}
          </>)}

          {activeTab === 'completed' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 10 }}>مكتملة ({labResults.filter(r => r.status === 'Completed').length})</Text>
            {labResults.filter(r => r.status === 'Completed').map((r, i) => <LabRequestCard key={r._id || i} item={r} onUpdateStatus={handleUpdateStatus} onAddResult={handleAddResult} />)}
            {!labResults.filter(r => r.status === 'Completed').length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد تحاليل مكتملة</Text>}
          </>)}

          {activeTab === 'visits' && (<>
            <Text style={{ fontSize: 15, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', textAlign: 'right', marginBottom: 10 }}>مواعيد الزيارات المجدولة ({appointments.length})</Text>
            {appointments.map((apt, i) => (
              <View key={apt._id || i} style={card}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ alignItems: 'flex-start' }}>
                      <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 14 }}>{apt.patientId?.fullName || 'مريض'}</Text>
                      <Text style={{ color: '#d97706', fontSize: 12, fontWeight: '600' }}>{apt.type || 'موعد'}</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{apt.date ? new Date(apt.date).toLocaleDateString('en-CA') : ''} • {apt.time || ''}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: apt.status === 'Confirmed' ? '#dcfce7' : '#fef3c7' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: apt.status === 'Confirmed' ? '#166534' : '#b45309' }}>{apt.status === 'Confirmed' ? 'مؤكد' : 'قيد الانتظار'}</Text>
                    </View>
                 </View>
                 {(apt.status === 'Pending' || apt.status === 'pending') && (
                   <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                     <TouchableOpacity onPress={async () => { await api.patch(`/appointments/${apt._id}/status`, { status: 'Confirmed' }); fetchAll(); }}
                       style={{ flex: 1, backgroundColor: '#16a34a', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                       <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>تأكيد الموعد</Text>
                     </TouchableOpacity>
                     <TouchableOpacity onPress={async () => { await api.patch(`/appointments/${apt._id}/status`, { status: 'Cancelled' }); fetchAll(); }}
                       style={{ flex: 1, backgroundColor: '#dc2626', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                       <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>إلغاء الموعد</Text>
                     </TouchableOpacity>
                   </View>
                 )}
                 {(apt.status === 'Confirmed' || apt.status === 'confirmed') && (
                   <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                     <TouchableOpacity onPress={async () => { await api.patch(`/appointments/${apt._id}/status`, { status: 'Completed' }); fetchAll(); }}
                       style={{ flex: 1, backgroundColor: '#2563eb', paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
                       <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>إتمام الموعد السحب</Text>
                     </TouchableOpacity>
                   </View>
                 )}
              </View>
            ))}
            {!appointments.length && <Text style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>لا توجد زيارات مجدولة</Text>}
          </>)}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Lab Request Card ─────────────────────────────────────────────────────────

function LabRequestCard({ item, onUpdateStatus, onAddResult }: {
  item: LabResult & { resultDetails?: string };
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onAddResult: (id: string, result: string, file: PickedFile | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resultText, setResultText] = useState((item.resultDetails as string) || '');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const st = STATUS_MAP[item.status] || { label: item.status, bg: '#f1f5f9', text: '#64748b' };
  const isPending = item.status === 'Pending' || item.status === 'Processing';
  const existingDoc = item.documentPath || item.fileUrl || item.labFile;

  const handlePickFile = async () => {
    const f = await pickFile({ types: ['image', 'camera', 'pdf'] });
    if (f) setFile(f);
  };

  const handleSave = async () => {
    if (!resultText.trim() && !file) {
      toast.warn('أدخل نتيجة التحليل أو ارفع ملف');
      return;
    }
    setSaving(true);
    await onAddResult(item._id, resultText.trim(), file);
    setSaving(false);
    setFile(null);
    setExpanded(false);
  };

  const card = { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 };

  return (
    <View style={card}>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} activeOpacity={0.85}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: st.bg }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: st.text }}>{st.label}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
            <Text style={{ fontWeight: '800', color: '#1e293b', fontSize: 15 }}>{item.patientId?.fullName || item.patient?.fullName || 'مريض'}</Text>
            <Text style={{ color: '#d97706', fontSize: 13, fontWeight: '600', marginTop: 2 }}>{item.testName || item.testType || '—'}</Text>
            {Boolean(item.resultDetails) && <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.resultDetails}</Text>}
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-EG') : ''}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }}>
          {/* Existing document viewer (always shown if exists) */}
          {existingDoc && (
            <TouchableOpacity onPress={() => openSecureDocument(existingDoc)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#fef3c7', paddingVertical: 10, borderRadius: 12, marginBottom: 10,
                borderWidth: 1, borderColor: '#fde68a',
              }}>
              <Ionicons name="document-attach" size={16} color="#a16207" />
              <Text style={{ color: '#a16207', fontWeight: '700', marginRight: 6, fontSize: 13 }}>
                عرض الملف المرفق
              </Text>
            </TouchableOpacity>
          )}

          {/* Result text */}
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 6 }}>
            {isPending ? 'إضافة / تعديل النتيجة' : 'النتيجة المسجلة'}
          </Text>
          <TextInput
            value={resultText}
            onChangeText={setResultText}
            placeholder="أدخل نتيجة التحليل..."
            placeholderTextColor="#94a3b8"
            multiline numberOfLines={3} textAlign="right" textAlignVertical="top"
            style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1e293b', marginBottom: 10, minHeight: 72 }}
          />

          {/* File picker */}
          <TouchableOpacity onPress={handlePickFile}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              backgroundColor: file ? '#dcfce7' : '#eff6ff',
              paddingVertical: 12, borderRadius: 12, marginBottom: 10,
              borderWidth: 1, borderColor: file ? '#86efac' : '#bfdbfe',
            }}>
            <Ionicons name={file ? 'checkmark-circle' : 'cloud-upload-outline'} size={18} color={file ? '#16a34a' : '#0284c7'} />
            <Text style={{ color: file ? '#16a34a' : '#0284c7', fontWeight: '700', marginRight: 6, fontSize: 13 }}>
              {file ? file.name : (existingDoc ? 'استبدال الملف' : 'رفع ملف PDF/صورة')}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {item.status === 'Pending' && (
              <TouchableOpacity onPress={() => onUpdateStatus(item._id, 'Processing')}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#dbeafe', alignItems: 'center' }}>
                <Text style={{ color: '#1e40af', fontWeight: '700', fontSize: 13 }}>تم سحب العينة</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSave} disabled={saving}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: saving ? '#d1fae5' : '#dcfce7', alignItems: 'center' }}>
              {saving
                ? <ActivityIndicator size="small" color="#16a34a" />
                : <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>
                    {isPending ? 'حفظ النتيجة' : 'تحديث النتيجة'}
                  </Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
