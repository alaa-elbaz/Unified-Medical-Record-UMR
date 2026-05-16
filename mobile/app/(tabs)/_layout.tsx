import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, ActivityIndicator } from 'react-native';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconsName)}
      size={24}
      color={focused ? '#0284c7' : '#94a3b8'}
    />
  );
}

export default function TabLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Auth guard — every other route group has one (`(admin)`, `(hospital)`,
  // `(lab)`, `(pharmacy)`). Without it, deep links / restored navigation
  // state can render the patient/doctor tabs with `user === null` and
  // crash on the many `user!._id` access sites downstream.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const isDoctor = user?.role === 'doctor';
  const canScan = ['doctor', 'hospital', 'lab', 'pharmacy'].includes(user?.role || '');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          elevation: 8,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'المواعيد',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />

      {/* Patient-only: Medical Records */}
      <Tabs.Screen
        name="records"
        options={{
          title: 'السجل',
          tabBarIcon: ({ focused }) => <TabIcon name="document-text" focused={focused} />,
          href: !isDoctor ? '/(tabs)/records' : null,
        }}
      />

      {/* Doctor-only: My Patients */}
      <Tabs.Screen
        name="patients"
        options={{
          title: 'مرضاي',
          tabBarIcon: ({ focused }) => <TabIcon name="people" focused={focused} />,
          href: isDoctor ? '/(tabs)/patients' : null,
        }}
      />

      {/* Shared: Prescriptions */}
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'الروشتات',
          tabBarIcon: ({ focused }) => <TabIcon name="document-text" focused={focused} />,
          href: '/(tabs)/prescriptions' as any,
        }}
      />

      {/* Doctor/Hospital/Lab/Pharmacy: QR Scanner */}
      <Tabs.Screen
        name="qr"
        options={{
          title: 'مسح QR',
          tabBarIcon: ({ focused }) => <TabIcon name="scan" focused={focused} />,
          href: canScan ? '/(tabs)/qr' : null,
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'الإشعارات',
          tabBarIcon: ({ focused }) => <TabIcon name="notifications" focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />

      {/* Hidden utility screens */}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
