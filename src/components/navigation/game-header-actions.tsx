import type { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate, useLayoutIsRTL } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOptions: () => void;
  onReset: () => void;
  /** Save the live board to Positions without leaving the game. */
  onSavePosition?: () => void;
  /** Open the game notes; omitted where the toolbar has no room for it. */
  onNotes?: () => void;
  notesCount?: number;
};

const ICON = Platform.OS === 'web' ? 22 : 20;
const HIT = 44;

export function HeaderIcon({
  name,
  label,
  onPress,
  disabled = false,
  testID,
  dim = false,
  badge,
}: {
  name: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  /** Secondary action (new game) — quieter than undo/redo/options when idle. */
  dim?: boolean;
  /** Small count over the icon's corner; hidden at 0. */
  badge?: number;
}) {
  return (
    <HoverPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={testID}
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed, hovered }) => [
        styles.hit,
        hovered && !disabled && styles.hitHover,
        pressed && !disabled && styles.hitPressed,
      ]}
    >
      <Feather
        name={name}
        size={ICON}
        color={disabled || dim ? GAME_PALETTE.accentDim : GAME_PALETTE.accent}
        style={disabled ? styles.iconDisabled : null}
      />
      {badge
        ? (
            <View style={styles.badge} pointerEvents="none">
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )
        : null}
    </HoverPressable>
  );
}

/** Always reserve undo+redo slots so the header never layout-shifts. */
export function GameHeaderActions({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOptions,
  onReset,
  onSavePosition,
  onNotes,
  notesCount = 0,
}: Props) {
  const rtl = useLayoutIsRTL();
  // No gap: the 44px hit boxes already space the icons, and the row fits a 280px landscape rail.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <HeaderIcon
        name={rtl ? 'corner-up-right' : 'corner-up-left'}
        label={translate('game.controls.undo_a11y')}
        testID="header-undo-button"
        disabled={!canUndo || !onUndo}
        onPress={() => onUndo?.()}
      />
      <HeaderIcon
        name={rtl ? 'corner-up-left' : 'corner-up-right'}
        label={translate('game.controls.redo_a11y')}
        testID="header-redo-button"
        disabled={!canRedo || !onRedo}
        onPress={() => onRedo?.()}
      />
      {onSavePosition && (
        <HeaderIcon
          name="bookmark"
          label={translate('game.controls.save_position_a11y')}
          testID="save-position-button"
          onPress={onSavePosition}
        />
      )}
      {onNotes && (
        <HeaderIcon
          name="message-square"
          label={notesCount > 0 ? translate('game.notes.count_a11y', { count: notesCount }) : translate('game.notes.button_a11y')}
          testID="game-notes-button"
          onPress={onNotes}
          badge={notesCount}
        />
      )}
      <HeaderIcon
        name="settings"
        label={translate('settings.title')}
        testID="game-settings-button"
        onPress={onOptions}
      />
      <HeaderIcon
        name="refresh-cw"
        label={translate('game.controls.start_new_game_a11y')}
        testID="reset-game-button"
        onPress={onReset}
        dim
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: HIT,
    minHeight: HIT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  hitHover: {
    backgroundColor: 'rgba(255, 196, 153, 0.12)',
  },
  hitPressed: {
    opacity: 0.7,
  },
  iconDisabled: {
    opacity: 0.35,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.control,
  },
  badgeText: {
    color: GAME_PALETTE.controlInk,
    fontSize: 10,
    lineHeight: 12,
    ...interFont('bold'),
  },
});
