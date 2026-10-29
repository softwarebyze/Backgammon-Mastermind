import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGame } from '@/features/game/use-game';
import { canOfferDouble } from '@/lib/game/match';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

export function MatchControls({ state, onRoll, onReset, isHumanTurn, isComputerTurn }: { state: GameState; onRoll: () => void; onReset: () => void; isHumanTurn: boolean; isComputerTurn: boolean }) {
  const { matchAction, isAnimating, canRedo } = useGame();
  const m = state.match!;
  const blocked = isAnimating || canRedo;
  // The offerer remains currentPlayer while the other side answers the cube.
  const humanDecision = state.mode !== 'vs-computer' || m.pendingOffer === 'black';
  if (state.phase !== 'game-over' && (m.pendingOffer ? !humanDecision : !isHumanTurn || isComputerTurn))
    return null;
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
        <Text style={[styles.buttonText, secondary && styles.secondaryText]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
      </HoverPressable>
    );
  };
  return (
    <View style={styles.wrap}>
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
  wrap: { width: '100%', alignItems: 'center' },
  row: { width: '100%', flexDirection: 'row', gap: 10, justifyContent: 'center' },
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, flexShrink: 1, borderRadius: 12, backgroundColor: GAME_PALETTE.control },
  secondary: { backgroundColor: GAME_PALETTE.bg, borderWidth: 1, borderColor: GAME_PALETTE.accent },
  hover: { opacity: 0.85 },
  dim: { opacity: 0.5 },
  buttonText: { color: GAME_PALETTE.controlInk, fontSize: 16, ...interFont('semibold') },
  secondaryText: { color: GAME_PALETTE.accent },
});
