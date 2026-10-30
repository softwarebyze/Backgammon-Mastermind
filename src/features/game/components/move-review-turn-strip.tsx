import type { CubeHistoryEvent } from '@/lib/game/cube-history';
import type { MoveLogEntry, MoveLogTurn } from '@/lib/game/move-log';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';

import { chronologicalHistory } from '@/lib/game/cube-history';
import { isNoMoveLogEntry, turnsForReviewStrip, unusedDiceInTurn } from '@/lib/game/move-log';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

const CHIP_HEIGHT = 28;
const CHIP_GAP = 6;
const CHIP_SCROLL_STEP = 62;

type Props = {
  viewIndex: number;
  isReviewing: boolean;
  moveLog: MoveLogEntry[];
  focusedPly: number;
  /** While live mid-turn, hide this player's unfinished turn chip (Live owns it). */
  liveCurrentPlayer?: MoveLogEntry['player'] | null;
  onJumpToPly: (ply: number) => void;
  onGoLive: () => void;
  cubeEvents?: CubeHistoryEvent[];
  selectedCubeEventId?: number | null;
  onJumpToCubeEvent?: (id: number) => void;
};

function turnStartPly(turn: MoveLogTurn): number {
  return turn.endPly - turn.moves.length + 1;
}

function TurnChip({
  turn,
  focused,
  onPress,
}: {
  turn: MoveLogTurn;
  focused: boolean;
  onPress: () => void;
}) {
  const playerLabel = turn.player === 'white'
    ? translate('game.review.player_white')
    : translate('game.review.player_black');
  const unused = unusedDiceInTurn(turn);
  const noMove = turn.moves.length === 1 && turn.moves[0] && isNoMoveLogEntry(turn.moves[0]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translate('game.review.turn_a11y', { turn: turn.turnIndex, player: playerLabel })}
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={[
        styles.chip,
        focused && styles.chipFocused,
      ]}
    >
      <View
        style={[
          styles.playerDot,
          turn.player === 'white' ? styles.playerDotWhite : styles.playerDotBlack,
        ]}
      />
      <Text style={[styles.chipText, focused && styles.chipTextFocused, noMove && styles.chipTextMuted]}>
        {`${turn.dice[0]}·${turn.dice[1]}`}
      </Text>
      {(noMove || unused > 0) && (
        <Text style={styles.unusedMark}>{noMove ? '×' : `-${unused}`}</Text>
      )}
    </Pressable>
  );
}

/** Horizontal timeline of turns — one chip per turn, plus Start and Live. */
export function MoveReviewTurnStrip({
  viewIndex: _viewIndex,
  isReviewing,
  moveLog,
  focusedPly,
  liveCurrentPlayer = null,
  onJumpToPly,
  onGoLive,
  cubeEvents = [],
  selectedCubeEventId = null,
  onJumpToCubeEvent,
}: Props) {
  // Live: hide unfinished current turn. Review: show all so scrubbing still works.
  const turns = turnsForReviewStrip(moveLog, {
    hideInProgressFor: isReviewing ? null : liveCurrentPlayer,
  });
  const scrollRef = useRef<ScrollView>(null);
  const focusedTurnIdx = turns.findIndex(
    t => focusedPly >= turnStartPly(t) && focusedPly <= t.endPly,
  );

  const historyItems = chronologicalHistory(turns, cubeEvents);
  const focusedHistoryIndex = historyItems.findIndex(item => item.kind === 'cube'
    ? item.event.id === selectedCubeEventId
    : selectedCubeEventId === null && item.turn === turns[focusedTurnIdx]);

  useEffect(() => {
    if (!isReviewing) {
      scrollRef.current?.scrollToEnd({ animated: true });
      return;
    }
    const x = Math.max(0, (focusedHistoryIndex + 1) * CHIP_SCROLL_STEP - 120);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [focusedHistoryIndex, isReviewing, historyItems.length]);

  return (
    <ScrollView
      ref={scrollRef}
      testID="history-turn-strip"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.timeline}
      style={styles.timelineScroll}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={translate('game.review.opening')}
        accessibilityState={{ selected: isReviewing && selectedCubeEventId === null && focusedPly === 0 }}
        onPress={() => {
          hapticLight();
          onJumpToPly(0);
        }}
        hitSlop={4}
        style={[styles.chip, isReviewing && selectedCubeEventId === null && focusedPly === 0 && styles.chipFocused]}
      >
        <Text style={[styles.chipText, isReviewing && selectedCubeEventId === null && focusedPly === 0 && styles.chipTextFocused]}>
          {translate('game.review.start')}
        </Text>
      </Pressable>

      {historyItems.map(item => item.kind === 'cube'
        ? (
            <Pressable
              key={`cube-${item.event.id}`}
              testID={`history-cube-${item.event.id}`}
              accessibilityRole="button"
              accessibilityLabel={cubeEventLabel(item.event)}
              accessibilityState={{ selected: selectedCubeEventId === item.event.id }}
              onPress={() => onJumpToCubeEvent?.(item.event.id)}
              style={[styles.chip, selectedCubeEventId === item.event.id && styles.chipFocused]}
            >
              <Text style={styles.chipText}>{cubeEventLabel(item.event)}</Text>
            </Pressable>
          )
        : (
            <TurnChip
              key={`turn-${item.turn.turnIndex}`}
              turn={item.turn}
              focused={isReviewing && selectedCubeEventId === null && turns[focusedTurnIdx] === item.turn}
              onPress={() => {
                hapticLight();
                onJumpToPly(item.turn.endPly);
              }}
            />
          ))}

      <Pressable
        accessibilityRole="button"
        testID="history-live"
        accessibilityLabel={translate('game.review.live')}
        accessibilityState={{ selected: !isReviewing }}
        onPress={() => {
          if (isReviewing) {
            hapticLight();
            onGoLive();
          }
        }}
        style={[styles.chip, styles.liveChip, !isReviewing && styles.liveChipActive]}
      >
        <Text style={[styles.chipText, !isReviewing ? styles.liveTextActive : styles.liveText]}>
          {translate('game.review.live_short')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  timelineScroll: {
    flexGrow: 1,
    flexShrink: 1,
    height: 40,
    maxHeight: 40,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CHIP_GAP,
    paddingHorizontal: 4,
    minHeight: 40,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: CHIP_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.surface,
  },
  chipFocused: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: '#3A1C0A',
    borderWidth: 2,
  },
  chipText: {
    color: GAME_PALETTE.text,
    fontSize: 12,
    letterSpacing: 0.3,
    ...interFont('semibold'),
  },
  chipTextFocused: { color: GAME_PALETTE.accent },
  chipTextMuted: { color: GAME_PALETTE.textMuted },
  unusedMark: {
    color: GAME_PALETTE.textMuted,
    fontSize: 11,
    ...interFont('semibold'),
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  playerDotWhite: {
    backgroundColor: '#F2EAD3',
    borderColor: '#BBA070',
  },
  playerDotBlack: {
    backgroundColor: '#1E1E30',
    borderColor: '#5050A0',
  },
  liveChip: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: 'transparent',
  },
  liveChipActive: {
    backgroundColor: GAME_PALETTE.accent,
  },
  liveText: { color: GAME_PALETTE.accent },
  liveTextActive: { color: '#2A1A08' },
});

/** Against the computer the human reads "You offer…" and Black reads as "Computer". */
function cubeEventLabel(event: CubeHistoryEvent): string {
  const vsComputer = event.after.mode === 'vs-computer';
  const you = vsComputer && event.player === 'white';
  const player = vsComputer
    ? translate('game.players.computer')
    : translate(event.player === 'white' ? 'game.review.player_white' : 'game.review.player_black');
  const kind = event.kind === 'offer' ? 'cube_offer' : event.kind === 'accept' ? 'cube_accept' : 'cube_drop';
  const key = `game.review.${kind}${you ? '_you' : ''}`;
  return translate(key as Parameters<typeof translate>[0], { player, value: (event.after.match?.cube.value ?? 1) * (event.kind === 'offer' ? 2 : 1) });
}
