import React, { useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useDoctorData } from '../../hooks/useDoctorData';
import { usePatientData } from '../../hooks/usePatientData';
import { Button } from '../../components/ui/Button';
import { Alert } from 'react-native';

export default function PrescriptionsScreen() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const { prescriptions: docPrescriptions, isLoading: docLoading, refetch: docRefetch } = useDoctorData();
  const { prescriptions: patPrescriptions, isLoading: patLoading, refetch: patRefetch } = usePatientData();

  const prescriptions = isDoctor ? docPrescriptions : patPrescriptions;
  const isLoading = isDoctor ? docLoading : patLoading;
  const refetch = isDoctor ? docRefetch : patRefetch;

  const sorted = useMemo(() => {
    return [...(prescriptions || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [prescriptions]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="bg-sky-600 px-5 pt-4 pb-8 flex-row items-center justify-between">
        <View>
          {isDoctor && (
            <Button size="sm" className="bg-white/20 h-10 px-4 rounded-xl" onPress={() => Alert.alert('إضافة روشتة', 'سيتم إضافة الروشتة قريباً')}>
              <Ionicons name="add" size={20} color="#ffffff" className="mr-1" /> إضافة روشتة
            </Button>
          )}
        </View>
        <View className="items-end">
          <Text className="text-white text-xl font-black">الروشتات</Text>
          <Text className="text-sky-200 text-xs mt-0.5">
            {isDoctor ? 'إدارة الوصفات الطبية' : 'الوصفات الطبية الخاصة بك'}
          </Text>
        </View>
      </View>

      <View className="flex-1 -mt-4 bg-slate-50 rounded-t-3xl overflow-hidden px-4 pt-6">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={item => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0284c7" />}
            ListEmptyComponent={() => (
              <View className="items-center justify-center mt-16">
                <Ionicons name="document-text-outline" size={56} color="#cbd5e1" />
                <Text className="text-slate-500 font-bold text-base mt-4">لا توجد روشتات</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isDispensed = item.status === 'dispensed' || item.status === 'Dispensed';
              return (
                <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="items-start">
                      <View className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 mb-2 ${isDispensed ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
                        <Ionicons name={isDispensed ? "checkmark-circle" : "time"} size={12} color={isDispensed ? "#059669" : "#d97706"} />
                        <Text className={`text-[10px] font-bold ${isDispensed ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isDispensed ? 'صُرفت' : 'بانتظار الصرف'}
                        </Text>
                      </View>
                      <Text className="text-slate-500 text-xs">{new Date(item.createdAt).toLocaleDateString('ar-EG')}</Text>
                    </View>
                    <View className="items-end flex-1 ml-4">
                      {isDoctor ? (
                        <>
                          <Text className="font-bold text-slate-800 text-base" numberOfLines={1}>{item.patientId?.fullName || 'مريض غير معروف'}</Text>
                          {item.patientId?.nationalId && <Text className="text-slate-400 text-[10px] font-mono mt-0.5">{item.patientId.nationalId}</Text>}
                        </>
                      ) : (
                        <Text className="font-bold text-slate-800 text-base" numberOfLines={1}>د. {item.doctorId?.fullName || 'طبيب'}</Text>
                      )}
                    </View>
                  </View>

                  <View className="bg-slate-50 rounded-xl p-3">
                    <Text className="text-slate-800 font-bold text-sm mb-1">{item.medication}</Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-slate-500 text-xs">الجرعة: <Text className="text-slate-700 font-bold">{item.dose}</Text></Text>
                      <Text className="text-slate-500 text-xs">المدة: <Text className="text-slate-700 font-bold">{item.duration}</Text></Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
