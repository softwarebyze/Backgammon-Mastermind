import { Feather } from '@expo/vector-icons';
import { HeaderButton } from 'expo-router/react-navigation';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { goBackOrHome } from '@/lib/navigation/go-back-or-home';

type Props = {
  accessibilityLabel?: string;
};

/** Always-visible leading chevron. Not a native-stack back control (those hide when canGoBack is false). */
export function StackEscapeButton({ accessibilityLabel }: Props) {
  const label = accessibilityLabel ?? translate('settings.back_a11y');
  return (
    <HeaderButton
      accessibilityLabel={label}
      testID="stack-escape-button"
      onPress={() => {
        hapticLight();
        goBackOrHome();
      }}
    >
      <Feather name="chevron-left" size={24} color={GAME_PALETTE.accent} />
    </HeaderButton>
  );
}
