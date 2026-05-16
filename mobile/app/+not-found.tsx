import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'غير موجود' }} />
      <View style={styles.container}>
        <Text style={styles.title}>الصفحة غير موجودة.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>العودة للرئيسية</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f8fafc' },
  title:     { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  link:      { marginTop: 15, paddingVertical: 15 },
  linkText:  { fontSize: 14, color: '#0284c7', fontWeight: '700' },
});
