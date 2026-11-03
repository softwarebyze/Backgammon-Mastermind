import type { MoneyCubeHint } from '../money-cube-hint';
import type { GameState } from '@/lib/game/types';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { controlButtonStyles } from '@/features/game/control-buttons';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { getMoneyCubeHint } from '@/features/game/money-cube-hint';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

/** Advice never commits a cube action; the player uses Double, Take or Pass themselves. */
export function MoneyCubeHintButton({ state, disabled }: { state: GameState; disabled: boolean }) {
  const [answer, setAnswer] = useState<{ state: GameState; request: number; value: MoneyCubeHint | 'loading' | 'error' | 'unsupported' } | null>(null);
  const current = useRef({ state, disabled });
  current.current = { state, disabled };
  const request = useRef(0);
  useEffect(() => () => {
    request.current++;
  }, []);
  useEffect(() => {
    request.current++;
  }, [state, disabled]);
  const visible = answer?.state === state && answer.request === request.current && !disabled;
  const dismiss = () => {
    request.current++;
    setAnswer(null);
  };
  const ask = async () => {
    if (disabled || (visible && answer.value === 'loading'))
      return;
    hapticLight();
    const id = ++request.current;
    setAnswer({ state, request: id, value: 'loading' });
    try {
      const value = await getMoneyCubeHint(state);
      if (id === request.current && current.current.state === state && !current.current.disabled)
        setAnswer({ state, request: id, value });
    }
    catch (error) {
      if (id === request.current && current.current.state === state && !current.current.disabled)
        setAnswer({ state, request: id, value: error instanceof Error && error.message === 'unsupported_money_rules' ? 'unsupported' : 'error' });
    }
  };
  const value = visible ? answer.value : null;
  const label = value === 'no_double'
    ? translate('game.money.no_double')
    : value && value !== 'loading' && value !== 'error' && value !== 'unsupported' ? translate(`game.match.${value}`) : '';
  return (
    <>
      <Pressable testID="cube-hint-button" accessibilityRole="button" accessibilityLabel={translate('game.money.cube_hint')} disabled={disabled} onPress={ask} style={[controlButtonStyles.secondary, styles.button, disabled && styles.disabled]}>
        <Text style={controlButtonStyles.secondaryText}>{translate('game.hint.button')}</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
        <View style={styles.scrim}>
          <View style={styles.card} accessibilityViewIsModal>
            <Text style={styles.title}>{translate('game.money.cube_hint')}</Text>
            <Text style={styles.text}>{translate('game.money.rules')}</Text>
            {value === 'loading'
              ? (
                  <>
                    <ActivityIndicator color={GAME_PALETTE.accent} />
                    <Text style={styles.text}>{translate('game.hint.finding')}</Text>
                  </>
                )
              : <Text testID="cube-hint-result" accessibilityLiveRegion="polite" style={styles.result}>{value === 'unsupported' ? translate('game.money.hint_rules') : value === 'error' ? translate('game.hint.error') : label}</Text>}
            {value === 'error' && <Pressable testID="cube-hint-retry" accessibilityRole="button" onPress={ask} style={[controlButtonStyles.primary, styles.button]}><Text style={controlButtonStyles.primaryText}>{translate('game.hint.button')}</Text></Pressable>}
            <Pressable testID="cube-hint-dismiss" accessibilityRole="button" onPress={dismiss} style={[controlButtonStyles.secondary, styles.button]}><Text style={controlButtonStyles.secondaryText}>{translate('game.hint.back_to_turn')}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { paddingHorizontal: 12, minWidth: 68, flexShrink: 1 },
  disabled: { opacity: 0.5 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 360, padding: 20, gap: 16, backgroundColor: GAME_PALETTE.surface, borderRadius: 16 },
  title: { color: GAME_PALETTE.textMuted, fontSize: 16, textAlign: 'center', ...interFont('medium') },
  text: { color: GAME_PALETTE.textMuted, textAlign: 'center' },
  result: { color: GAME_PALETTE.text, fontSize: 24, textAlign: 'center', ...interFont('semibold') },
});
