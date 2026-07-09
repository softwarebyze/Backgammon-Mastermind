import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState } from '@/lib/game/types';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line, Polygon } from 'react-native-svg';

import { resolvePathAnchors } from '@/features/game/components/board/move-path-anchors';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { buildArrowhead, unitVector } from '@/lib/ui/arrow-geometry';

export type PathSegment = {
  entry: MoveLogEntry;
  beforeState: GameState;
  /** Dim inactive segments while one move is mid-flight. */
  active?: boolean;
};

type Props = {
  /** One or more move paths (whole-turn review shows all). */
  segments: PathSegment[];
  dimensions: BoardDimensions;
  /** When set, the matching segment follows the in-flight animation. */
  animation?: MoveAnimationFrame | null;
  /** Softly fade the whole overlay out (undo/redo hold). */
  fadeOutMs?: number;
};

const ARROW_COLOR = GAME_PALETTE.accent;

function PathArrow({
  entry,
  beforeState,
  dimensions,
  animation,
  opacity,
}: {
  entry: MoveLogEntry;
  beforeState: GameState;
  dimensions: BoardDimensions;
  animation?: MoveAnimationFrame | null;
  opacity: number;
}) {
  // Tip/tail on checker centers (openings-website style) — no extra inset trim.
  const { from, to } = resolvePathAnchors({ entry, beforeState, dims: dimensions, animation });
  const { x: ux, y: uy } = unitVector(from, to);
  const { lineEnd, polygonPoints } = buildArrowhead(to, { x: ux, y: uy }, {
    length: 12,
    halfWidth: 6.5,
  });

  return (
    <>
      <Line
        x1={from.x}
        y1={from.y}
        x2={lineEnd.x}
        y2={lineEnd.y}
        stroke={ARROW_COLOR}
        strokeWidth={3}
        strokeDasharray="10 8"
        strokeLinecap="round"
        opacity={opacity}
      />
      <Polygon points={polygonPoints} fill={ARROW_COLOR} opacity={opacity} />
    </>
  );
}

/** Dashed path(s) from checker origin to landing — website-style, supports whole turns. */
export function MovePathOverlay({ segments, dimensions, animation, fadeOutMs }: Props) {
  const fade = useSharedValue(1);

  useEffect(() => {
    if (fadeOutMs && fadeOutMs > 0) {
      fade.value = 1;
      fade.value = withTiming(0, { duration: fadeOutMs });
      return;
    }
    fade.value = 1;
  }, [fade, fadeOutMs, segments.length]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (segments.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {segments.map((seg) => {
          const matchesAnim = animation
            && ((animation.from === seg.entry.from && animation.to === seg.entry.to)
              || (animation.from === seg.entry.to && animation.to === seg.entry.from));
          const opacity = seg.active === false ? 0.35 : matchesAnim ? 0.95 : 0.75;
          return (
            <PathArrow
              key={seg.entry.ply}
              entry={seg.entry}
              beforeState={seg.beforeState}
              dimensions={dimensions}
              animation={matchesAnim ? animation : null}
              opacity={opacity}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

/** Back-compat helper for single-entry callers (undo path, etc.). */
export function singlePathSegments(
  entry: MoveLogEntry | null,
  beforeState: GameState | null,
): PathSegment[] {
  if (!entry || !beforeState) {
    return [];
  }
  return [{ entry, beforeState, active: true }];
}
