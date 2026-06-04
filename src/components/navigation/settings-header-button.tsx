import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { HeaderButton } from 'expo-router/react-navigation';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';

export function SettingsHeaderButton() {
  return (
    <HeaderButton
      accessibilityLabel="Settings"
      onPress={() => {
        hapticLight();
        router.push('/settings');
      }}
    >
      <Feather name="settings" size={22} color={GAME_PALETTE.accentDim} />
    </HeaderButton>
  );
}
