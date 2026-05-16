/**
 * ConfirmDialog — promise-based confirm wrapper around Alert.alert.
 *
 * Usage:
 *   const ok = await confirm({ title: 'حذف', message: 'متأكد؟', destructive: true });
 *   if (ok) await api.delete(...);
 */

import { Alert } from 'react-native';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message || '',
      [
        { text: opts.cancelText || 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
        {
          text: opts.confirmText || 'تأكيد',
          style: opts.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
