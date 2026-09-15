import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { discardQuarantinedSession } from '@/lib/game/persistence';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  onDismiss: () => void;
};

export function SavedGameRecoveryBanner({ onDismiss }: Props) {
  return (
    <View
      accessibilityRole="alert"
      testID="saved-game-recovery-banner"
      style={styles.banner}
    >
      <Text style={styles.title}>{translate('home.recovery_title')}</Text>
      <Text style={styles.body}>{translate('home.recovery_body')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('home.recovery_dismiss')}
        testID="saved-game-recovery-dismiss"
        style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
        onPress={() => {
          discardQuarantinedSession();
          onDismiss();
        }}
      >
        <Text style={styles.dismissLabel}>{translate('home.recovery_dismiss')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    backgroundColor: '#2A1410',
    borderWidth: 1,
    borderColor: '#8B3A2F',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
    ...continuousRadius(12),
  },
  title: {
    color: '#F0C0B0',
    fontSize: 14,
    ...interFont('bold'),
  },
  body: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 18,
    ...interFont('regular'),
  },
  dismiss: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#8B3A2F',
    ...continuousRadius(8),
  },
  dismissLabel: {
    color: '#F5F0E8',
    fontSize: 13,
    ...interFont('semibold'),
  },
  pressed: {
    opacity: 0.88,
  },
});
