import type { GameState } from '@/lib/game';
import type { OpeningTray } from '@/lib/game/opening-display';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { DiceDisplay } from '@/features/game/components/board/dice-display';

import { HintButton } from '@/features/game/components/hint-button';
import { MatchControls } from '@/features/game/components/match-controls';
import { controlButtonStyles } from '@/features/game/control-buttons';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGuidance } from '@/features/game/guidance-store';
import { TRAY_DIE_SIZE } from '@/features/game/hooks/use-board-dimensions';
import { matchOfferText, matchResultText } from '@/features/game/match-copy';
import { AUTO_ROLL_BUTTON_GRACE_MS } from '@/features/game/roll-button-timing';
import { isTurnStart } from '@/lib/game';
import { isAwaitingMoveConfirm } from '@/lib/game-preferences/confirm-move';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { getActionCaption, getTurnDisplay } from '@/lib/game/turn-display';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

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
  /** The board draws the dice in the roller's half; skip the tray row. */
  diceOnBoard?: boolean;
  /** The shortest landscape rail has no room for the caption; the player strips say whose turn it is. */
  hideCaption?: boolean;
};

const ACTION_SLOT_HEIGHT = 52;
const CONTROL_HIT_SLOP = 16;
/** True once `active` has stayed true for `delayMs`; false again as soon as it drops. */
function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = setTimeout(() => setElapsed(true), delayMs);
    return () => {
      clearTimeout(id);
      setElapsed(false);
    };
  }, [active, delayMs]);
  return active && elapsed;
}

/** A pending double or a finished game's result replaces the turn caption. */
function matchCaption(state: GameState): string | null {
  const m = state.match;
  if (m?.pendingOffer)
    return matchOfferText({ offerer: m.pendingOffer, value: m.cube.value * 2, points: m.cube.value }, state.mode);
  return m ? matchResultText(m, state.mode) : null;
}

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
  diceOnBoard = false,
  hideCaption = false,
}: Props) {
  const { preferences } = useGamePreferences();
  const guidance = useGuidance();
  const hintCardOpen = guidance?.kind === 'hint' && guidance.revealed;
  const turn = getTurnDisplay(state);
  const caption = isReviewing
    ? translate('game.review.viewing_hint')
    : captionOverride ?? getActionCaption(state, turn);

  const diceForTray = isReviewing ? state : liveDiceState;
  const showOpening = opening !== null && !isReviewing;

  return (
    <View style={[styles.controls, compact && styles.controlsCompact]} testID="game-controls">
      {diceOnBoard
        ? null
        : (
            <View style={styles.diceRow} pointerEvents="none" testID="game-dice-tray">
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
            </View>
          )}
      <View
        style={hintCardOpen ? styles.actionSlotOpen : styles.actionSlot}
        pointerEvents="auto"
        testID="game-action-slot"
      >
        <ActionControl
          state={state}
          isHumanTurn={isHumanTurn}
          isComputerTurn={isComputerTurn}
          isReviewing={isReviewing}
          moveLogLength={moveLogLength}
          confirmMoveEnabled={preferences.confirmMove}
          autoRollEnabled={preferences.autoRoll}
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
          compact={compact}
        />
      </View>
      {/* In the side rail the review bar's own label says what is on view. */}
      {hideCaption || (compact && isReviewing)
        ? null
        : (
            <Text style={[styles.caption, compact && styles.captionCompact]} numberOfLines={2} testID="game-action-caption" accessibilityLiveRegion="polite">
              {isReviewing ? caption : matchCaption(state) ?? caption}
            </Text>
          )}
    </View>
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
  autoRollEnabled,
  onRoll,
  onReset,
  onGoLive,
  onCancelSelection,
  onConfirmMove,
  onUndoMove,
  canUndoMove,
  compact,
}: {
  state: GameState;
  isHumanTurn: boolean;
  isComputerTurn: boolean;
  isReviewing: boolean;
  moveLogLength: number;
  confirmMoveEnabled: boolean;
  autoRollEnabled: boolean;
  onRoll: () => void;
  onReset: () => void;
  onGoLive?: () => void;
  onCancelSelection?: () => void;
  onConfirmMove?: () => void;
  onUndoMove?: () => void;
  canUndoMove: boolean;
  compact: boolean;
}) {
  const awaitingHumanRoll = !isReviewing
    && isHumanTurn
    && (state.phase === 'rolling' || state.phase === 'opening-roll');
  const rollButtonRevealed = useDelayedFlag(
    awaitingHumanRoll && autoRollEnabled,
    AUTO_ROLL_BUTTON_GRACE_MS,
  );
  const showRollButton = awaitingHumanRoll && (!autoRollEnabled || rollButtonRevealed);
  const prevConfirmEnabled = useRef(confirmMoveEnabled);
  useEffect(() => {
    const wasEnabled = prevConfirmEnabled.current;
    prevConfirmEnabled.current = confirmMoveEnabled;
    if (
      wasEnabled
      && !confirmMoveEnabled
      && onConfirmMove
      && !isReviewing
      && isHumanTurn
      && isAwaitingMoveConfirm(state, true)
    ) {
      onConfirmMove();
    }
  }, [confirmMoveEnabled, state, isHumanTurn, isReviewing, onConfirmMove]);

  if (isReviewing) {
    return (
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.review.back_to_live')}
        testID="review-back-to-live-button"
        style={({ pressed, hovered }) => [styles.primaryBtn, hovered && styles.primaryBtnHover, pressed && styles.pressed]}
        onPress={onGoLive}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.review.back_to_live')}</Text>
      </HoverPressable>
    );
  }

  if (state.match && (state.match.pendingOffer || state.phase === 'rolling' || state.phase === 'game-over')) {
    return <MatchControls state={state} onRoll={onRoll} onReset={onReset} isHumanTurn={isHumanTurn} isComputerTurn={isComputerTurn} />;
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

  // Opening and regular rolls share one Roll button (tap-anywhere on the
  // opening ceremony still works). With auto-roll it only appears as a
  // fallback when the automatic roll has not happened.
  if (awaitingHumanRoll) {
    if (!showRollButton) {
      return <View style={styles.actionSpacer} testID="auto-roll-pending" />;
    }
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

  if ((state.phase === 'opening-roll' || state.phase === 'rolling') && isComputerTurn) {
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
    return (
      <ConfirmMoveBar
        compact={compact}
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
    // The engine weighs money play only; at a match score its advice can be wrong, so say why Hint is missing.
    if (state.match) {
      return (
        <View style={styles.actionSpacer}>
          <Text style={styles.matchAdviceNote} numberOfLines={2} testID="match-advice-note">{translate('game.match.advice_note')}</Text>
        </View>
      );
    }
    return <HintButton state={state} moveLogLength={moveLogLength} />;
  }

  return <View style={styles.actionSpacer} />;
}

function ConfirmMoveBar({
  canUndo,
  onConfirm,
  onUndo,
  compact,
}: {
  compact: boolean;
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
          compact && styles.undoBtnCompact,
          !canUndo && styles.undoBtnDisabled,
          canUndo && hovered && styles.secondaryBtnHover,
          pressed && canUndo && styles.pressed,
        ]}
        onPress={onUndo}
        hitSlop={CONTROL_HIT_SLOP}
      >
        {/* The side rail is too narrow for both labels: Undo keeps its arrow, like the toolbar's. */}
        {compact
          ? <Feather name="rotate-ccw" size={20} color={canUndo ? GAME_PALETTE.accent : GAME_PALETTE.textMuted} />
          : (
              <Text style={[styles.undoBtnText, !canUndo && styles.undoBtnTextDisabled]}>
                {translate('game.controls.undo_move')}
              </Text>
            )}
      </HoverPressable>
      <HoverPressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.confirm_move_a11y')}
        testID="confirm-move-button"
        style={({ pressed, hovered }) => [
          styles.confirmBtn,
          compact && styles.confirmBtnCompact,
          hovered && styles.primaryBtnHover,
          pressed && styles.pressed,
        ]}
        onPress={onConfirm}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Feather name="check" size={18} color={GAME_PALETTE.controlInk} />
        <Text style={[styles.primaryBtnText, compact && styles.confirmTextCompact]} numberOfLines={1}>{translate('game.controls.confirm_move')}</Text>
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
  // One footprint for single games and matches, every phase: two caption
  // lines fit a cube decision, and the board never changes size.
  controls: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 20,
  },
  controlsCompact: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 4,
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
  matchAdviceNote: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    paddingHorizontal: 16,
  },
  primaryBtn: {
    ...controlButtonStyles.primary,
    paddingHorizontal: 40,
    minWidth: 200,
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
  primaryBtnText: controlButtonStyles.primaryText,
  secondaryBtn: {
    ...controlButtonStyles.secondary,
    paddingHorizontal: 32,
    minWidth: 160,
    zIndex: 2,
  },
  secondaryBtnText: controlButtonStyles.secondaryText,
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
    marginTop: 4,
    height: 32,
    lineHeight: 16,
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    textAlign: 'center',
    ...interFont('regular'),
  },
  captionCompact: {
    marginTop: 2,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  undoBtn: {
    ...controlButtonStyles.secondary,
    borderColor: 'rgba(232, 224, 208, 0.45)',
    paddingHorizontal: 20,
    minWidth: 96,
  },
  undoBtnCompact: {
    minWidth: 0,
    width: 56,
    paddingHorizontal: 0,
  },
  undoBtnDisabled: {
    opacity: 0.4,
  },
  undoBtnText: controlButtonStyles.secondaryText,
  undoBtnTextDisabled: {
    color: GAME_PALETTE.textMuted,
  },
  confirmBtn: {
    ...controlButtonStyles.primary,
    paddingHorizontal: 24,
    minWidth: 180,
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtnCompact: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  confirmTextCompact: {
    fontSize: 15,
    flexShrink: 1,
  },
});
