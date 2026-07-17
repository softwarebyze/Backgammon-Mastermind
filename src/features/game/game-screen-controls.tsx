import type { GameState } from '@/lib/game';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DiceDisplay } from '@/features/game/components/board/dice-display';
import { GAME_PALETTE } from '@/features/game/game-palette';
import {
  useOpeningCeremonyHandoff,
  useOpeningCeremonyVisible,
} from '@/features/game/opening-ceremony-gate';
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
  /** Ephemeral caption override (e.g. "Roll the dice first"). */
  captionOverride?: string | null;
  onRoll: () => void;
  onReset: () => void;
  onGoLive?: () => void;
};

const ACTION_SLOT_HEIGHT = 52;
const TRAY_FADE_MS = 280;

export function GameScreenControls({
  state,
  liveDiceState,
  isHumanTurn,
  isComputerTurn,
  isReviewing = false,
  captionOverride = null,
  onRoll,
  onReset,
  onGoLive,
}: Props) {
  const { preferences } = useGamePreferences();
  const ceremonyVisible = useOpeningCeremonyVisible();
  const handoff = useOpeningCeremonyHandoff();
  const turn = getTurnDisplay(state);
  const caption = captionOverride
    ?? (isReviewing
      ? translate('game.review.viewing_hint')
      : ceremonyVisible
        ? ' '
        : getActionCaption(state, turn));

  const showTray = !ceremonyVisible || handoff === 'reveal' || handoff === 'measure';
  const trayOpacity = useSharedValue(ceremonyVisible ? 0 : 1);

  useEffect(() => {
    if (!ceremonyVisible) {
      trayOpacity.value = 1;
      return;
    }
    if (handoff === 'reveal') {
      trayOpacity.value = withTiming(1, { duration: TRAY_FADE_MS });
      return;
    }
    trayOpacity.value = 0;
  }, [ceremonyVisible, handoff, trayOpacity]);

  const trayStyle = useAnimatedStyle(() => ({
    opacity: trayOpacity.value,
  }));

  const diceForTray = isReviewing ? state : liveDiceState;
  const measuring = ceremonyVisible && (handoff === 'measure' || handoff === 'hidden');

  return (
    <View style={styles.controls}>
      <View style={styles.diceRow}>
        {showTray
          ? (
              <Animated.View style={trayStyle} pointerEvents="none">
                <DiceDisplay
                  dice={measuring ? [0, 0] : diceForTray.dice}
                  remainingDice={measuring ? [] : diceForTray.remainingDice}
                  playerColor={diceForTray.currentPlayer}
                  // Opening dice are [whiteDie, blackDie] — keep faces matched during fly-in.
                  slotColors={ceremonyVisible ? ['white', 'black'] : undefined}
                  displayStyle={preferences.diceDisplayStyle}
                  animateRoll={!isReviewing && !ceremonyVisible}
                  reportTraySlots={ceremonyVisible}
                />
              </Animated.View>
            )
          : liveDiceState.phase === 'opening-roll'
            ? <View style={styles.dicePlaceholder} />
            : null}
      </View>
      <View style={styles.actionSlot}>
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
        />
      </View>
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function ActionControl({
  state,
  isHumanTurn,
  isComputerTurn,
  isReviewing,
  onRoll,
  onReset,
  onGoLive,
}: {
  state: GameState;
  isHumanTurn: boolean;
  isComputerTurn: boolean;
  isReviewing: boolean;
  onRoll: () => void;
  onReset: () => void;
  onGoLive?: () => void;
}) {
  if (isReviewing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.review.back_to_live')}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onGoLive}
      >
        <Text style={styles.primaryBtnText}>{translate('game.review.back_to_live')}</Text>
      </Pressable>
    );
  }

  if (state.phase === 'game-over') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play again"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onReset}
      >
        <Text style={styles.primaryBtnText}>Play Again</Text>
      </Pressable>
    );
  }

  // Opening: keep the Roll Dice button (tap-anywhere on the ceremony still works).
  if (state.phase === 'opening-roll' && isHumanTurn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll dice"
        testID="roll-dice-button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onRoll}
      >
        <Text style={styles.primaryBtnText}>Roll Dice</Text>
      </Pressable>
    );
  }

  if (state.phase === 'opening-roll' && isComputerTurn) {
    return <StatusPlaceholder text="Rolling…" />;
  }

  if (state.phase === 'rolling' && isHumanTurn) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Roll dice"
        testID="roll-dice-button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={onRoll}
      >
        <Text style={styles.primaryBtnText}>Roll Dice</Text>
      </Pressable>
    );
  }

  if (state.phase === 'rolling' && isComputerTurn) {
    return <StatusPlaceholder text="Rolling…" />;
  }

  if (state.phase === 'moving' && isComputerTurn) {
    return <StatusPlaceholder text="Moving…" />;
  }

  if (state.phase === 'no-move' && isHumanTurn) {
    return <StatusPlaceholder text="No legal moves…" />;
  }

  if (state.phase === 'no-move' && isComputerTurn) {
    return <StatusPlaceholder text="No legal moves…" />;
  }

  return <View style={styles.actionSpacer} />;
}

function StatusPlaceholder({ text }: { text: string }) {
  return (
    <View style={styles.statusSlot}>
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
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 8,
  },
  dicePlaceholder: {
    minHeight: 44,
  },
  actionSlot: {
    height: ACTION_SLOT_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
});
