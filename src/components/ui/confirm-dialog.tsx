import type { ConfirmOptions } from '@/lib/confirm';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { registerConfirmHandler } from '@/lib/confirm';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/**
 * In-app confirm so web (and native) never depend on `window.confirm` /
 * `Alert.alert`, which are no-ops or blocked in some browsers.
 *
 * `animationType="none"` — a fade animates the title and buttons with the
 * scrim, which reads as low-opacity overlapping text for ~1s on web.
 */
export function ConfirmDialogHost() {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    registerConfirmHandler(opts => setPending(opts));
    return () => registerConfirmHandler(null);
  }, []);

  const close = useCallback(() => setPending(null), []);
  const confirm = useCallback(() => {
    const action = pending?.onConfirm;
    setPending(null);
    action?.();
  }, [pending]);

  if (!pending) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View style={styles.scrim}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{pending.title}</Text>
          <Text style={styles.message}>{pending.message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pending.cancelLabel ?? 'Cancel'}
              testID="confirm-dialog-cancel"
              style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
              onPress={close}
            >
              <Text style={styles.btnGhostLabel}>{pending.cancelLabel ?? 'Cancel'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={pending.confirmLabel}
              testID="confirm-dialog-confirm"
              style={({ pressed }) => [
                styles.btn,
                pending.destructive ? styles.btnDanger : styles.btnPrimary,
                pressed && styles.pressed,
              ]}
              onPress={confirm}
            >
              <Text style={pending.destructive ? styles.btnDangerLabel : styles.btnPrimaryLabel}>
                {pending.confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: GAME_PALETTE.surface,
    padding: 20,
    gap: 12,
    ...continuousRadius(16),
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 18,
    ...interFont('bold'),
  },
  message: {
    color: GAME_PALETTE.text,
    fontSize: 15,
    lineHeight: 22,
    ...interFont('regular'),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 88,
    alignItems: 'center',
    ...continuousRadius(10),
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostLabel: {
    color: GAME_PALETTE.textMuted,
    fontSize: 15,
    ...interFont('semibold'),
  },
  btnPrimary: {
    backgroundColor: GAME_PALETTE.accent,
  },
  btnPrimaryLabel: {
    color: GAME_PALETTE.bg,
    fontSize: 15,
    ...interFont('semibold'),
  },
  btnDanger: {
    backgroundColor: '#8B3A2F',
  },
  btnDangerLabel: {
    color: '#F5F0E8',
    fontSize: 15,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
