import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Notification {
  _id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Type config ────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  appointment:  { icon: 'calendar',           color: '#0284c7', bg: '#e0f2fe' },
  prescription: { icon: 'medkit',             color: '#7c3aed', bg: '#ede9fe' },
  lab:          { icon: 'flask',              color: '#0d9488', bg: '#ccfbf1' },
  system:       { icon: 'information-circle', color: '#64748b', bg: '#f1f5f9' },
};

const DEFAULT_TYPE_CONFIG = TYPE_CONFIG.system;

// ─── Relative time helper (Arabic) ──────────────────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'الآن';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return 'منذ دقيقة';
    if (diffMinutes === 2) return 'منذ دقيقتين';
    if (diffMinutes <= 10) return `منذ ${diffMinutes} دقائق`;
    return `منذ ${diffMinutes} دقيقة`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    if (diffHours === 1) return 'منذ ساعة';
    if (diffHours === 2) return 'منذ ساعتين';
    if (diffHours <= 10) return `منذ ${diffHours} ساعات`;
    return `منذ ${diffHours} ساعة`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    if (diffDays === 1) return 'منذ يوم';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوماً`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'منذ شهر';
  if (diffMonths === 2) return 'منذ شهرين';
  if (diffMonths <= 10) return `منذ ${diffMonths} أشهر`;
  return `منذ ${diffMonths} شهراً`;
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data?.data || []);
    } catch (err: any) {
      // Surface failure so the user knows pull-to-refresh actually failed
      // instead of returning an empty list. Don't toast on the first
      // mount attempt while we're still loading — the pull-refresh path
      // (showRefresh=true) is the one that should always notify.
      if (showRefresh) {
        try {
          const { toast } = await import('../../components/Toast');
          toast.error(err?.response?.data?.message || 'تعذر تحميل الإشعارات. تحقق من الاتصال.');
        } catch {
          // Toast module unavailable — fall back to console.
          console.warn('[notifications] fetch failed', err?.message);
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    if (isMarkingRead) return;
    setIsMarkingRead(true);
    try {
      await api.patch('/notifications/read');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true })),
      );
    } catch {
      // silently fail
    } finally {
      setIsMarkingRead(false);
    }
  }, [isMarkingRead]);

  // Delete a single notification with optimistic UI.
  const handleDeleteOne = useCallback(async (id: string) => {
    const prev = notifications;
    setNotifications((curr) => curr.filter((n) => n._id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch (err: any) {
      // Roll back on failure
      setNotifications(prev);
      try {
        const { toast } = await import('../../components/Toast');
        toast.error(err?.response?.data?.message || 'تعذر حذف الإشعار');
      } catch { /* noop */ }
    }
  }, [notifications]);

  // Clear all notifications (with confirm).
  const handleClearAll = useCallback(() => {
    if (notifications.length === 0) return;
    Alert.alert(
      'حذف كل الإشعارات؟',
      'لن تتمكن من استرجاعها. هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف الكل',
          style: 'destructive',
          onPress: async () => {
            const prev = notifications;
            setNotifications([]);
            try {
              await api.delete('/notifications');
            } catch (err: any) {
              setNotifications(prev);
              try {
                const { toast } = await import('../../components/Toast');
                toast.error(err?.response?.data?.message || 'تعذر مسح الإشعارات');
              } catch { /* noop */ }
            }
          },
        },
      ],
    );
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const sortedNotifications = useMemo(
    () => [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    [notifications],
  );

  const renderItem = useCallback(({ item }: { item: Notification }) => {
    const cfg = TYPE_CONFIG[item.type] || DEFAULT_TYPE_CONFIG;
    return (
      <View
        className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-3 overflow-hidden"
        style={
          !item.isRead
            ? { borderLeftWidth: 3, borderLeftColor: '#0284c7' }
            : undefined
        }
      >
        <View className={`p-4 flex-row items-start ${!item.isRead ? 'bg-sky-50/50' : ''}`}>
          {/* Icon */}
          <View
            className="w-10 h-10 rounded-2xl items-center justify-center ml-3"
            style={{ backgroundColor: cfg.bg }}
          >
            <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
          </View>

          {/* Content */}
          <View className="flex-1">
            <Text
              className={`text-right text-sm leading-5 ${
                !item.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'
              }`}
            >
              {item.message}
            </Text>
            <Text className="text-slate-400 text-xs text-right mt-1">
              {getRelativeTime(item.createdAt)}
            </Text>
          </View>

          {/* Unread dot */}
          {!item.isRead && (
            <View className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1.5" />
          )}

          {/* Delete button */}
          <TouchableOpacity
            onPress={() => handleDeleteOne(item._id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1.5 mr-1"
            accessibilityLabel="حذف الإشعار"
          >
            <Ionicons name="trash-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleDeleteOne]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Sky header */}
      <View className="bg-sky-600 px-5 pt-4 pb-8">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center"
                onPress={handleMarkAllRead}
                disabled={isMarkingRead}
                activeOpacity={0.8}
              >
                {isMarkingRead ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
                    <Text className="text-white text-xs font-bold">قراءة الكل</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                className="bg-white/20 px-3 py-1.5 rounded-full flex-row items-center"
                onPress={handleClearAll}
                activeOpacity={0.8}
                accessibilityLabel="حذف كل الإشعارات"
              >
                <Ionicons name="trash-outline" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
                <Text className="text-white text-xs font-bold">حذف الكل</Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="items-end">
            <View className="flex-row items-center">
              <Text className="text-white text-xl font-black">الإشعارات</Text>
              {unreadCount > 0 && (
                <View className="bg-white/25 min-w-[22px] h-[22px] rounded-full items-center justify-center mr-2 px-1.5">
                  <Text className="text-white text-xs font-black">{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text className="text-sky-200 text-xs mt-0.5">
              {notifications.length > 0
                ? `${notifications.length} إشعار`
                : 'لا توجد إشعارات'}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 -mt-4 bg-slate-50 rounded-t-3xl overflow-hidden pt-4 px-4">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0284c7" />
            <Text className="text-slate-400 text-xs mt-3">جاري تحميل الإشعارات...</Text>
          </View>
        ) : (
          <FlatList
            data={sortedNotifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchNotifications(true)}
                tintColor="#0284c7"
              />
            }
            ListEmptyComponent={() => (
              <View className="items-center justify-center mt-20">
                <View className="w-20 h-20 bg-slate-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
                </View>
                <Text className="text-slate-500 font-medium text-base">لا توجد إشعارات</Text>
                <Text className="text-slate-400 text-xs mt-1">ستظهر الإشعارات الجديدة هنا</Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
