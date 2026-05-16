/**
 * FilePicker — Unified file/image picker abstraction.
 * Wraps expo-image-picker (gallery+camera) and expo-document-picker (PDF/files).
 *
 * Usage:
 *   const file = await pickFile({ types: ['image', 'pdf'] });
 *   if (file) formData.append('labFile', { uri, name, type } as any);
 */

import { Alert, ActionSheetIOS, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export type PickedFile = {
  uri: string;
  name: string;
  type: string; // mime
  size?: number;
};

export type PickOptions = {
  /** which sources to allow: image (gallery), camera, pdf, any */
  types?: Array<'image' | 'camera' | 'pdf' | 'any'>;
  /** allow multiple files (PDFs/docs only) */
  multiple?: boolean;
};

export async function pickFile(opts: PickOptions = {}): Promise<PickedFile | null> {
  const types = opts.types || ['image', 'camera', 'pdf'];

  // Build the action list once so iOS / Android branches stay in sync.
  const actions: { label: string; run: () => Promise<PickedFile | null> }[] = [];
  if (types.includes('camera')) actions.push({ label: 'الكاميرا', run: pickFromCamera });
  if (types.includes('image'))  actions.push({ label: 'المعرض',   run: pickFromGallery });
  if (types.includes('pdf') || types.includes('any')) {
    const allowAny = types.includes('any');
    actions.push({ label: 'ملف PDF / مستند', run: () => pickDocument(allowAny) });
  }

  // iOS: use ActionSheetIOS — Alert collapses badly with 4+ buttons.
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      const labels = [...actions.map((a) => a.label), 'إلغاء'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1, title: 'اختر مصدر الملف' },
        async (idx) => {
          if (idx === labels.length - 1 || idx == null) return resolve(null);
          try { resolve(await actions[idx].run()); }
          catch { resolve(null); }
        },
      );
    });
  }

  // Android / web fall back to Alert (3 buttons usually fits).
  return new Promise((resolve) => {
    const buttons = actions.map((a) => ({
      text: a.label,
      onPress: async () => {
        try { resolve(await a.run()); }
        catch { resolve(null); }
      },
    }));
    buttons.push({ text: 'إلغاء', style: 'cancel', onPress: () => resolve(null) } as any);
    Alert.alert('اختر مصدر الملف', '', buttons as any);
  });
}

async function pickFromCamera(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('صلاحية مرفوضة', 'نحتاج صلاحية الكاميرا');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return assetToFile(res.assets[0]);
}

async function pickFromGallery(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('صلاحية مرفوضة', 'نحتاج صلاحية المعرض');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return assetToFile(res.assets[0]);
}

async function pickDocument(any = false): Promise<PickedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: any ? '*/*' : ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  return {
    uri: a.uri,
    name: a.name || `file-${Date.now()}`,
    type: a.mimeType || 'application/octet-stream',
    size: a.size,
  };
}

function assetToFile(a: ImagePicker.ImagePickerAsset): PickedFile {
  const ext = a.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mime = a.mimeType || (ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg');
  return {
    uri: Platform.OS === 'ios' ? a.uri.replace('file://', '') : a.uri,
    name: a.fileName || `image-${Date.now()}.${ext}`,
    type: mime,
    size: a.fileSize,
  };
}

/** Append a PickedFile to a FormData object under the given field name. */
export function appendFile(fd: FormData, field: string, file: PickedFile) {
  // React Native FormData accepts { uri, name, type } objects
  fd.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);
}
