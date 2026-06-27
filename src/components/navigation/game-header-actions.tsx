import { Feather } from '@expo/vector-icons';
import { HeaderButton } from 'expo-router/react-navigation';
import { View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOptions: () => void;
  onReset: () => void;
};

export function GameHeaderActions({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOptions,
  onReset,
}: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <HeaderButton
        accessibilityLabel="Undo move"
        testID="undo-move-button"
        disabled={!canUndo}
        onPress={() => {
          hapticLight();
          onUndo();
        }}
      >
        <Feather
          name="corner-up-left"
          size={20}
          color={canUndo ? GAME_PALETTE.accent : GAME_PALETTE.textMuted}
        />
      </HeaderButton>
      <HeaderButton
        accessibilityLabel="Redo move"
        testID="redo-move-button"
        disabled={!canRedo}
        onPress={() => {
          hapticLight();
          onRedo();
        }}
      >
        <Feather
          name="corner-up-right"
          size={20}
          color={canRedo ? GAME_PALETTE.accent : GAME_PALETTE.textMuted}
        />
      </HeaderButton>
      <HeaderButton
        accessibilityLabel="Game options"
        onPress={() => {
          hapticLight();
          onOptions();
        }}
      >
        <Feather name="sliders" size={22} color={GAME_PALETTE.accent} />
      </HeaderButton>
      <HeaderButton
        accessibilityLabel="Start new game"
        onPress={() => {
          hapticLight();
          onReset();
        }}
      >
        <Feather name="refresh-cw" size={20} color={GAME_PALETTE.accentDim} />
      </HeaderButton>
    </View>
  );
}
