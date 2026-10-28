import { InputAccessoryView, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function ScoreKeyboardAccessory() {
  return (
    <InputAccessoryView nativeID="position-score-keyboard" backgroundColor={GAME_PALETTE.surface}>
      <View style={styles.bar}>
        <Pressable testID="position-score-done" accessibilityRole="button" accessibilityLabel={translate('positions.done')} onPress={Keyboard.dismiss} style={({ pressed }) => [styles.done, pressed && { opacity: 0.7 }]}>
          <Text style={styles.text}>{translate('positions.done')}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: GAME_PALETTE.surfaceBorder },
  done: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  text: { ...interFont('semibold'), fontSize: 16, color: GAME_PALETTE.accent },
});
