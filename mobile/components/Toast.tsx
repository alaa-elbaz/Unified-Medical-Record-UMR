/**
 * Toast — lightweight non-blocking notification (replaces Alert.alert for success/info).
 * Usage:
 *   import { toast } from '@/components/Toast';  // or relative import
 *   toast.success('تم الحفظ');
 *   toast.error('حدث خطأ');
 *
 * Rendered once near root via <ToastProvider />.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastKind = 'success' | 'error' | 'info' | 'warn';
type ToastItem = { id: number; kind: ToastKind; msg: string };

const TOAST_COLORS: Record<ToastKind, { bg: string; fg: string; icon: string }> = {
  success: { bg: '#dcfce7', fg: '#15803d', icon: 'checkmark-circle' },
  error:   { bg: '#fee2e2', fg: '#b91c1c', icon: 'close-circle' },
  info:    { bg: '#dbeafe', fg: '#1d4ed8', icon: 'information-circle' },
  warn:    { bg: '#fef3c7', fg: '#a16207', icon: 'warning' },
};

let externalShow: ((kind: ToastKind, msg: string) => void) | null = null;

/** Public API — call from anywhere */
export const toast = {
  success: (msg: string) => externalShow?.('success', msg),
  error:   (msg: string) => externalShow?.('error',   msg),
  info:    (msg: string) => externalShow?.('info',    msg),
  warn:    (msg: string) => externalShow?.('warn',    msg),
};

const Ctx = createContext<{ show: (kind: ToastKind, msg: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((kind: ToastKind, msg: string) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, kind, msg }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    externalShow = show;
    return () => { externalShow = null; };
  }, [show]);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <View style={styles.host} pointerEvents="box-none">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => setItems((p) => p.filter((t) => t.id !== item.id))} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const c = TOAST_COLORS[item.kind];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { backgroundColor: c.bg, opacity, transform: [{ translateY }] }]}>
      <Ionicons name={c.icon as any} size={20} color={c.fg} />
      <Text style={[styles.msg, { color: c.fg }]} numberOfLines={2}>{item.msg}</Text>
      <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
        <Ionicons name="close" size={16} color={c.fg} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 8,
    width: width - 32,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  msg: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 10,
    textAlign: 'right',
  },
});

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
