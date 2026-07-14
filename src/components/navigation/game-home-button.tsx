import { Feather } from '@expo/vector-icons';
import { HeaderButton } from 'expo-router/react-navigation';
import { StyleSheet, View } from 'react-native';

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
      <View style={styles.hit}>
        <Feather name="home" size={22} color={GAME_PALETTE.accent} />
      </View>
    </HeaderButton>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
