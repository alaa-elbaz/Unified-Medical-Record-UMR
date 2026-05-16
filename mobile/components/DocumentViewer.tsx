/**
 * DocumentViewer — opens secure documents (images / PDFs) safely.
 * Uses /images/secure backend endpoint for cloudinary signed URLs.
 *
 * Usage:
 *   <DocumentViewer url={fileUrl} label="بطاقة الهوية" />
 *
 * Or imperatively:
 *   await openSecureDocument(url);
 */

import React from 'react';
import { TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

/** Resolve a possibly-cloudinary URL to a signed/viewable URL via the backend. */
export async function resolveSecureUrl(url: string): Promise<string> {
  if (!url) throw new Error('No URL provided');
  // Already a fully public URL? open directly.
  if (!/cloudinary\.com/.test(url)) return url;
  try {
    const res = await api.get('/images/secure', { params: { url } });
    return res.data?.url || res.data?.data?.url || url;
  } catch {
    // Fallback to original — backend may not require signing
    return url;
  }
}

/** Open a document URL in an in-app browser. */
export async function openSecureDocument(url: string) {
  if (!url) {
    Alert.alert('غير متاح', 'الرابط غير موجود');
    return;
  }
  try {
    const finalUrl = await resolveSecureUrl(url);
    await WebBrowser.openBrowserAsync(finalUrl);
  } catch (err: any) {
    Alert.alert('خطأ', err?.message || 'تعذر فتح الملف');
  }
}

interface Props {
  url?: string | null;
  label?: string;
  icon?: string;
  color?: string;
}

export default function DocumentViewer({ url, label = 'عرض المستند', icon = 'document-attach-outline', color = '#0284c7' }: Props) {
  const [loading, setLoading] = React.useState(false);

  if (!url) return null;

  const handleOpen = async () => {
    setLoading(true);
    await openSecureDocument(url);
    setLoading(false);
  };

  return (
    <TouchableOpacity
      onPress={handleOpen}
      disabled={loading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${color}15`,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${color}40`,
      }}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Ionicons name={icon as any} size={18} color={color} />
      )}
      <Text style={{ color, fontWeight: '700', fontSize: 13, marginLeft: 8 }}>{label}</Text>
    </TouchableOpacity>
  );
}
