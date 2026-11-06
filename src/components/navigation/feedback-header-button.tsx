import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { HeaderButton } from 'expo-router/react-navigation';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';

/** Settings header: one tap to tell us about a bug or an idea. */
export function FeedbackHeaderButton() {
  return (
    <HeaderButton
      testID="open-feedback-button"
      accessibilityLabel={translate('feedback.open_a11y')}
      onPress={() => {
        hapticLight();
        router.push('/feedback');
      }}
    >
      <Feather name="message-square" size={22} color={GAME_PALETTE.accentDim} />
    </HeaderButton>
  );
}
