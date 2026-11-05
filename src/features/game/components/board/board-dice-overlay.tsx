import type { BoardDice, BoardDiceSide } from './board-dice-layout';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { diceSwapLabel } from '@/features/game/dice-swap-label';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

import { boardDiceSide, boardDieGap, boardDieSize, boardHalfFrame, hasBoardDice } from './board-dice-layout';
import { DiceDisplay, SingleDie } from './dice-display';

function HalfSlot({
  dims,
  side,
  surface,
  children,
  testID,
}: {
  dims: BoardDimensions;
  side: BoardDiceSide;
  surface: { left: number; top: number };
  children: React.ReactNode;
  testID: string;
}) {
  const half = boardHalfFrame(dims, side);
  return (
    <View
      // Only the dice-order swap target takes touches; the rest of the half
      // stays tappable for the checkers underneath.
      pointerEvents="box-none"
      testID={testID}
      style={{
        position: 'absolute',
        left: surface.left + half.left,
        top: surface.top,
        width: half.width,
        height: dims.boardHeight,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
      {children}
    </View>
  );
}

/** The rolled dice drawn on the board itself, in the roller's half. */
export function BoardDiceOverlay({
  value,
  dimensions,
  surface,
}: {
  value: BoardDice;
  dimensions: BoardDimensions;
  surface: { left: number; top: number };
}) {
  if (!hasBoardDice(value)) {
    return null;
  }
  const size = boardDieSize(dimensions.checkerSize, 6 * dimensions.colWidth);
  const { opening } = value;

  if (opening) {
    return (
      <>
        <HalfSlot dims={dimensions} side={boardDiceSide('white')} surface={surface} testID="board-dice-white">
          <SingleDie
            value={opening.dice[0]}
            playerColor="white"
            emphasized={opening.emphasis === 0}
            displayStyle={value.displayStyle}
            animateRoll={value.animateRoll}
            size={size}
          />
        </HalfSlot>
        <HalfSlot dims={dimensions} side={boardDiceSide('black')} surface={surface} testID="board-dice-black">
          <SingleDie
            value={opening.dice[1]}
            playerColor="black"
            emphasized={opening.emphasis === 1}
            displayStyle={value.displayStyle}
            animateRoll={value.animateRoll}
            size={size}
          />
        </HalfSlot>
      </>
    );
  }

  const side = boardDiceSide(value.player);
  const order = value.diceOrder;
  const dice = (
    <DiceDisplay
      dice={value.dice}
      leadingRTL={order?.leadingRTL}
      remainingDice={value.remainingDice}
      playerColor={value.player}
      displayStyle={value.displayStyle}
      animateRoll={value.animateRoll}
      size={size}
      gap={boardDieGap(size)}
    />
  );
  return (
    <HalfSlot dims={dimensions} side={side} surface={surface} testID={`board-dice-${side}`}>
      {/* No enter/exit fade: stepping through the history changes sides
          and would fade the dice out and back in (a visible flicker). The
          dice's own settle pulse marks a new roll. */}
      {order
        ? <SwapTarget dice={value.dice} order={order}>{dice}</SwapTarget>
        : <View pointerEvents="none">{dice}</View>}
    </HalfSlot>
  );
}

/**
 * With "Move in dice order" on, the dice and the Swap label under them are one
 * button. The same element stays mounted in every phase so the roll animation
 * never restarts, and the label's row is always reserved so showing or hiding
 * Swap never moves the dice.
 */
function SwapTarget({
  dice,
  order,
  children,
}: {
  dice: [number, number];
  order: NonNullable<BoardDice['diceOrder']>;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const { canSwap, onSwap } = order;
  return (
    <Pressable
      testID="dice-swap-target"
      accessible={canSwap}
      focusable={canSwap}
      disabled={!canSwap}
      pointerEvents={canSwap ? 'auto' : 'none'}
      accessibilityRole={canSwap ? 'button' : undefined}
      accessibilityLabel={canSwap ? diceSwapLabel(dice) : undefined}
      accessibilityHint={canSwap ? translate('game.controls.swap_dice_hint') : undefined}
      onPress={() => {
        hapticLight();
        onSwap();
      }}
      style={({ pressed }) => [
        styles.target,
        canSwap && pressed && (reducedMotion ? styles.pressedReduced : styles.pressed),
      ]}
    >
      {children}
      <View style={styles.labelSlot}>
        {canSwap && (
          <View style={styles.label} testID="swap-dice-button">
            <Feather name="repeat" size={11} color="#fff" />
            <Text style={styles.labelText} maxFontSizeMultiplier={1.3}>{translate('game.controls.swap_dice')}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const LABEL_HEIGHT = 20;
const LABEL_GAP = 4;

const styles = StyleSheet.create({
  // The label row hangs below the dice; the same space above keeps the dice
  // centred in the half, exactly where they sit with the setting off.
  target: { alignItems: 'center', gap: LABEL_GAP, paddingHorizontal: 8, paddingTop: LABEL_HEIGHT + LABEL_GAP },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  pressedReduced: { opacity: 0.7 },
  labelSlot: { height: LABEL_HEIGHT, justifyContent: 'center' },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    height: LABEL_HEIGHT,
    borderRadius: LABEL_HEIGHT / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  labelText: { color: '#fff', fontSize: 12, lineHeight: 16, ...interFont('semibold') },
});
