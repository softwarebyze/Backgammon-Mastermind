import { Feather } from '@expo/vector-icons';
import { HeaderButton } from 'expo-router/react-navigation';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';

type Props = {
  onPress: () => void;
};

export function GameHomeButton({ onPress }: Props) {
  return (
    <HeaderButton
      accessibilityLabel="Leave game and return home"
      testID="leave-game-button"
      onPress={() => {
        hapticLight();
        onPress();
      }}
    >
      <Feather name="home" size={22} color={GAME_PALETTE.accent} />
    </HeaderButton>
  );
}
