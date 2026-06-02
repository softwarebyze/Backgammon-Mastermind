import { Feather } from '@expo/vector-icons';
import { HeaderButton } from 'expo-router/react-navigation';
import { View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';

type Props = {
  onOptions: () => void;
  onReset: () => void;
};

export function GameHeaderActions({ onOptions, onReset }: Props) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
