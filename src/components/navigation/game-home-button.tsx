import Feather from '@expo/vector-icons/Feather';
import { StyleSheet } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';

type Props = {
  onPress: () => void;
};

export function GameHomeButton({ onPress }: Props) {
  return (
    <HoverPressable
      accessibilityRole="button"
      accessibilityLabel={translate('game.controls.leave_game_a11y')}
      testID="leave-game-button"
      onPress={() => {
        hapticLight();
        onPress();
      }}
      style={({ pressed, hovered }) => [
        styles.hit,
        hovered && styles.hitHover,
        pressed && styles.hitPressed,
      ]}
    >
      <Feather name="home" size={22} color={GAME_PALETTE.accent} />
    </HoverPressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
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
});
