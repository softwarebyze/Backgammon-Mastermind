import type { GameState } from '@/lib/game';
import type { OpeningTray } from '@/lib/game/opening-display';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
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
  /** Ephemeral caption override (e.g. "Roll the dice first", opening copy). */
  captionOverride?: string | null;
  /** Opening roll in progress / being revealed: white-left, black-right tray. */
  opening?: OpeningTray | null;
  onRoll: () => void;
  onReset: () => void;
  onGoLive?: () => void;
  onCancelSelection?: () => void;
  onSkipComputer?: () => void;
  /** Tighter padding when dice sit beside the board in landscape. */
  compact?: boolean;
};

const ACTION_SLOT_HEIGHT = 52;
const CONTROL_HIT_SLOP = 16;

export function GameScreenControls({
  state,
  liveDiceState,
  isHumanTurn,
  isComputerTurn,
  isReviewing = false,
  captionOverride = null,
  opening = null,
  onRoll,
  onReset,
  onGoLive,
  onCancelSelection,
  onSkipComputer,
  compact = false,
}: Props) {
  const { preferences } = useGamePreferences();
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
              />
            )
          : (
              <DiceDisplay
                dice={diceForTray.dice}
                remainingDice={diceForTray.remainingDice}
                playerColor={diceForTray.currentPlayer}
                displayStyle={preferences.diceDisplayStyle}
                animateRoll={!isReviewing}
              />
            )}
      </View>
      <View style={styles.actionSlot} pointerEvents="auto" testID="game-action-slot">
        <ActionControl
          state={state}
          isHumanTurn={isHumanTurn}
          isComputerTurn={isComputerTurn}
          isReviewing={isReviewing}
          onRoll={() => {
            hapticLight();
            onRoll();
          }}
          onReset={onReset}
          onGoLive={onGoLive}
          onCancelSelection={onCancelSelection}
          onSkipComputer={onSkipComputer}
        />
      </View>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

/* eslint-disable-next-line max-lines-per-function -- phase switch + skip/cancel slots */
function ActionControl({
  state,
  isHumanTurn,
  isComputerTurn,
  isReviewing,
  onRoll,
  onReset,
  onGoLive,
  onCancelSelection,
  onSkipComputer,
}: {
  state: GameState;
  isHumanTurn: boolean;
  isComputerTurn: boolean;
  isReviewing: boolean;
  onRoll: () => void;
  onReset: () => void;
  onGoLive?: () => void;
  onCancelSelection?: () => void;
  onSkipComputer?: () => void;
}) {
  if (isReviewing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.review.back_to_live')}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onGoLive}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.review.back_to_live')}</Text>
      </Pressable>
    );
  }

  if (state.phase === 'game-over') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.play_again_a11y')}
        testID="play-again-button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onReset}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.controls.play_again')}</Text>
      </Pressable>
    );
  }

  // Opening: keep the Roll Dice button (tap-anywhere on the ceremony still works).
  if (state.phase === 'opening-roll' && isHumanTurn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.roll_dice_a11y')}
        testID="roll-dice-button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onRoll}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.controls.roll_dice')}</Text>
      </Pressable>
    );
  }

  if (state.phase === 'opening-roll' && isComputerTurn) {
    return <StatusPlaceholder onSkip={onSkipComputer} />;
  }

  if (state.phase === 'rolling' && isHumanTurn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.roll_dice_a11y')}
        testID="roll-dice-button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onRoll}
        hitSlop={CONTROL_HIT_SLOP}
      >
        <Text style={styles.primaryBtnText}>{translate('game.controls.roll_dice')}</Text>
      </Pressable>
    );
  }

  if (state.phase === 'rolling' && isComputerTurn) {
    return <StatusPlaceholder onSkip={onSkipComputer} />;
  }

  if (state.phase === 'moving' && isComputerTurn) {
    return <StatusPlaceholder onSkip={onSkipComputer} />;
  }

  if (state.phase === 'no-move' && isHumanTurn) {
    return <StatusPlaceholder text={translate('game.controls.no_legal_moves')} />;
  }

  if (state.phase === 'no-move' && isComputerTurn) {
    return <StatusPlaceholder text={translate('game.controls.no_legal_moves')} onSkip={onSkipComputer} />;
  }

  if (state.phase === 'moving' && isHumanTurn && state.selectedPoint !== null && onCancelSelection) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.controls.cancel_a11y')}
        testID="cancel-selection-button"
        collapsable={false}
        pointerEvents="auto"
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        onPress={() => {
          hapticLight();
          onCancelSelection();
        }}
      >
        <Text style={styles.secondaryBtnText}>{translate('game.controls.cancel')}</Text>
      </Pressable>
    );
  }

  return <View style={styles.actionSpacer} />;
}

function StatusPlaceholder({ text, onSkip }: { text?: string; onSkip?: () => void }) {
  const skipLabel = text
    ? translate('game.controls.skip_wait_a11y', { status: text })
    : translate('game.controls.skip_wait');
  return (
    <View style={styles.statusSlot} pointerEvents="box-none">
      {text
        ? <Text style={styles.statusText} pointerEvents="none">{text}</Text>
        : null}
      {onSkip
        ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
              testID="skip-computer-button"
              hitSlop={CONTROL_HIT_SLOP}
              style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
              onPress={() => {
                hapticLight();
                onSkip();
              }}
            >
              <Text style={styles.skipHint}>{translate('game.controls.skip_wait')}</Text>
            </Pressable>
          )
        : null}
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
  pressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    color: GAME_PALETTE.text,
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
  skipBtn: {
    marginTop: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipHint: {
    color: GAME_PALETTE.accentDim,
    fontSize: 11,
    ...interFont('medium'),
  },
  caption: {
    marginTop: 6,
    minHeight: 18,
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    textAlign: 'center',
    ...interFont('regular'),
  },
});
