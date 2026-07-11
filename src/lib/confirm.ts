import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

/**
 * Cross-platform confirm. `Alert.alert` is a no-op on React Native Web,
 * so web uses `window.confirm` instead.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmOptions): void {
  if (Platform.OS === 'web') {
    // RN Alert.alert is a no-op on web — native confirm is the reliable path (#91).
    const ok
      = typeof globalThis.confirm === 'function'
        // eslint-disable-next-line no-alert -- intentional web fallback for #91
        && globalThis.confirm(`${title}\n\n${message}`);
    if (ok) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
