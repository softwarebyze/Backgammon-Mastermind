import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { pickerStyles } from './position-picker-styles';

/**
 * A card over the dimmed screen; tapping outside it closes it. A modal, so it
 * is never clipped by a small or landscape board.
 */
export function BoardPicker({ testID, title, action, onClose, children }: {
  testID: string;
  title: string;
  /** Beside the title, e.g. Done. */
  action?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={pickerStyles.overlay} testID={testID}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={translate('positions.done')} testID={`${testID}-close`} onPress={onClose} />
        <View style={pickerStyles.card}>
          <View style={pickerStyles.heading}>
            <Text style={pickerStyles.title}>{title}</Text>
            {action}
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
