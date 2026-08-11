import type { ReactNode } from 'react';
import { Feather } from '@expo/vector-icons';
import { HeaderButton } from 'expo-router/react-navigation';
import { Platform, StyleSheet, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';

type Props = {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onCoach?: () => void;
  onOptions: () => void;
  onReset: () => void;
};

const ICON = Platform.OS === 'web' ? 22 : 20;
const GAP = Platform.OS === 'web' ? 8 : 0;
const HIT = 44;

function HeaderIconSlot({ children }: { children: ReactNode }) {
  return <View style={styles.hit}>{children}</View>;
}

/** Always reserve undo+redo slots so the header never layout-shifts. */
export function GameHeaderActions({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onCoach,
  onOptions,
  onReset,
}: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP }}>
      <HeaderButton
        accessibilityLabel="Undo move"
        disabled={!canUndo || !onUndo}
        onPress={() => {
          if (!canUndo || !onUndo) {
            return;
          }
          hapticLight();
          onUndo();
        }}
      >
        <HeaderIconSlot>
          <Feather
            name="corner-up-left"
            size={ICON}
            color={canUndo ? GAME_PALETTE.accent : GAME_PALETTE.accentDim}
            style={{ opacity: canUndo ? 1 : 0.35 }}
          />
        </HeaderIconSlot>
      </HeaderButton>
      <HeaderButton
        accessibilityLabel="Redo move"
        disabled={!canRedo || !onRedo}
        onPress={() => {
          if (!canRedo || !onRedo) {
            return;
          }
          hapticLight();
          onRedo();
        }}
      >
        <HeaderIconSlot>
          <Feather
            name="corner-up-right"
            size={ICON}
            color={canRedo ? GAME_PALETTE.accent : GAME_PALETTE.accentDim}
            style={{ opacity: canRedo ? 1 : 0.35 }}
          />
        </HeaderIconSlot>
      </HeaderButton>
      {onCoach
        ? (
            <HeaderButton
              accessibilityLabel={translate('coach.a11y_open')}
              onPress={() => {
                hapticLight();
                onCoach();
              }}
            >
              <HeaderIconSlot>
                <Feather name="message-circle" size={ICON} color={GAME_PALETTE.accent} />
              </HeaderIconSlot>
            </HeaderButton>
          )
        : null}
      <HeaderButton
        accessibilityLabel={translate('game.options.title')}
        onPress={() => {
          hapticLight();
          onOptions();
        }}
      >
        <HeaderIconSlot>
          <Feather name="sliders" size={ICON} color={GAME_PALETTE.accent} />
        </HeaderIconSlot>
      </HeaderButton>
      <HeaderButton
        accessibilityLabel="Start new game"
        onPress={() => {
          hapticLight();
          onReset();
        }}
      >
        <HeaderIconSlot>
          <Feather name="refresh-cw" size={ICON} color={GAME_PALETTE.accentDim} />
        </HeaderIconSlot>
      </HeaderButton>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: HIT,
    minHeight: HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
