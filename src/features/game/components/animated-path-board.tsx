import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game/types';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';
import { BoardView } from '@/features/game/components/board/board-view';
import { MovePathOverlay } from '@/features/game/components/board/move-path-overlay';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { applyMove, getLegalMoves } from '@/lib/game';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/**
 * Clean vector play/pause glyphs (no emoji).
 */
function PlayPauseIcon({ paused }: { paused: boolean }) {
  const color = GAME_PALETTE.text;
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12">
      {paused
        ? <Polygon points="3,2 10,6 3,10" fill={color} />
        : (
            <>
              <Rect x={2.5} y={2} width={2.5} height={8} rx={1} fill={color} />
              <Rect x={7} y={2} width={2.5} height={8} rx={1} fill={color} />
            </>
          )}
    </Svg>
  );
}

type PathSegment = {
  entry: {
    from: number;
    to: number;
    dice: [number, number];
    player: GameState['currentPlayer'];
    ply: number;
  };
  beforeState: GameState;
  tone: 'mine' | 'engine';
};

/**
 * Build the full path as arrow segments: each move's before-state is the
 * result of applying all previous moves to the base state.
 */
function buildPathSegments(
  baseState: GameState,
  moves: Move[],
  tone: 'mine' | 'engine',
): PathSegment[] {
  const result: PathSegment[] = [];
  let snap = baseState;
  let ply = 0;
  for (const move of moves) {
    const legal = getLegalMoves(snap).find(
      m => m.from === move.from && m.to === move.to,
    );
    if (!legal)
      break;
    result.push({
      entry: {
        from: legal.from,
        to: legal.to,
        dice: snap.dice,
        player: snap.currentPlayer,
        ply: ++ply,
      },
      beforeState: snap,
      tone,
    });
    snap = applyMove(snap, legal);
  }
  return result;
}

/**
 * Loop the move-path replay: play each move with its animation, hold the
 * final position, then reset to the base state. Honors pause between moves.
 */
function usePathReplay({
  baseState,
  moves,
  setDisplayState,
  setFrame,
}: {
  baseState: GameState;
  moves: Move[];
  setDisplayState: (state: GameState) => void;
  setFrame: (frame: MoveAnimationFrame | null) => void;
}) {
  const [paused, setPaused] = useState(false);
  const genRef = useRef(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  useEffect(() => {
    if (moves.length === 0)
      return;
    const gen = ++genRef.current;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const alive = () => genRef.current === gen;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    const run = async () => {
      await wait(700);
      let snap = baseState;
      while (alive()) {
        // Pause: wait here until resumed.
        while (pausedRef.current && alive()) {
          await wait(200);
        }
        if (!alive())
          return;
        let played = 0;
        for (const planned of moves) {
          if (!alive())
            return;
          // Check pause between moves too.
          while (pausedRef.current && alive()) {
            await wait(200);
          }
          if (!alive())
            return;
          const legal = getLegalMoves(snap).find(
            m => m.from === planned.from && m.to === planned.to,
          );
          if (!legal)
            break;
          await new Promise<void>((resolve) => {
            if (!alive()) {
              resolve();
              return;
            }
            setFrame(buildMoveAnimationFrame(snap, legal, {
              onFinish: resolve,
              durationMs: 450,
            }));
          });
          if (!alive())
            return;
          snap = applyMove(snap, legal);
          setDisplayState(snap);
          setFrame(null);
          played++;
          await wait(280);
        }
        if (played === 0 || !alive())
          return;
        await wait(1500);
        if (!alive())
          return;
        snap = baseState;
        setDisplayState(snap);
      }
    };
    run();
    return () => {
      genRef.current++;
      if (timer)
        clearTimeout(timer);
    };
  }, [baseState, moves, setDisplayState, setFrame]);

  return { paused, setPaused };
}

/**
 * A mini board that loops an animated replay of one move path (e.g. "Your
 * move" or "Best move") from a fixed start position. Both boards in a
 * comparison animate simultaneously so the player can watch the two lines
 * side by side.
 */
export function AnimatedPathBoard({
  baseState,
  moves,
  label,
  tone,
  boardWidth,
  testID,
}: {
  baseState: GameState;
  moves: Move[];
  label: string;
  tone: 'mine' | 'engine';
  boardWidth: number;
  testID?: string;
}) {
  const dimensions = fitBoardToViewport({ maxOuterWidth: boardWidth, maxOuterHeight: 240, compact: true });
  const [displayState, setDisplayState] = useState(baseState);
  const [frame, setFrame] = useState<MoveAnimationFrame | null>(null);
  const { paused, setPaused } = usePathReplay({ baseState, moves, setDisplayState, setFrame });
  const hasMoves = moves.length > 0;

  const segments = useMemo(
    () => buildPathSegments(baseState, moves, tone),
    [baseState, moves, tone],
  );

  const accent = tone === 'mine' ? GAME_PALETTE.guideMine : GAME_PALETTE.guideEngine;

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.labelRow}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={styles.label}>{label}</Text>
        {hasMoves && (
          <Pressable
            onPress={() => setPaused(p => !p)}
            accessibilityRole="button"
            accessibilityLabel={paused ? `Play ${label} replay` : `Pause ${label} replay`}
            testID={testID ? `${testID}-play-pause` : undefined}
            style={styles.playPause}
          >
            <PlayPauseIcon paused={paused} />
          </Pressable>
        )}
      </View>
      <View style={[styles.board, { width: dimensions.boardWidth, height: dimensions.boardHeight }]}>
        <BoardView
          state={displayState}
          dimensions={dimensions}
          previewTarget={null}
          moveAnimation={frame}
          onPointPress={() => {}}
          onPointPressIn={() => {}}
          onPointPressOut={() => {}}
          onBarPress={() => {}}
          onBearOffPress={() => {}}
          interactionEnabled={false}
          isReviewing
          numberPerspective={baseState.currentPlayer}
        />
        {segments.length > 0 && (
          <View
            style={{
              position: 'absolute',
              width: dimensions.boardWidth,
              height: dimensions.boardHeight,
              left: 0,
              top: 0,
            }}
            pointerEvents="none"
          >
            <MovePathOverlay
              segments={segments}
              dimensions={dimensions}
              animation={frame}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playPause: {
    marginLeft: 4,
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('semibold'),
  },
  board: {
    ...continuousRadius(10),
    overflow: 'hidden',
    position: 'relative',
  },
});
