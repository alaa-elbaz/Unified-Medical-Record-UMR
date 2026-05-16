import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';
import { useAuth, getDisplayName } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import AdminCharts from '../../components/admin/AdminCharts';
import type { AdminStats, PendingItem, Appointment, ActivityLog, AdminUser, SystemSettings } from '../../types/api';

const SECTOR_LABELS: Record<string, string> = {
  hospital: 'مستشفى', lab: 'مختبر', pharmacy: 'صيدلية',
};

const apptStatusLabels: Record<string, string> = {
  Pending: 'قيد الانتظار',
  Confirmed: 'مؤكد',
  Cancelled: 'ملغي',
  Completed: 'مكتمل',
  'In-Progress': 'قيد التنفيذ',
  'Follow-up': 'متابعة',
};

const apptStatusColors: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  Confirmed: 'success',
  Cancelled: 'destructive',
  Completed: 'default',
  'In-Progress': 'warning',
  'Follow-up': 'secondary',
  Pending: 'secondary',
};

type Tab = 'overview' | 'pending' | 'appointments' | 'activity' | 'sub-admins' | 'settings';

export default function AdminHome() {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // States
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stats, setStats] = useState<AdminStats>({
    totalPatients: 0, totalDoctors: 0, totalHospitals: 0,
    totalLabs: 0, totalPharmacies: 0, pendingRegistrations: 0,
  });

  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [pending, setPending] = useState<PendingItem[]>([]);

  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  const [isLoadingSubAdmins, setIsLoadingSubAdmins] = useState(false);
  const [subAdmins, setSubAdmins] = useState<AdminUser[]>([]);

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const fetchStatsAndPending = useCallback(async () => {
    setIsLoadingStats(true);
    setIsLoadingPending(true);
    try {
      const [s, p, pu] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/pending-organizations'),
        api.get('/admin/users/pending'),
      ]);
      if (s.status === 'fulfilled') {
        const d = s.value.data.data || s.value.data;
        setStats(d);
      }
      const pendingOrgs = p.status === 'fulfilled' ? (p.value.data.data || p.value.data.organizations || []) : [];
      const pendingUsers = pu.status === 'fulfilled' ? (pu.value.data.data || pu.value.data.users || []) : [];
      setPending([...pendingOrgs, ...pendingUsers]);
    } finally { 
      setIsLoadingStats(false); 
      setIsLoadingPending(false); 
    }
  }, []);

  useEffect(() => { fetchStatsAndPending(); }, [fetchStatsAndPending]);

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const { data } = await api.get('/appointments');
      setAppointments(data.data || []);
    } catch { Alert.alert('خطأ', 'فشل جلب المواعيد'); }
    finally { setIsLoadingAppointments(false); }
  };

  const fetchActivityLog = async () => {
    setIsLoadingActivity(true);
    try {
      const { data } = await api.get('/admin/activity-log');
      setActivities(data.data || []);
    } catch { Alert.alert('خطأ', 'فشل جلب سجل النشاط'); }
    finally { setIsLoadingActivity(false); }
  };

  const fetchSubAdmins = async () => {
    setIsLoadingSubAdmins(true);
    try {
      const { data } = await api.get('/admin/sub-admins');
      setSubAdmins(data.data || []);
    } catch { Alert.alert('خطأ', 'فشل جلب المدراء'); }
    finally { setIsLoadingSubAdmins(false); }
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const { data } = await api.get('/admin/settings');
      setSettings(data.data);
    } catch { Alert.alert('خطأ', 'فشل جلب الإعدادات'); }
    finally { setIsLoadingSettings(false); }
  };

  useEffect(() => {
    if (activeTab === 'appointments' && appointments.length === 0) fetchAppointments();
    if (activeTab === 'activity' && activities.length === 0) fetchActivityLog();
    if (activeTab === 'sub-admins' && subAdmins.length === 0) fetchSubAdmins();
    if (activeTab === 'settings' && !settings) fetchSettings();
  }, [activeTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'overview' || activeTab === 'pending') await fetchStatsAndPending();
    if (activeTab === 'appointments') await fetchAppointments();
    if (activeTab === 'activity') await fetchActivityLog();
    if (activeTab === 'sub-admins') await fetchSubAdmins();
    if (activeTab === 'settings') await fetchSettings();
    setIsRefreshing(false);
  };

  const handleApprove = async (id: string, isOrg: boolean) => {
    try {
      if (isOrg) await api.put(`/admin/approve-organization/${id}`);
      else await api.put(`/admin/users/${id}/status`, { status: 'active' });
      
      setPending(prev => prev.filter(p => p._id !== id));
      setStats((prev) => ({ ...prev, pendingRegistrations: Math.max(0, (prev.pendingRegistrations || 0) - 1) }));
      Alert.alert('تمت الموافقة', 'تم قبول الطلب بنجاح.');
    } catch { Alert.alert('خطأ', 'تعذّر قبول الطلب.'); }
  };

  const handleReject = (id: string, isOrg: boolean) => {
    Alert.alert('رفض الطلب', 'هل تريد رفض هذا الطلب؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'رفض', style: 'destructive', onPress: async () => {
        try {
          if (isOrg) await api.put(`/admin/organizations/${id}/status`, { status: 'rejected' });
          else await api.put(`/admin/users/${id}/status`, { status: 'rejected' });
          
          setPending(prev => prev.filter(p => p._id !== id));
          setStats((prev) => ({ ...prev, pendingRegistrations: Math.max(0, (prev.pendingRegistrations || 0) - 1) }));
        } catch { Alert.alert('خطأ', 'تعذّر رفض الطلب.'); }
      }},
    ]);
  };

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      Alert.alert('تم', 'تم تحديث حالة الموعد بنجاح');
      fetchAppointments();
    } catch { Alert.alert('خطأ', 'تعذر تحديث الحالة'); }
  };

  const handleClearLogs = () => {
    Alert.alert('مسح السجلات', 'هل أنت متأكد من مسح جميع سجلات النشاط؟ لا يمكن التراجع عن هذا الإجراء.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'مسح', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/admin/activity-log');
          setActivities([]);
          Alert.alert('نجاح', 'تم مسح السجلات');
        } catch { Alert.alert('خطأ', 'تعذر مسح السجلات'); }
      }}
    ]);
  };

  const handleLogout = () => Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'خروج', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
  ]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View className="bg-slate-900 dark:bg-slate-950 px-5 pt-3 pb-5">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleLogout} className="bg-white/10 rounded-xl p-2">
            <Ionicons name="log-out-outline" size={20} color="white" />
          </TouchableOpacity>
          <View className="items-end">
            <Text className="text-slate-400 text-xs font-semibold">لوحة الإدارة</Text>
            <Text className="text-white text-base font-black">{getDisplayName(user)}</Text>
          </View>
          <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center">
            <Ionicons name="shield-checkmark" size={20} color="white" />
          </View>
        </View>
      </View>

      <View className="flex-1 px-4 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="flex-1">
          <TabsList className="mb-4">
            <TabsTrigger value="overview"><Ionicons name="bar-chart" size={16} style={{ marginRight: 4 }} /> نظرة عامة</TabsTrigger>
            <TabsTrigger value="pending"><Ionicons name="shield-checkmark" size={16} style={{ marginRight: 4 }} /> الاعتمادات {pending.length > 0 && `(${pending.length})`}</TabsTrigger>
            <TabsTrigger value="appointments"><Ionicons name="calendar" size={16} style={{ marginRight: 4 }} /> المواعيد</TabsTrigger>
            <TabsTrigger value="activity"><Ionicons name="pulse" size={16} style={{ marginRight: 4 }} /> النشاط</TabsTrigger>
            {user?.role === 'super_admin' && (
              <>
                <TabsTrigger value="sub-admins"><Ionicons name="people" size={16} style={{ marginRight: 4 }} /> المدراء</TabsTrigger>
                <TabsTrigger value="settings"><Ionicons name="settings" size={16} style={{ marginRight: 4 }} /> الإعدادات</TabsTrigger>
              </>
            )}
          </TabsList>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#0f172a']} />}
          >
            {/* OVERVIEW TAB */}
            <TabsContent value="overview">
              {isLoadingStats ? (
                <View className="py-10 items-center"><ActivityIndicator size="large" color={isDark ? '#f1f5f9' : '#0f172a'} /></View>
              ) : (
                <>
                  <View className="flex-row gap-2 mb-4">
                    <Button className="flex-1 h-12 bg-slate-900 dark:bg-slate-900" onPress={() => router.push('/(admin)/users' as any)}>
                      <Ionicons name="people" size={18} color="white" style={{ marginRight: 8 }} />
                      <Text style={{color: 'white', fontWeight: 'bold'}}>إدارة المستخدمين</Text>
                    </Button>
                    <Button className="flex-1 h-12 bg-slate-900 dark:bg-slate-900" onPress={() => router.push('/(admin)/organizations' as any)}>
                      <Ionicons name="business" size={18} color="white" style={{ marginRight: 8 }} />
                      <Text style={{color: 'white', fontWeight: 'bold'}}>إدارة المنظمات</Text>
                    </Button>
                  </View>

                  <AdminCharts stats={stats} />

                  <View className="flex-row flex-wrap mx-[-4px]">
                    {[
                      { label: 'المرضى',      value: stats.totalPatients,        color: '#0284c7', bg: 'bg-sky-100 dark:bg-sky-900/40', icon: 'people' },
                      { label: 'الأطباء',     value: stats.totalDoctors,         color: '#0d9488', bg: 'bg-teal-100 dark:bg-teal-900/40', icon: 'medkit' },
                      { label: 'المستشفيات',  value: stats.totalHospitals,       color: '#7c3aed', bg: 'bg-violet-100 dark:bg-purple-900/40', icon: 'business' },
                      { label: 'المختبرات',   value: stats.totalLabs,            color: '#d97706', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: 'flask' },
                      { label: 'الصيدليات',   value: stats.totalPharmacies,      color: '#dc2626', bg: 'bg-red-100 dark:bg-red-900/40', icon: 'bag' },
                      { label: 'طلبات معلقة', value: stats.pendingRegistrations, color: '#64748b', bg: 'bg-slate-100 dark:bg-slate-800', icon: 'time' },
                    ].map((s, i) => (
                      <View key={i} className="w-[30%] mx-[1.5%] mb-3">
                        <Card className="items-center p-3">
                          <View className={`w-8 h-8 rounded-lg ${s.bg} items-center justify-center mb-2`}>
                            <Ionicons name={s.icon as any} size={16} color={s.color} />
                          </View>
                          <Text className="text-xl font-black text-slate-800 dark:text-slate-100">{s.value}</Text>
                          <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-bold text-center mt-1">{s.label}</Text>
                        </Card>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </TabsContent>

            {/* PENDING TAB */}
            <TabsContent value="pending">
              <Text className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 text-right">الطلبات المعلقة ({pending.length})</Text>
              {isLoadingPending ? (
                <View className="py-10 items-center"><ActivityIndicator size="large" color={isDark ? '#f1f5f9' : '#0f172a'} /></View>
              ) : pending.length === 0 ? (
                <View className="py-10 items-center">
                  <Ionicons name="checkmark-circle-outline" size={48} color={isDark ? '#475569' : '#cbd5e1'} />
                  <Text className="text-slate-400 dark:text-slate-500 mt-2">لا توجد طلبات معلقة</Text>
                </View>
              ) : (
                pending.map((p, i) => {
                  const isOrg = !!p.healthRegNumber || !!p.sectorType;
                  const displayName = p.name || p.fullName || p.email || 'غير معروف';
                  const typeLabel = isOrg
                    ? (SECTOR_LABELS[p.type] || SECTOR_LABELS[p.sectorType] || p.type || p.sectorType || 'مؤسسة')
                    : (p.role === 'doctor' ? 'طبيب' : p.role === 'patient' ? 'مريض' : p.role || 'مستخدم');

                  const docUrl = p.licenseDocument || p.commercialRegistry || p.idDocument || p.syndicateId || p.document;

                  return (
                    <Card key={p._id || i} className="mb-3">
                      <CardContent className="pt-4">
                        <View className="items-end mb-3">
                          <View className="flex-row items-center mb-1">
                            <Badge variant="secondary" className="ml-2">{typeLabel}</Badge>
                            <Text className="font-bold text-slate-800 dark:text-slate-100 text-base">{displayName}</Text>
                          </View>
                          <Text className="text-slate-500 dark:text-slate-400 text-xs">{p.email}</Text>
                          {Boolean(p.healthRegNumber) && <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">رقم تسجيل: {p.healthRegNumber}</Text>}
                          {Boolean(p.nationalId) && <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">رقم قومي: {p.nationalId}</Text>}
                          <Text className="text-slate-400 dark:text-slate-500 text-xs mt-1">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-EG') : ''}</Text>
                        </View>

                        {docUrl && (
                          <TouchableOpacity onPress={() => require('../../components/DocumentViewer').openSecureDocument(docUrl)} className="mb-3 bg-blue-50 dark:bg-sky-950/40 py-2 rounded-lg flex-row items-center justify-center">
                            <Ionicons name="document-attach" size={14} color={isDark ? '#7dd3fc' : '#1e40af'} className="mr-1" />
                            <Text className="text-blue-800 dark:text-sky-300 font-bold text-xs">عرض المستند</Text>
                          </TouchableOpacity>
                        )}
                        
                        <View className="flex-row gap-2">
                          <Button variant="destructive" className="flex-1" onPress={() => handleReject(p._id, isOrg)}>رفض</Button>
                          <Button className="flex-1 bg-green-600" onPress={() => handleApprove(p._id, isOrg)}>قبول</Button>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* APPOINTMENTS TAB */}
            <TabsContent value="appointments">
              <Text className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 text-right">إدارة المواعيد</Text>
              {isLoadingAppointments ? (
                <View className="py-10 items-center"><ActivityIndicator size="large" color={isDark ? '#f1f5f9' : '#0f172a'} /></View>
              ) : appointments.length === 0 ? (
                <View className="py-10 items-center">
                  <Ionicons name="calendar-outline" size={48} color={isDark ? '#475569' : '#cbd5e1'} />
                  <Text className="text-slate-400 dark:text-slate-500 mt-2">لا توجد مواعيد مسجلة</Text>
                </View>
              ) : (
                appointments.map(apt => {
                  const status = apt.status || 'Pending';
                  const provider = apt.doctorId?.fullName ? `د. ${apt.doctorId.fullName}`
                    : apt.hospitalId?.name ? `مستشفى ${apt.hospitalId.name}`
                    : apt.labId?.name ? `معمل ${apt.labId.name}`
                    : 'غير متوفر';
                  const patientName = apt.patientId?.fullName || apt.patient?.fullName || apt.userId?.fullName || 'مريض عبر النظام';

                  return (
                    <Card key={apt._id} className="mb-3">
                      <CardContent className="pt-4 flex-col items-end">
                        <View className="flex-row w-full justify-between items-start mb-2">
                          <Badge variant={apptStatusColors[status] || 'secondary'}>
                            {apptStatusLabels[status] || status}
                          </Badge>
                          <Text className="font-bold text-slate-800 dark:text-slate-100 text-base">{patientName}</Text>
                        </View>
                        <Text className="text-slate-600 dark:text-slate-300 text-xs mb-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md">مزود الخدمة: {provider}</Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-xs mb-3">
                          التاريخ: {apt.date ? new Date(apt.date).toLocaleDateString('en-CA').replace(/-/g, '/') : '—'} — الساعة {apt.time || '—'}
                        </Text>
                        
                        <View className="flex-row gap-2 w-full">
                          {status === 'Pending' && (
                            <>
                              <Button variant="destructive" size="sm" className="flex-1" onPress={() => handleUpdateAppointmentStatus(apt._id, 'Cancelled')}>إلغاء</Button>
                              <Button size="sm" className="flex-1 bg-green-600" onPress={() => handleUpdateAppointmentStatus(apt._id, 'Confirmed')}>تأكيد</Button>
                            </>
                          )}
                          {status === 'Confirmed' && (
                            <Button size="sm" className="flex-1 bg-blue-600" onPress={() => handleUpdateAppointmentStatus(apt._id, 'Completed')}>اكتمل</Button>
                          )}
                        </View>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* ACTIVITY TAB */}
            <TabsContent value="activity">
              <View className="flex-row justify-between items-center mb-4">
                <Button variant="destructive" size="sm" onPress={handleClearLogs}>مسح السجلات</Button>
                <Text className="text-lg font-black text-slate-800 dark:text-slate-100">سجل النشاط</Text>
              </View>
              {isLoadingActivity ? (
                <View className="py-10 items-center"><ActivityIndicator size="large" color={isDark ? '#f1f5f9' : '#0f172a'} /></View>
              ) : activities.length === 0 ? (
                <View className="py-10 items-center">
                  <Ionicons name="pulse" size={48} color={isDark ? '#475569' : '#cbd5e1'} />
                  <Text className="text-slate-400 dark:text-slate-500 mt-2">لا توجد سجلات</Text>
                </View>
              ) : (
                activities.map((log, index) => (
                  <Card key={log._id || index} className="mb-2">
                    <CardContent className="p-3">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(log.createdAt).toLocaleString('ar-EG')}</Text>
                        <Text className="font-bold text-slate-800 dark:text-slate-100 text-sm">{log.action}</Text>
                      </View>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1 text-right">{log.details}</Text>
                      <Text className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 text-right">IP: {log.ipAddress}</Text>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* SUB-ADMINS TAB */}
            <TabsContent value="sub-admins">
              <Text className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 text-right">المدراء المساعدون</Text>
              {isLoadingSubAdmins ? (
                <View className="py-10 items-center"><ActivityIndicator size="large" color={isDark ? '#f1f5f9' : '#0f172a'} /></View>
              ) : subAdmins.length === 0 ? (
                <View className="py-10 items-center">
                  <Ionicons name="people-outline" size={48} color={isDark ? '#475569' : '#cbd5e1'} />
                  <Text className="text-slate-400 dark:text-slate-500 mt-2">لا يوجد مدراء مساعدون</Text>
                </View>
              ) : (
                subAdmins.map(admin => (
                  <Card key={admin._id} className="mb-3">
                    <CardContent className="p-4 flex-row justify-between items-center">
                      <Button variant="destructive" size="sm" onPress={() => Alert.alert('حذف', 'لا يمكن الحذف من الموبايل حالياً')}>إزالة</Button>
                      <View className="items-end">
                        <Text className="font-bold text-slate-800 dark:text-slate-100 text-base">{admin.fullName}</Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-xs">{admin.email}</Text>
                      </View>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings">
              <Text className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 text-right">الإعدادات العامة</Text>
              {isLoadingSettings ? (
                <View className="py-10 items-center"><ActivityIndicator size="large" color={isDark ? '#f1f5f9' : '#0f172a'} /></View>
              ) : (
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <Text className="text-slate-500 dark:text-slate-400 text-center text-sm py-4">سيتم إضافة واجهة تحكم الإعدادات هنا في التحديث القادم لتطابق الويب تماماً.</Text>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <View style={{ height: 40 }} />
          </ScrollView>
        </Tabs>
      </View>
    </SafeAreaView>
  );
}
