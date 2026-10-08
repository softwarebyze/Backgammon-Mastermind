import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { HeaderButton } from 'expo-router/react-navigation';
import { Platform, StyleSheet, Text } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { goBackOrHome } from '@/lib/navigation/go-back-or-home';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  accessibilityLabel?: string;
};

function escapeLabel(): string {
  return router.canGoBack()
    ? translate('navigation.back')
    : translate('navigation.home');
}

/** Web: chevron. Native mobile: text escape (no return glyph) with goBackOrHome(). */
export function StackEscapeButton({ accessibilityLabel }: Props) {
  const label = escapeLabel();
  const a11y = accessibilityLabel ?? (router.canGoBack()
    ? translate('navigation.back_a11y')
    : translate('navigation.home_a11y'));

  return (
    <HeaderButton
      accessibilityLabel={a11y}
      testID="stack-escape-button"
      onPress={() => {
        hapticLight();
        goBackOrHome();
      }}
    >
      {Platform.OS === 'web'
        ? (
            <Feather name="chevron-left" size={24} color={GAME_PALETTE.accent} testID="stack-escape-chevron" />
          )
        : (
            <Text style={styles.nativeLabel} testID="stack-escape-label">{label}</Text>
          )}
    </HeaderButton>
  );
}

const styles = StyleSheet.create({
  nativeLabel: {
    color: GAME_PALETTE.accent,
    fontSize: 17,
    ...interFont('regular'),
    paddingHorizontal: 4,
  },
});
