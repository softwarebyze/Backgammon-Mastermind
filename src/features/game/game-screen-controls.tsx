import type { S1Variants } from '@/features/game/s1-prototype';
import type { GameState } from '@/lib/game';
import type { OpeningTray } from '@/lib/game/opening-display';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { BlunderInlineCard } from '@/features/game/components/blunder-inline-card';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { DiceDisplay } from '@/features/game/components/board/dice-display';

import { HintButton } from '@/features/game/components/hint-button';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGuidance } from '@/features/game/guidance-store';
import { TRAY_DIE_SIZE } from '@/features/game/hooks/use-board-dimensions';
import { getS1Variants } from '@/features/game/s1-prototype';
import { isTurnStart } from '@/lib/game';
import { isAwaitingMoveConfirm } from '@/lib/game-preferences/confirm-move';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { getActionCaption, getTurnDisplay } from '@/lib/game/turn-display';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  state: GameState;
  /** Live dice/phase for tray + ceremony handoff (ignore review scrub). */
  liveDiceState: GameState;
  isHumanTurn: boolean;
  isComputerTurn: boolean;
  isReviewing?: boolean;
  /** Move-log length for hint-session staleness tracking. */
  moveLogLength: number;
  /** Ephemeral caption override (e.g. "Roll the dice first", opening copy). */
  captionOverride?: string | null;
  /** Opening roll in progress / being revealed: white-left, black-right tray. */
  opening?: OpeningTray | null;
  onRoll: () => void;
  onReset: () => void;
  onGoLive?: () => void;
  onCancelSelection?: () => void;
  /** Confirm move: end the held turn. */
  onConfirmMove?: () => void;
  /** Confirm move: undo the last checker (reuses live undo). */
  onUndoMove?: () => void;
  canUndoMove?: boolean;
  /** Tighter padding when dice sit beside the board in landscape. */
  compact?: boolean;
  /** Tray die edge; the layout derives it from the board's checker size. */
  dieSize?: number;
};

const ACTION_SLOT_HEIGHT = 52;
const CONTROL_HIT_SLOP = 16;

export function GameScreenControls({
  state,
  liveDiceState,
  isHumanTurn,
  isComputerTurn,
  isReviewing = false,
  moveLogLength,
  captionOverride = null,
  opening = null,
  onRoll,
  onReset,
  onGoLive,
  onCancelSelection,
  onConfirmMove,
  onUndoMove,
  canUndoMove = false,
  compact = false,
  dieSize = TRAY_DIE_SIZE,
}: Props) {
  const { preferences } = useGamePreferences();
  const guidance = useGuidance();
  const variants = getS1Variants();
  const hintCardOpen = guidance?.kind === 'hint' && guidance.revealed;
  const blunderInline = variants.tutor === 'b' && guidance?.kind === 'blunder' && !!guidance.verdict;
  const turn = getTurnDisplay(state);
  const awaitingConfirm = isHumanTurn && !isReviewing && !!onConfirmMove
    && isAwaitingMoveConfirm(state, preferences.confirmMove);
  const caption = captionOverride
    ?? (isReviewing
      ? translate('game.review.viewing_hint')
      : awaitingConfirm && variants.confirm !== 'today'
        ? (variants.confirm === 'b' ? 'Tap the dice to end your turn' : 'Confirm to end your turn')
        : getActionCaption(state, turn));

  const diceForTray = isReviewing ? state : liveDiceState;
  const showOpening = opening !== null && !isReviewing;
  // Confirm option B: the spent dice are the Confirm control.
  const diceConfirm = awaitingConfirm && variants.confirm === 'b' && !blunderInline;

  return (
    <View style={[styles.controls, compact && styles.controlsCompact]}>
      <DiceTrayShell
        asConfirm={diceConfirm}
        onConfirm={() => {
          hapticLight();
          onConfirmMove?.();
        }}
      >
        {showOpening
          ? (
              // Opening: each side's die in its own color; the engine hands these
              // same two values to the winner, so nothing has to travel.
              <DiceDisplay
                dice={opening.dice}
                remainingDice={opening.dice.filter(v => v !== 0)}
                playerColor={diceForTray.currentPlayer}
                slotColors={['white', 'black']}
                emphasis={opening.emphasis}
                displayStyle={preferences.diceDisplayStyle}
                size={dieSize}
              />
            )
          : (
              <DiceDisplay
                dice={diceForTray.dice}
                remainingDice={diceForTray.remainingDice}
                playerColor={diceForTray.currentPlayer}
                displayStyle={preferences.diceDisplayStyle}
                animateRoll={!isReviewing}
                size={dieSize}
              />
            )}
      </DiceTrayShell>
      <View
        style={hintCardOpen || blunderInline ? styles.actionSlotOpen : styles.actionSlot}
        pointerEvents="auto"
        testID="game-action-slot"
      >
        {blunderInline
          ? <BlunderInlineCard />
          : (
              <ActionControl
                state={state}
                isHumanTurn={isHumanTurn}
                isComputerTurn={isComputerTurn}
                isReviewing={isReviewing}
                moveLogLength={moveLogLength}
                confirmMoveEnabled={preferences.confirmMove}
                onRoll={() => {
                  hapticLight();
                  onRoll();
                }}
                onReset={onReset}
                onGoLive={onGoLive}
                onCancelSelection={onCancelSelection}
                onConfirmMove={onConfirmMove}
                onUndoMove={onUndoMove}
                canUndoMove={canUndoMove}
                confirmVariant={variants.confirm}
              />
            )}
      </View>
      {variants.banner === 'merged' && !blunderInline
        ? <MergedCaption state={state} caption={caption} isReviewing={isReviewing} />
        : <Text style={styles.caption}>{caption}</Text>}
    </View>
  );
}

/**
 * S1-I: the turn banner folded into the caption line. The checker token
 * carries whose turn it is; the text is the action caption, or the banner
 * headline when the caption would be blank (opponent rolling/moving).
 */
function MergedCaption({ state, caption, isReviewing }: { state: GameState; caption: string; isReviewing: boolean }) {
  const turn = getTurnDisplay(state);
  const text = caption.trim().length > 0 ? caption : turn.headline;
  if (state.phase === 'game-over' || state.phase === 'opening-roll')
    return <Text style={styles.caption}>{text}</Text>;
  return (
    <View style={styles.mergedCaption} accessibilityRole="text" accessibilityLabel={`${turn.colorLabel}. ${text}`} testID="merged-caption">
      {!isReviewing && <CheckerToken player={turn.player} size={14} flat />}
      <Text style={[styles.mergedCaptionText, turn.isWaiting && styles.mergedCaptionWaiting]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Confirm option B: the dice tray doubles as the Confirm control once the
 * dice are spent. A gold ring + check badge marks the state; the tray keeps
 * its place, so no new element appears.
 */
function DiceTrayShell({ asConfirm, onConfirm, children }: { asConfirm: boolean; onConfirm: () => void; children: React.ReactNode }) {
  if (!asConfirm)
    return <View style={styles.diceRow} pointerEvents="none">{children}</View>;
  return (
    <HoverPressable
      accessibilityRole="button"
      accessibilityLabel={translate('game.controls.confirm_move_a11y')}
      testID="confirm-move-button"
      onPress={onConfirm}
      hitSlop={CONTROL_HIT_SLOP}
      style={({ pressed, hovered }) => [
        styles.diceRow,
        styles.diceConfirm,
        hovered && styles.primaryBtnHover,
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.diceConfirmInner}>{children}</View>
      <View style={styles.diceConfirmBadge} pointerEvents="none">
        <Feather name="check" size={14} color={GAME_PALETTE.controlInk} />
      </View>
      <Text style={styles.diceConfirmLabel} pointerEvents="none">Confirm</Text>
    </HoverPressable>
  );
}

/* eslint-disable-next-line max-lines-per-function -- phase switch + cancel slot */
function ActionControl({
  state,
  isHumanTurn,
  isComputerTurn,
  isReviewing,
  moveLogLength,
  confirmMoveEnabled,
  onRoll,
  onReset,
  onGoLive,
  onCancelSelection,
  onConfirmMove,
  onUndoMove,
  canUndoMove,
  confirmVariant,
}: {
  state: GameState;
  isHumanTurn: boolean;
  isComputerTurn: boolean;
  isReviewing: boolean;
  moveLogLength: number;
  confirmMoveEnabled: boolean;
  onRoll: () => void;
  onReset: () => void;
  onGoLive?: () => void;
  onCancelSelection?: () => void;
  onConfirmMove?: () => void;
  onUndoMove?: () => void;
  canUndoMove: boolean;
  confirmVariant: S1Variants['confirm'];
}) {
  if (isReviewing) {
    return (
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.review.back_to_live')}
        style={({ pressed, hovered }) => [styles.primaryBtn, hovered && styles.primaryBtnHover, pressed && styles.pressed]}
        onPress={onGoLive}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.review.back_to_live')}</Text>
      </HoverPressable>
    );
  }

  if (state.phase === 'game-over') {
    return (
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.play_again_a11y')}
        testID="play-again-button"
        style={({ pressed, hovered }) => [styles.primaryBtn, hovered && styles.primaryBtnHover, pressed && styles.pressed]}
        onPress={onReset}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.controls.play_again')}</Text>
      </HoverPressable>
    );
  }

  // Opening: keep the Roll Dice button (tap-anywhere on the ceremony still works).
  if (state.phase === 'opening-roll' && isHumanTurn) {
    return (
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.roll_dice_a11y')}
        testID="roll-dice-button"
        style={({ pressed, hovered }) => [styles.primaryBtn, hovered && styles.primaryBtnHover, pressed && styles.pressed]}
        onPress={onRoll}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.controls.roll_dice')}</Text>
      </HoverPressable>
    );
  }

  if (state.phase === 'opening-roll' && isComputerTurn) {
    return <View style={styles.actionSpacer} />;
  }

  if (state.phase === 'rolling' && isHumanTurn) {
    return (
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.roll_dice_a11y')}
        testID="roll-dice-button"
        style={({ pressed, hovered }) => [styles.primaryBtn, hovered && styles.primaryBtnHover, pressed && styles.pressed]}
        onPress={onRoll}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.controls.roll_dice')}</Text>
      </HoverPressable>
    );
  }

  if (state.phase === 'rolling' && isComputerTurn) {
    return <View style={styles.actionSpacer} />;
  }

  if (state.phase === 'moving' && isComputerTurn) {
    return <View style={styles.actionSpacer} />;
  }

  if (
    isHumanTurn
    && !isReviewing
    && onConfirmMove
    && isAwaitingMoveConfirm(state, confirmMoveEnabled)
  ) {
    if (confirmVariant === 'a') {
      return (
        <ConfirmButtonA
          noMove={state.phase === 'no-move'}
          onConfirm={() => {
            hapticLight();
            onConfirmMove();
          }}
        />
      );
    }
    if (confirmVariant === 'b') {
      // The dice tray is the control (see DiceTrayShell); keep the slot quiet.
      return <View style={styles.actionSpacer} />;
    }
    return (
      <ConfirmMoveBar
        canUndo={canUndoMove}
        onConfirm={() => {
          hapticLight();
          onConfirmMove();
        }}
        onUndo={() => {
          if (!canUndoMove || !onUndoMove) {
            return;
          }
          hapticLight();
          onUndoMove();
        }}
      />
    );
  }

  if (state.phase === 'no-move' && isHumanTurn) {
    return <StatusPlaceholder text={translate('game.controls.no_legal_moves')} />;
  }

  if (state.phase === 'no-move' && isComputerTurn) {
    return <StatusPlaceholder text={translate('game.controls.no_legal_moves')} />;
  }

  if (state.phase === 'moving' && isHumanTurn && state.selectedPoint !== null && onCancelSelection) {
    return (
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.cancel_a11y')}
        testID="cancel-selection-button"
        collapsable={false}
        pointerEvents="auto"
        style={({ pressed, hovered }) => [styles.secondaryBtn, hovered && styles.secondaryBtnHover, pressed && styles.pressed]}
        onPress={() => {
          hapticLight();
          onCancelSelection();
        }}
      >
        <Text style={styles.secondaryBtnText}>{translate('game.controls.cancel')}</Text>
      </HoverPressable>
    );
  }

  // Human turn, dice rolled: offer the Hint button at TURN START only.
  // The engine plans a full turn from the dice just rolled. A failed
  // analysis shows no suggestion. The blunder-review solution view still
  // draws best-move arrows after take-back, which restores turn start.
  if (state.phase === 'moving' && isHumanTurn && !isReviewing && isTurnStart(state)) {
    return <HintButton state={state} moveLogLength={moveLogLength} />;
  }

  return <View style={styles.actionSpacer} />;
}

/**
 * Confirm option A: one gold button in the same slot and geometry as Roll
 * Dice, so the thumb lands on the same spot every turn (roll → move →
 * confirm). Undo stays in the header. A single soft settle-in on mount says
 * "something changed here" without a looping pulse.
 */
function ConfirmButtonA({ noMove, onConfirm }: { noMove: boolean; onConfirm: () => void }) {
  const scale = useRef(new Animated.Value(0.94)).current;
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 9 }),
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
    ]).start();
  }, [scale, ring]);
  const label = noMove ? 'End turn' : 'Confirm';
  return (
    <Animated.View style={[styles.confirmAWrap, { transform: [{ scale }] }]} testID="confirm-move-bar">
      <Animated.View
        pointerEvents="none"
        style={[styles.confirmARing, { opacity: ring, transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }] }]}
      />
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.confirm_move_a11y')}
        accessibilityHint={Platform.OS === 'web' ? 'Press Enter to confirm' : undefined}
        testID="confirm-move-button"
        style={({ pressed, hovered }) => [
          styles.primaryBtn,
          styles.confirmA,
          hovered && styles.primaryBtnHover,
          pressed && styles.pressed,
        ]}
        onPress={onConfirm}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Feather name="check" size={20} color={GAME_PALETTE.controlInk} />
        <Text style={styles.primaryBtnText}>{label}</Text>
        {Platform.OS === 'web' && (
          <View style={styles.keycap} pointerEvents="none">
            <Text style={styles.keycapText}>↵</Text>
          </View>
        )}
      </HoverPressable>
    </Animated.View>
  );
}

function ConfirmMoveBar({
  canUndo,
  onConfirm,
  onUndo,
}: {
  canUndo: boolean;
  onConfirm: () => void;
  onUndo: () => void;
}) {
  return (
    <View style={styles.confirmRow} testID="confirm-move-bar">
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.undo_a11y')}
        accessibilityState={{ disabled: !canUndo }}
        disabled={!canUndo}
        testID="undo-move-button"
        style={({ pressed, hovered }) => [
          styles.undoBtn,
          !canUndo && styles.undoBtnDisabled,
          canUndo && hovered && styles.secondaryBtnHover,
          pressed && canUndo && styles.pressed,
        ]}
        onPress={onUndo}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={[styles.undoBtnText, !canUndo && styles.undoBtnTextDisabled]}>
          {translate('game.controls.undo_move')}
        </Text>
      </HoverPressable>
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.confirm_move_a11y')}
        testID="confirm-move-button"
        style={({ pressed, hovered }) => [
          styles.confirmBtn,
          hovered && styles.primaryBtnHover,
          pressed && styles.pressed,
        ]}
        onPress={onConfirm}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Feather name="check" size={18} color={GAME_PALETTE.controlInk} />
        <Text style={styles.primaryBtnText}>{translate('game.controls.confirm_move')}</Text>
      </HoverPressable>
    </View>
  );
}

function StatusPlaceholder({ text }: { text: string }) {
  return (
    <View style={styles.statusSlot} pointerEvents="none">
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  controlsCompact: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 12,
  },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 8,
  },
  actionSlot: {
    height: ACTION_SLOT_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 4,
  },
  // The suggestion card is a label, the move, and two actions. Sharing the
  // fixed 52px slot paints the caption through the bottom of that card.
  actionSlotOpen: {
    width: '100%',
    minHeight: ACTION_SLOT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 4,
  },
  actionSpacer: {
    height: ACTION_SLOT_HEIGHT,
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: GAME_PALETTE.control,
    borderWidth: 1,
    borderColor: GAME_PALETTE.controlBorder,
    paddingHorizontal: 40,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    ...continuousRadius(12),
  },
  primaryBtnHover: {
    backgroundColor: GAME_PALETTE.controlHover,
    borderColor: '#FFE0A0',
  },
  secondaryBtnHover: {
    borderColor: GAME_PALETTE.accent,
  },
  pressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    color: GAME_PALETTE.controlInk,
    fontSize: 16,
    ...interFont('semibold'),
  },
  secondaryBtn: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 224, 208, 0.35)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: 'center',
    zIndex: 2,
    ...continuousRadius(12),
  },
  secondaryBtnText: {
    color: GAME_PALETTE.accent,
    fontSize: 16,
    ...interFont('semibold'),
  },
  statusSlot: {
    height: ACTION_SLOT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 15,
    ...interFont('regular'),
  },
  caption: {
    marginTop: 6,
    minHeight: 18,
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    textAlign: 'center',
    ...interFont('regular'),
  },
  // S1 prototypes -------------------------------------------------------
  mergedCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 6,
    minHeight: 20,
    paddingHorizontal: 8,
  },
  mergedCaptionText: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    textAlign: 'center',
    flexShrink: 1,
    ...interFont('medium'),
  },
  mergedCaptionWaiting: {
    color: GAME_PALETTE.textMuted,
  },
  confirmAWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmARing: {
    position: 'absolute',
    left: '50%',
    marginLeft: -140,
    width: 280,
    height: ACTION_SLOT_HEIGHT,
    borderWidth: 2,
    borderColor: GAME_PALETTE.controlBorder,
    ...continuousRadius(14),
  },
  confirmA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 280,
    paddingHorizontal: 24,
  },
  keycap: {
    position: 'absolute',
    right: 12,
    borderWidth: 1,
    borderColor: 'rgba(30, 12, 2, 0.35)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  keycapText: {
    color: GAME_PALETTE.controlInk,
    opacity: 0.75,
    fontSize: 11,
    ...interFont('semibold'),
  },
  diceConfirm: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    paddingRight: 12,
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 2,
    borderColor: GAME_PALETTE.control,
    gap: 8,
    ...continuousRadius(14),
  },
  diceConfirmInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diceConfirmBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GAME_PALETTE.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceConfirmLabel: {
    color: GAME_PALETTE.control,
    fontSize: 16,
    ...interFont('semibold'),
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  undoBtn: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 224, 208, 0.45)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 96,
    alignItems: 'center',
    ...continuousRadius(12),
  },
  undoBtnDisabled: {
    opacity: 0.4,
  },
  undoBtnText: {
    color: GAME_PALETTE.accent,
    fontSize: 16,
    ...interFont('semibold'),
  },
  undoBtnTextDisabled: {
    color: GAME_PALETTE.textMuted,
  },
  confirmBtn: {
    backgroundColor: GAME_PALETTE.control,
    borderWidth: 1,
    borderColor: GAME_PALETTE.controlBorder,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    ...continuousRadius(12),
  },
});
