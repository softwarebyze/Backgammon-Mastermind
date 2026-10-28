import type { StackEditHandlers } from '@/features/game/components/board/use-stack-edit-gesture';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { useMemo, useRef } from 'react';
import { hapticLight } from '@/lib/haptics';
import { setPositionStack, stackDragCount, stackPressCount } from '@/lib/positions/set-stack';

type Drag = { rollback: Position; position: Position; location: PositionLocation; color: Player; count: number; offset: number; top: boolean; notified: boolean };

export function usePositionStackEditor(props: {
  position: Position;
  color: Player;
  location: PositionLocation | null;
  dimensions: BoardDimensions;
  onLocation: (location: PositionLocation | null) => void;
  onChange: (p: Position) => void;
  onBlocked: (color: Player | null) => void;
  onTouch: () => void;
}) {
  const latest = useRef(props);
  latest.current = props;
  const drag = useRef<Drag | null>(null);
  const editor = useMemo<StackEditHandlers>(() => {
    const snapshot = (point: number, y?: number): Drag => {
      const { position: p, color, location, dimensions } = latest.current;
      const touchedBar = y !== undefined && y < dimensions.boardHeight / 2 ? 'black' : 'white';
      const barSide = y !== undefined
        ? p.bar[touchedBar] > 0 ? touchedBar : color
        : location === 'black-bar' ? 'black' : location === 'white-bar' ? 'white' : color;
      const side = point === 0 ? barSide : p.points[point]!.player ?? color;
      return {
        offset: 0,
        rollback: p,
        position: p,
        color: side,
        location: point === 0 ? `${side}-bar` : point,
        count: point === 0 ? p.bar[side] : p.points[point]!.count,
        top: point === 0 ? side === 'black' : point >= 13,
        notified: false,
      };
    };
    const apply = (start: Drag, count: number, requested = count): Position => {
      const next = setPositionStack(start.position, start.location, start.color, count + start.offset);
      const placed = typeof start.location === 'number'
        ? next.points[start.location]!.player === start.color ? next.points[start.location]!.count : 0
        : next.bar[start.color] - start.offset;
      if (requested > placed && next.borneOff[start.color] === 0 && !start.notified) {
        start.notified = true;
        latest.current.onBlocked(start.color);
        hapticLight();
      }
      latest.current.onChange(next);
      if (placed === 0 && count <= 0) {
        // Crossing zero commits an empty base for this stroke. Reversing adds
        // the selected colour instead of resurrecting the old stack.
        start.position = next;
        start.color = latest.current.color;
        if (typeof start.location === 'string') {
          start.location = `${start.color}-bar`;
          start.offset = next.bar[start.color];
          latest.current.onLocation(start.location);
        }
      }
      return next;
    };
    const move = (start: Drag, steps: number) => apply(start, stackDragCount(start.count, steps, start.top), start.count + (start.top ? steps : -steps));
    return {
      onStart: (point, y) => {
        const start = snapshot(point, y);
        latest.current.onTouch();
        drag.current = start;
        latest.current.onBlocked(null);
        latest.current.onLocation(start.location);
        const d = latest.current.dimensions;
        const height = point === 0 ? d.boardHeight : d.pointHeight;
        const distance = start.top ? y : height - y;
        const count = point === 0
          ? stackPressCount(distance - 6, d.checkerSize * 0.88, d.checkerSize * 0.88 + 2)
          : stackPressCount(distance, d.checkerSize, Math.min(d.checkerSize - 2, (d.pointHeight - d.checkerSize) / 4));
        const next = apply(start, count);
        start.count = point === 0 ? next.bar[start.color] : next.points[point]!.player === start.color ? next.points[point]!.count : 0;
      },
      onDelta: (_point, steps) => {
        const start = drag.current;
        if (start)
          move(start, steps);
      },
      onEnd: (_point, tap, steps) => {
        if (drag.current && !tap && steps !== undefined) {
          const start = drag.current;
          move(start, steps);
        }
        drag.current = null;
      },
      onCancel: () => {
        if (drag.current)
          latest.current.onChange(drag.current.rollback);
        drag.current = null;
        latest.current.onBlocked(null);
      },
      onAdjust: (point, delta) => {
        latest.current.onTouch();
        latest.current.onBlocked(null);
        const start = snapshot(point);
        latest.current.onLocation(start.location);
        apply(start, start.count + delta);
      },
    };
  }, []);
  return editor;
}
