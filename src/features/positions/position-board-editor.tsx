import type { StackEditHandlers } from '@/features/game/components/board/use-stack-edit-gesture';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { BoardView } from '@/features/game/components/board/board-view';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';
import { setPositionStack, stackDragCount, stackPressCount } from '@/lib/positions/set-stack';
import { PositionAction } from './position-controls';
import { PositionEditor } from './position-editor';
import { styles } from './position-styles';

type Drag = { position: Position; location: PositionLocation; color: Player; count: number; top: boolean; notified: boolean };

export function PositionBoardEditor({ position, dimensions, location, onLocation, onChange }: {
  position: Position;
  dimensions: BoardDimensions;
  location: PositionLocation | null;
  onLocation: (location: PositionLocation | null) => void;
  onChange: (position: Position) => void;
}) {
  const [color, setColor] = useState<Player>('white');
  const [fine, setFine] = useState(false);
  const [blocked, setBlocked] = useState<Player | null>(null);
  const latest = useRef({ position, color, dimensions, onLocation, onChange });
  latest.current = { position, color, dimensions, onLocation, onChange };
  const drag = useRef<Drag | null>(null);
  const editor = useMemo<StackEditHandlers>(() => {
    const snapshot = (point: number): Drag => {
      const { position: p, color: side } = latest.current;
      return {
        position: p,
        color: side,
        location: point === 0 ? `${side}-bar` : point,
        count: point === 0 ? p.bar[side] : p.points[point]!.player === side ? p.points[point]!.count : 0,
        top: point === 0 ? side === 'black' : point >= 13,
        notified: false,
      };
    };
    const apply = (start: Drag, count: number, requested = count): Position => {
      const next = setPositionStack(start.position, start.location, start.color, count);
      const placed = typeof start.location === 'number'
        ? next.points[start.location]!.player === start.color ? next.points[start.location]!.count : 0
        : next.bar[start.color];
      if (requested > placed && next.borneOff[start.color] === 0 && !start.notified) {
        start.notified = true;
        setBlocked(start.color);
        hapticLight();
      }
      latest.current.onChange(next);
      return next;
    };
    const move = (start: Drag, steps: number) => apply(start, stackDragCount(start.count, steps, start.top), start.count + (start.top ? steps : -steps));
    return {
      onStart: (point, y) => {
        const start = snapshot(point);
        drag.current = start;
        setBlocked(null);
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
          latest.current.onChange(drag.current.position);
        drag.current = null;
        setBlocked(null);
      },
      onAdjust: (point, delta) => {
        setBlocked(null);
        const start = snapshot(point);
        latest.current.onLocation(start.location);
        apply(start, start.count + delta);
      },
    };
  }, []);
  const board = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), currentPlayer: color, selectedPoint: typeof location === 'number' ? location : location ? 0 : null };
  return (
    <View style={{ gap: 12, alignSelf: 'center', width: dimensions.boardOuterWidth }}>
      <View style={styles.row}>
        {(['white', 'black'] as const).map(side => (
          <PositionAction
            key={side}
            testID={`position-paint-${side}`}
            icon={<CheckerToken player={side} size={24} />}
            label={translate(`positions.${side}`)}
            selected={color === side}
            onPress={() => {
              setColor(side);
              setBlocked(null);
            }}
          />
        ))}
        <PositionAction symbol="sliders" iconOnly label={translate('positions.fine_tune')} testID="position-fine-tune" selected={fine} onPress={() => setFine(!fine)} />
      </View>
      <Text style={styles.caption}>{translate('positions.off_counts', position.borneOff)}</Text>
      <View style={styles.board}>
        <BoardView state={board} dimensions={dimensions} previewTarget={null} moveAnimation={null} editMode stackEditor={editor} onPointPress={point => editor.onAdjust(point, 1)} onPointPressIn={() => {}} onPointPressOut={() => {}} onBarPress={() => editor.onAdjust(0, 1)} onBearOffPress={() => {}} aidsOverride={{ showPointNumbers: true, showMoveHints: false, showDirectionOverlay: false }} />
      </View>
      <Text style={styles.caption}>{translate('positions.drag_hint')}</Text>
      {blocked && position.borneOff[blocked] === 0 && <Text testID="position-no-checkers" accessibilityLiveRegion="polite" style={styles.caption}>{translate('positions.no_checkers', { player: translate(`positions.${blocked}`) })}</Text>}
      {fine && <PositionEditor position={position} location={location} color={color} onChange={onChange} />}
    </View>
  );
}
