import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePatientData } from '../../hooks/usePatientData';
import api from '../../services/api';
import { confirm } from '../../components/ConfirmDialog';
import { openSecureDocument } from '../../components/DocumentViewer';
import { toast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'react-native-qrcode-svg';
import type { MedicalRecord, Prescription, LabResult, Radiology } from '../../types/api';

type FilterKey = 'all' | 'record' | 'prescription' | 'lab' | 'radiology';

// Each timeline item is one of the 4 record kinds plus an injected
// `_type` discriminator and `_date` for sorting.
type TimelineItem =
  | (MedicalRecord & { _type: 'record';       _date: Date })
  | (Prescription  & { _type: 'prescription'; _date: Date })
  | (LabResult     & { _type: 'lab';          _date: Date })
  | (Radiology     & { _type: 'radiology';    _date: Date });

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',          label: 'الكل' },
  { key: 'record',       label: 'كشوفات' },
  { key: 'prescription', label: 'روشتات' },
  { key: 'lab',          label: 'تحاليل' },
  { key: 'radiology',    label: 'أشعة' },
];

const TYPE_META: Record<string, {
  icon: string; iconColor: string; bgColor: string; borderColor: string;
  titleFn: (item: TimelineItem) => string;
}> = {
  record: {
    icon: 'document-text', iconColor: '#0284c7', bgColor: '#e0f2fe', borderColor: '#bae6fd',
    titleFn: () => 'كشف طبي',
  },
  prescription: {
    icon: 'medkit', iconColor: '#7c3aed', bgColor: '#ede9fe', borderColor: '#ddd6fe',
    titleFn: () => 'روشتة علاج',
  },
  lab: {
    icon: 'flask', iconColor: '#0d9488', bgColor: '#ccfbf1', borderColor: '#99f6e4',
    titleFn: (item) => `تحليل: ${item._type === 'lab' ? (item.testName || '') : ''}`,
  },
  radiology: {
    icon: 'scan-circle', iconColor: '#d97706', bgColor: '#fef3c7', borderColor: '#fde68a',
    titleFn: (item) => `أشعة: ${item._type === 'radiology' ? (item.scanType || '') : ''}`,
  },
};

const ENDPOINT_BY_TYPE: Record<string, string> = {
  record: '/records', prescription: '/prescriptions', lab: '/labs', radiology: '/radiology',
};

export default function RecordsScreen() {
  const { user } = useAuth();
  const { medicalRecords, prescriptions, labResults, radiologyResults, isLoading, refetch } =
    usePatientData();
  const [filter, setFilter] = useState<FilterKey>('all');
  
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const timelineData = useMemo<TimelineItem[]>(() => {
    const all: TimelineItem[] = [
      ...medicalRecords.map((r) => ({ ...r, _type: 'record' as const,       _date: new Date(r.createdAt || 0) })),
      ...prescriptions.map((p) => ({ ...p, _type: 'prescription' as const, _date: new Date(p.createdAt || 0) })),
      ...labResults.map((l) => ({ ...l, _type: 'lab' as const,          _date: new Date(l.createdAt || 0) })),
      ...radiologyResults.map((r) => ({ ...r, _type: 'radiology' as const, _date: new Date(r.createdAt || 0) })),
    ];
    const filtered = filter === 'all' ? all : all.filter((i) => i._type === filter);
    return filtered.sort((a, b) => b._date.getTime() - a._date.getTime());
  }, [medicalRecords, prescriptions, labResults, radiologyResults, filter]);

  const counts: Record<FilterKey, number> = useMemo(() => ({
    all:          medicalRecords.length + prescriptions.length + labResults.length + radiologyResults.length,
    record:       medicalRecords.length,
    prescription: prescriptions.length,
    lab:          labResults.length,
    radiology:    radiologyResults.length,
  }), [medicalRecords, prescriptions, labResults, radiologyResults]);

  const handleAdd = (type: FilterKey) => {
    switch (type) {
      case 'record':       router.push('/records/self-report' as any); break;
      case 'prescription': router.push('/medications/add' as any); break;
      case 'lab':          router.push('/labs/upload' as any); break;
      case 'radiology':    router.push('/radiology/upload' as any); break;
      default: {
        Alert.alert('إضافة جديدة', 'اختر نوع السجل', [
          { text: 'تقرير ذاتي',  onPress: () => router.push('/records/self-report' as any) },
          { text: 'دواء',        onPress: () => router.push('/medications/add' as any) },
          { text: 'تحليل',       onPress: () => router.push('/labs/upload' as any) },
          { text: 'أشعة',        onPress: () => router.push('/radiology/upload' as any) },
          { text: 'إلغاء', style: 'cancel' },
        ]);
      }
    }
  };

  const handleDelete = async (item: TimelineItem) => {
    const ok = await confirm({
      title: 'حذف السجل',
      message: 'هل تريد حذف هذا السجل نهائياً؟',
      destructive: true,
      confirmText: 'حذف',
    });
    if (!ok) return;
    try {
      const endpoint = ENDPOINT_BY_TYPE[item._type];
      await api.delete(`${endpoint}/${item._id}`);
      toast.success('تم الحذف');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'تعذر الحذف');
    }
  };

  const handleSendToPharmacy = (item: TimelineItem) => {
    router.push(`/prescriptions/${item._id}/send-pharmacy` as any);
  };

  const handleGeneratePharmacyQr = async () => {
    setGeneratingQr(true);
    try {
      const { data } = await api.get(`/patients/${user?._id}/qr-token`);
      const token = data?.data?.qrToken || data?.data?.token || data?.qrToken || data?.token;
      if (token) {
        setQrToken(token);
      } else {
        toast.error('لم يتم إرجاع كود صالح من الخادم');
      }
    } catch {
      toast.error('تعذر إنشاء الكود');
    } finally {
      setGeneratingQr(false);
    }
  };

  const renderHeader = () => {
    if (filter !== 'prescription') return null;
    return (
      <View className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-5 mb-4 shadow-sm items-center">
        <View className="flex-row items-center mb-3">
          <Ionicons name="qr-code" size={24} color="white" />
          <Text className="text-white font-black text-lg ml-2">بطاقة الصيدلية الذكية</Text>
        </View>
        <Text className="text-indigo-100 text-center text-xs mb-4">
          أنشئ كود QR مؤقت لمرة واحدة لتسمح للصيدلي بالوصول لوصفاتك الطبية فقط وصرفها لك بأمان.
        </Text>
        {generatingQr ? (
          <ActivityIndicator color="white" />
        ) : qrToken ? (
          <View className="items-center">
            <View className="bg-white p-3 rounded-2xl border border-indigo-200">
              <QRCode value={`medcore://pharmacy/${user?._id}?token=${qrToken}`} size={140} color="#312e81" backgroundColor="#ffffff" />
            </View>
            <Text className="text-indigo-200 text-[10px] mt-2 font-mono">صالح لمدة 24 ساعة فقط</Text>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={handleGeneratePharmacyQr}
            className="bg-white px-6 py-3 rounded-xl shadow-sm flex-row items-center"
            activeOpacity={0.8}
          >
            <Text className="text-indigo-600 font-bold mr-2">إنشاء كود الصيدلية</Text>
            <Ionicons name="sparkles" size={16} color="#4f46e5" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Sky header */}
      <View className="bg-sky-600 px-5 pt-4 pb-8 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => handleAdd(filter)} style={{
          backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12,
        }}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
        <View style={{ alignItems: 'flex-end' }}>
          <Text className="text-white text-xl font-black">السجل الطبي</Text>
          <Text className="text-sky-200 text-xs mt-1">{counts.all} سجل إجمالي</Text>
        </View>
      </View>

      <View className="flex-1 -mt-4 bg-slate-50 rounded-t-3xl overflow-hidden">
        {/* Filter pills */}
        <View className="pt-4 px-4 pb-2">
          <FlatList
            data={FILTERS}
            keyExtractor={(f) => f.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item: f }) => {
              const active = filter === f.key;
              return (
                <TouchableOpacity
                  onPress={() => setFilter(f.key)}
                  className={`flex-row items-center px-4 py-2 rounded-full ${
                    active ? 'bg-sky-600' : 'bg-white border border-slate-200'
                  }`}
                  activeOpacity={0.8}
                >
                  <Text className={`font-bold text-sm ${active ? 'text-white' : 'text-slate-600'}`}>
                    {f.label}
                  </Text>
                  {counts[f.key] > 0 && (
                    <View className={`ml-2 w-5 h-5 rounded-full items-center justify-center ${active ? 'bg-white/30' : 'bg-sky-100'}`}>
                      <Text className={`text-xs font-black ${active ? 'text-white' : 'text-sky-600'}`}>
                        {counts[f.key]}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <FlatList
            data={timelineData}
            keyExtractor={(item) => `${item._type}-${item._id}`}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0284c7" />}
            ListEmptyComponent={() => (
              <View className="items-center justify-center mt-20">
                <Ionicons name="document-text-outline" size={56} color="#cbd5e1" />
                <Text className="text-slate-500 font-medium text-base mt-4">لا توجد سجلات</Text>
                <TouchableOpacity onPress={() => handleAdd(filter)} style={{
                  marginTop: 16, backgroundColor: '#0284c7',
                  paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
                }}>
                  <Text style={{ color: 'white', fontWeight: '700' }}>إضافة سجل</Text>
                </TouchableOpacity>
              </View>
            )}
            ListHeaderComponent={renderHeader()}
            renderItem={({ item }) => (
              <RecordCard item={item} onDelete={handleDelete} onSendPharmacy={handleSendToPharmacy} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function RecordCard({
  item, onDelete, onSendPharmacy,
}: { item: TimelineItem; onDelete: (i: TimelineItem) => void; onSendPharmacy: (i: TimelineItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[item._type] || TYPE_META['record'];

  // Cast once — different record types have differently-shaped populated
  // refs that aren't worth modeling exhaustively for this card UI.
  const a = item as Record<string, unknown> & { doctorId?: { fullName?: string }; labId?: { name?: string }; hospitalId?: { name?: string } };

  const providerName =
    a.doctorId?.fullName ? `د. ${a.doctorId.fullName}`
    : a.labId?.name      ? a.labId.name
    : a.hospitalId?.name ? a.hospitalId.name
    : 'ذاتي';

  const details =
    item._type === 'record'        ? ((item.diagnosis as string) || (a.chiefComplaint as string) || '—')
    : item._type === 'prescription' ? ((item.medication as string) || ((a.medications as Array<{ name?: string; medication?: string }>)?.map((m) => m.name || m.medication).filter(Boolean).join('، ')) || '—')
    : item._type === 'lab'          ? ((a.resultDetails as string) || (a.interpretation as string) || 'انقر لعرض الملف')
    :                                  ((a.reportDetails as string) || (a.impression as string) || 'انقر لعرض الملف');

  // Self-added (no provider) → user owns it and can edit/delete
  const isOwn = !a.doctorId && !a.labId && !a.hospitalId;

  const documentUrl = (a.documentPath || a.fileUrl || a.labFile || a.radiologyFile || a.attachment) as string | undefined;

  return (
    <View className="flex-row mb-4">
      {/* Timeline spine */}
      <View className="items-center mr-3" style={{ width: 40 }}>
        <View className="w-10 h-10 rounded-full items-center justify-center border"
          style={{ backgroundColor: meta.bgColor, borderColor: meta.borderColor }}>
          <Ionicons name={meta.icon as any} size={18} color={meta.iconColor} />
        </View>
        <View className="w-0.5 flex-1 bg-slate-200 mt-1" />
      </View>

      {/* Card body */}
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.85}
        className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        {/* Header row */}
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-xs text-slate-400">
            {item._date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <View className="items-end flex-1 mr-2">
            <Text style={{ color: meta.iconColor }} className="font-bold text-sm text-right">
              {meta.titleFn(item)}
            </Text>
            <Text className="text-slate-500 text-xs text-right mt-0.5">{providerName}</Text>
          </View>
        </View>

        {/* Detail block */}
        <View className="rounded-xl p-3 mt-1" style={{ backgroundColor: meta.bgColor }}>
          <Text className="text-sm text-right leading-6"
            style={{ color: meta.iconColor }}
            numberOfLines={expanded ? undefined : 2}>
            {details}
          </Text>
        </View>

        {/* Document attachment */}
        {documentUrl && (
          <TouchableOpacity onPress={() => openSecureDocument(documentUrl)}
            className="flex-row items-center justify-center mt-3 bg-slate-100 py-2 rounded-xl">
            <Ionicons name="document-attach" size={16} color="#475569" style={{ marginLeft: 6 }} />
            <Text className="text-slate-600 font-bold text-sm">عرض المستند</Text>
          </TouchableOpacity>
        )}

        {/* Action row (when expanded) */}
        {expanded && (
          <View className="flex-row gap-2 mt-3">
            {item._type === 'prescription' && (
              <TouchableOpacity onPress={() => onSendPharmacy(item)}
                className="flex-1 flex-row items-center justify-center bg-red-50 py-2 rounded-xl border border-red-100">
                <Ionicons name="bag-handle-outline" size={14} color="#dc2626" style={{ marginLeft: 4 }} />
                <Text className="text-red-600 text-xs font-bold">إرسال لصيدلية</Text>
              </TouchableOpacity>
            )}
            {isOwn && (
              <TouchableOpacity onPress={() => onDelete(item)}
                className="flex-1 flex-row items-center justify-center bg-red-50 py-2 rounded-xl border border-red-100">
                <Ionicons name="trash-outline" size={14} color="#dc2626" style={{ marginLeft: 4 }} />
                <Text className="text-red-600 text-xs font-bold">حذف</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Expand chevron */}
        <View className="flex-row justify-center mt-2">
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    </View>
  );
}
