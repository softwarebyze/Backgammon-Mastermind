import type { GameState } from '@/lib/game';
import { StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { CubeHintButton } from '@/features/game/components/cube-hint-button';
import { controlButtonStyles } from '@/features/game/control-buttons';
import { useGame } from '@/features/game/use-game';
import { canBeaver, canOfferDouble } from '@/lib/game/match';
import { translate } from '@/lib/i18n';

export function MatchControls({ state, onRoll, onReset, isHumanTurn, isComputerTurn }: { state: GameState; onRoll: () => void; onReset: () => void; isHumanTurn: boolean; isComputerTurn: boolean }) {
  const { matchAction, isAnimating, canRedo, canBranchCubeHistory } = useGame();
  const m = state.match!;
  const blocked = isAnimating || (canRedo && !canBranchCubeHistory);
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
        style={({ pressed, hovered }) => [secondary ? controlButtonStyles.secondary : controlButtonStyles.primary, styles.button, hovered && styles.hover, (pressed || blocked) && styles.dim]}
      >
        <Text style={secondary ? controlButtonStyles.secondaryText : controlButtonStyles.primaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
      </HoverPressable>
    );
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {state.phase === 'rolling' && !m.result && (m.pendingOffer || canOfferDouble(state)) && <CubeHintButton state={state} disabled={blocked} />}
        {m.pendingOffer
          ? (
              <>
                {button('match-drop', translate('game.match.drop'), () => matchAction?.('drop'))}
                {canBeaver(state) && button('match-beaver', translate('game.match.beaver'), () => matchAction?.('beaver'))}
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
  row: { width: '100%', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  button: { paddingHorizontal: 8, minWidth: 56, flexShrink: 1 },
  hover: { opacity: 0.85 },
  dim: { opacity: 0.5 },
});
