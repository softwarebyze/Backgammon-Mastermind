import type { GameState } from '@/lib/game';
import type { OpeningTray } from '@/lib/game/opening-display';
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { DiceDisplay } from '@/features/game/components/board/dice-display';

import { HintButton } from '@/features/game/components/hint-button';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { useGuidance } from '@/features/game/guidance-store';
import { TRAY_DIE_SIZE } from '@/features/game/hooks/use-board-dimensions';
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
/**
 * Height of the open hint card (label, move, Play / Back row). In portrait
 * the board gets whatever height the controls leave, so the action slot
 * always reserves this much: opening or closing the hint then never resizes
 * or moves the board.
 */
const HINT_CARD_HEIGHT = 108;
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
  const hintCardOpen = guidance?.kind === 'hint' && guidance.revealed;
  const turn = getTurnDisplay(state);
  const caption = captionOverride
    ?? (isReviewing
      ? translate('game.review.viewing_hint')
      : getActionCaption(state, turn));

  const diceForTray = isReviewing ? state : liveDiceState;
  const showOpening = opening !== null && !isReviewing;

  return (
    <View style={[styles.controls, compact && styles.controlsCompact]}>
      <View style={styles.diceRow} pointerEvents="none">
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
      <View
        style={
          compact
            // Landscape keeps the controls in the side rail, beside the
            // board, so the card can grow there without touching the board.
            ? (hintCardOpen ? styles.actionSlotOpen : styles.actionSlot)
            : [styles.actionSlotOpen, styles.actionSlotReserved]
        }
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
        />
      </View>
      <Text style={styles.caption}>{caption}</Text>
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
  onRoll,
  onReset,
  onGoLive,
  onCancelSelection,
  onConfirmMove,
  onUndoMove,
  canUndoMove,
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
}) {
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
  actionSlotReserved: {
    minHeight: HINT_CARD_HEIGHT,
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
