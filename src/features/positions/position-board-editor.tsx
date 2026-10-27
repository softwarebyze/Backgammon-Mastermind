import type { StackEditHandlers } from '@/features/game/components/board/use-stack-edit-gesture';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { BoardView } from '@/features/game/components/board/board-view';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';
import { setPositionStack, stackDragCount } from '@/lib/positions/set-stack';
import { PositionAction } from './position-controls';
import { PositionEditor } from './position-editor';
import { styles } from './position-styles';

type Drag = { position: Position; location: PositionLocation; color: Player; count: number; top: boolean };

export function PositionBoardEditor({ position, dimensions, location, onLocation, onChange }: {
  position: Position;
  dimensions: BoardDimensions;
  location: PositionLocation | null;
  onLocation: (location: PositionLocation | null) => void;
  onChange: (position: Position) => void;
}) {
  const [color, setColor] = useState<Player>('white');
  const [fine, setFine] = useState(false);
  const latest = useRef({ position, color, onLocation, onChange });
  latest.current = { position, color, onLocation, onChange };
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
      };
    };
    const apply = (start: Drag, count: number) => latest.current.onChange(setPositionStack(start.position, start.location, start.color, count));
    return {
      onStart: (point) => {
        drag.current = snapshot(point);
        latest.current.onLocation(drag.current.location);
      },
      onDelta: (_point, steps) => {
        const start = drag.current;
        if (start)
          apply(start, stackDragCount(start.count, steps, start.top));
      },
      onEnd: (_point, tap, steps) => {
        if (drag.current && (tap || steps !== undefined)) {
          const start = drag.current;
          apply(start, tap ? start.count + 1 : stackDragCount(start.count, steps!, start.top));
        }
        drag.current = null;
      },
      onCancel: () => {
        if (drag.current)
          latest.current.onChange(drag.current.position);
        drag.current = null;
      },
      onAdjust: (point, delta) => {
        const start = snapshot(point);
        latest.current.onLocation(start.location);
        apply(start, start.count + delta);
      },
    };
  }, []);
  const board = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), selectedPoint: typeof location === 'number' ? location : null };
  return (
    <View style={{ gap: 12, alignSelf: 'center', width: dimensions.boardOuterWidth }}>
      <View style={styles.row}>
        {(['white', 'black'] as const).map(side => (
          <PositionAction key={side} testID={`position-paint-${side}`} icon={<CheckerToken player={side} size={24} />} label={translate(`positions.${side}`)} selected={color === side} onPress={() => setColor(side)} />
        ))}
        <Text style={styles.caption}>{translate('positions.off_counts', position.borneOff)}</Text>
      </View>
      <View style={styles.board}>
        <BoardView state={board} dimensions={dimensions} previewTarget={null} moveAnimation={null} editMode stackEditor={editor} onPointPress={point => editor.onAdjust(point, 1)} onPointPressIn={() => {}} onPointPressOut={() => {}} onBarPress={() => editor.onAdjust(0, 1)} onBearOffPress={() => {}} aidsOverride={{ showPointNumbers: true, showMoveHints: false, showDirectionOverlay: false }} />
      </View>
      <Text style={styles.caption}>{translate('positions.drag_hint')}</Text>
      <PositionAction label={translate('positions.fine_tune')} testID="position-fine-tune" selected={fine} onPress={() => setFine(!fine)} />
      {fine && <PositionEditor position={position} location={location} color={color} onLocation={onLocation} onChange={onChange} />}
    </View>
  );
}
