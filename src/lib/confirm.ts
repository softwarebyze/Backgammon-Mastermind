import { Alert, Platform } from 'react-native';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

type ConfirmHandler = (opts: ConfirmOptions) => void;

let registeredHandler: ConfirmHandler | null = null;

export function registerConfirmHandler(handler: ConfirmHandler | null): void {
  registeredHandler = handler;
}

function nativeFallback({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmOptions): void {
  if (Platform.OS === 'web') {
    const ok
      = typeof globalThis.confirm === 'function'
        // eslint-disable-next-line no-alert -- last-resort web fallback when the in-app dialog is unmounted
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

/**
 * Cross-platform confirm. Prefers the in-app dialog (web-safe); falls back to
 * `Alert.alert` / `window.confirm` before the host mounts (tests).
 */
export function confirmAction(opts: ConfirmOptions): void {
  if (registeredHandler) {
    registeredHandler(opts);
    return;
  }
  nativeFallback(opts);
}
