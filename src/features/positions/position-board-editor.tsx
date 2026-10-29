import type { ReactNode } from 'react';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { BoardView } from '@/features/game/components/board/board-view';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';
import { positionControlAnchor } from './position-control-anchor';
import { PositionAction } from './position-controls';
import { PositionEditor } from './position-editor';
import { styles } from './position-styles';
import { usePositionStackEditor } from './use-position-stack-editor';

export function PositionBoardEditor({ position, dimensions, location, onLocation, onChange, actions }: {
  actions?: ReactNode;
  position: Position;
  dimensions: BoardDimensions;
  location: PositionLocation | null;
  onLocation: (location: PositionLocation | null) => void;
  onChange: (position: Position) => void;
}) {
  const [color, setColor] = useState<Player>('white');
  const dragging = useRef(false);
  const pendingLocation = useRef(location);
  // Keep the board stationary under the finger. Reveal exact controls only
  // after the stroke ends; subsequent strokes retain their starting layout.
  const select = (next: PositionLocation | null) => {
    pendingLocation.current = next;
    if (!dragging.current)
      onLocation(next);
  };
  const editor = usePositionStackEditor({ position, color, location, dimensions, onLocation: select, onChange, onBlocked: (side) => {
    if (side)
      AccessibilityInfo.announceForAccessibility(translate('positions.no_checkers', { player: translate(`positions.${side}`) }));
  } });
  const board = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), currentPlayer: location === 'black-bar' ? 'black' : location === 'white-bar' ? 'white' : color, selectedPoint: typeof location === 'number' ? location : location ? 0 : null };
  const anchor = location === null ? null : positionControlAnchor(location, dimensions);
  return (
    <View style={{ gap: 6, alignSelf: 'center', width: dimensions.boardOuterWidth }}>
      <View style={styles.boardToolbar}>
        <PaintColors
          color={color}
          onChange={(side) => {
            setColor(side);
            onLocation(null);
          }}
        />
        {actions}
      </View>
      <View style={[styles.board, { position: 'relative' }]}>
        <BoardView
          state={board}
          dimensions={dimensions}
          previewTarget={null}
          moveAnimation={null}
          editMode
          stackEditor={{
            ...editor,
            onStart: (point, y) => {
              dragging.current = true;
              editor.onStart(point, y);
            },
            onEnd: (point, tap, delta) => {
              editor.onEnd(point, tap, delta);
              dragging.current = false;
              onLocation(pendingLocation.current);
            },
            onCancel: () => {
              editor.onCancel();
              dragging.current = false;
            },
          }}
          onPointPress={point => editor.onAdjust(point, 1)}
          onPointPressIn={() => {}}
          onPointPressOut={() => {}}
          onBarPress={() => editor.onAdjust(0, 1)}
          onBearOffPress={() => {}}
          aidsOverride={{ showPointNumbers: true, showMoveHints: false, showDirectionOverlay: false }}
        />
        {location !== null && anchor && (
          <View
            // Keep the legacy top/bottom ids so existing flows keep finding the
            // strip, while the strip itself now floats over the board and can
            // never push the board (or anything below it) around in flow.
            testID={anchor.top ? 'position-controls-top' : 'position-controls-bottom'}
            style={[styles.pointControlsOverlay, { left: anchor.left, top: anchor.top ? 8 : undefined, bottom: anchor.top ? undefined : 8 }]}
          >
            <PositionEditor position={position} location={location} color={color} dimensions={dimensions} onChange={onChange} onLocation={onLocation} />
          </View>
        )}
      </View>
    </View>
  );
}

function PaintColors({ color, onChange }: { color: Player; onChange: (side: Player) => void }) {
  return (['white', 'black'] as const).map(side => (
    <PositionAction key={side} testID={`position-paint-${side}`} compact iconOnly icon={<CheckerToken player={side} size={28} />} label={translate(`positions.${side}`)} selected={color === side} onPress={() => onChange(side)} />
  ));
}
