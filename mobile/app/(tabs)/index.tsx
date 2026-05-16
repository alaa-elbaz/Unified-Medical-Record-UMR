import { Redirect } from 'expo-router';

// Hidden utility route — the tab is `href: null` in (tabs)/_layout.tsx,
// but expo-router still compiles this file. Redirect to /home so any
// stale navigation that lands here ends up on the real entry tab.
export default function TabsIndex() {
  return <Redirect href="/(tabs)/home" />;
}
