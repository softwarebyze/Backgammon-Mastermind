import type { ComponentProps } from 'react';
import { Feather } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';

type Props = {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOptions: () => void;
  onReset: () => void;
};

const ICON = Platform.OS === 'web' ? 22 : 20;
const GAP = Platform.OS === 'web' ? 8 : 0;
const HIT = 44;

function HeaderIcon({
  name,
  label,
  onPress,
  disabled = false,
  testID,
  dim = false,
}: {
  name: ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  /** Secondary action (new game) — quieter than undo/redo/options when idle. */
  dim?: boolean;
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
        // Disabled: a legible gray, not accent at 35% (which vanished on the dark brown).
        color={disabled ? GAME_PALETTE.textMuted : dim ? GAME_PALETTE.accentDim : GAME_PALETTE.accent}
        style={disabled ? styles.iconDisabled : null}
      />
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
}: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP }}>
      <HeaderIcon
        name="corner-up-left"
        label={translate('game.controls.undo_a11y')}
        disabled={!canUndo || !onUndo}
        onPress={() => onUndo?.()}
      />
      <HeaderIcon
        name="corner-up-right"
        label={translate('game.controls.redo_a11y')}
        disabled={!canRedo || !onRedo}
        onPress={() => onRedo?.()}
      />
      <HeaderIcon
        name="sliders"
        label={translate('settings.title')}
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
    opacity: 0.6,
  },
});
