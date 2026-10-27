import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { matchPlayer } from '@/features/game/match-copy';
import { useGame } from '@/features/game/use-game';
import { canOfferDouble } from '@/lib/game/match';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function MatchControls({ state, onRoll, onReset }: { state: GameState; onRoll: () => void; onReset: () => void }) {
  const { matchAction, isAnimating, canRedo } = useGame();
  const m = state.match!;
  const blocked = isAnimating || canRedo;
  const button = (id: string, label: string, onPress: () => void) => {
    const secondary = id === 'match-double' || id === 'match-drop';
    return (
      <HoverPressable
        testID={id}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: blocked }}
        disabled={blocked}
        onPress={onPress}
        style={({ pressed, hovered }) => [styles.button, secondary && styles.secondary, hovered && styles.hover, (pressed || blocked) && styles.dim]}
      >
        <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>
      </HoverPressable>
    );
  };
  return (
    <View style={styles.wrap}>
      {m.pendingOffer
        ? <Text style={styles.note}>{translate('game.match.offer', { player: matchPlayer(m.pendingOffer), opponent: matchPlayer(m.pendingOffer === 'white' ? 'black' : 'white'), value: m.cube.value * 2, points: m.cube.value })}</Text>
        : state.phase === 'rolling' && <Text style={styles.note}>{translate('game.match.roll_note')}</Text>}
      <View style={styles.row}>
        {m.pendingOffer
          ? (
              <>
                {button('match-drop', translate('game.match.drop'), () => matchAction?.('drop'))}
                {button('match-accept', translate('game.match.accept'), () => matchAction?.('accept'))}
              </>
            )
          : state.phase === 'game-over'
            ? button('match-next', translate(m.winner ? 'game.match.new_match' : 'game.match.next_game'), m.winner ? onReset : () => matchAction?.('next'))
            : (
                <>
                  {canOfferDouble(state) && button('match-double', translate('game.match.double'), () => matchAction?.('offer'))}
                  {button('roll-dice-button', translate('game.controls.roll_dice'), onRoll)}
                </>
              )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 8, alignItems: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  note: { color: GAME_PALETTE.textMuted, fontSize: 13, textAlign: 'center', ...interFont('regular') },
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: GAME_PALETTE.control },
  secondary: { backgroundColor: GAME_PALETTE.bg, borderWidth: 1, borderColor: GAME_PALETTE.accent },
  hover: { opacity: 0.85 },
  dim: { opacity: 0.5 },
  buttonText: { color: GAME_PALETTE.controlInk, fontSize: 16, ...interFont('semibold') },
  secondaryText: { color: GAME_PALETTE.accent },
});
