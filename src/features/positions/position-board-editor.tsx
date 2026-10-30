import type { ReactNode } from 'react';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { useRef } from 'react';
import { AccessibilityInfo, Pressable, View } from 'react-native';
import { BoardView } from '@/features/game/components/board/board-view';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';
import { PositionBoardDice } from './position-board-dice';
import { BoardCube } from './position-cube';
import { PositionPlayerStrip } from './position-players';
import { styles } from './position-styles';
import { usePositionStackEditor } from './use-position-stack-editor';

export function PositionBoardEditor({ position, dimensions, location, color, onColor, onLocation, onChange, actions, onStrokeStart, onStrokeEnd, showToolbar = true }: {
  actions?: ReactNode;
  /** Wide layouts move the paint and setup buttons beside the board. */
  showToolbar?: boolean;
  position: Position;
  dimensions: BoardDimensions;
  location: PositionLocation | null;
  color: Player;
  onColor: (color: Player) => void;
  onLocation: (location: PositionLocation | null) => void;
  onChange: (position: Position) => void;
  /** A drag is one undo step: bracket every stroke. */
  onStrokeStart?: () => void;
  onStrokeEnd?: () => void;
}) {
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
  const board = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), currentPlayer: location === 'black-bar' ? 'black' : location === 'white-bar' ? 'white' : color, selectedPoint: null };
  const single = (run: () => void) => {
    onStrokeStart?.();
    run();
    onStrokeEnd?.();
  };
  return (
    <View style={{ gap: 8, alignSelf: 'stretch', alignItems: 'stretch' }}>
      {showToolbar && <PositionEditorToolbar color={color} onColor={onColor} onLocation={onLocation} actions={actions} />}
      <PositionPlayerStrip position={position} player="black" onChange={onChange} />
      <View style={styles.board}>
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
              onStrokeStart?.();
              editor.onStart(point, y);
            },
            onEnd: (point, tap, delta) => {
              editor.onEnd(point, tap, delta);
              dragging.current = false;
              onStrokeEnd?.();
              onLocation(pendingLocation.current);
            },
            onCancel: () => {
              editor.onCancel();
              dragging.current = false;
              onStrokeEnd?.();
            },
            onAdjust: (point, delta) => single(() => editor.onAdjust(point, delta)),
          }}
          onPointPress={point => single(() => editor.onAdjust(point, 1))}
          onPointPressIn={() => {}}
          onPointPressOut={() => {}}
          onBarPress={() => single(() => editor.onAdjust(0, 1))}
          onBearOffPress={() => {}}
          aidsOverride={{ showPointNumbers: true, showMoveHints: false, showDirectionOverlay: false }}
        />
        <PositionBoardDice position={position} dimensions={dimensions} onChange={onChange} />
        <BoardCube position={position} dimensions={dimensions} onChange={patch => onChange({ ...position, context: { ...position.context, ...patch } })} />
      </View>
      <PositionPlayerStrip position={position} player="white" onChange={onChange} />
    </View>
  );
}

/** Paint colour on the left, setup actions (standard, clear) on the right. */
export function PositionEditorToolbar({ color, onColor, onLocation, actions }: {
  color: Player;
  onColor: (color: Player) => void;
  onLocation: (location: PositionLocation | null) => void;
  actions?: ReactNode;
}) {
  return (
    <View style={styles.boardToolbar}>
      <PaintColors
        color={color}
        onChange={(side) => {
          onColor(side);
          onLocation(null);
        }}
      />
      <View style={styles.toolbarSpacer} />
      {/* Setup actions wrap below the colours together on narrow screens. */}
      <View style={styles.toolbarActions}>{actions}</View>
    </View>
  );
}

/** Which colour taps and drags add. Existing stacks keep their own colour. */
function PaintColors({ color, onChange }: { color: Player; onChange: (side: Player) => void }) {
  return (
    <View style={styles.paintGroup} accessibilityLabel={translate('positions.paint')}>
      {(['white', 'black'] as const).map(side => (
        <Pressable
          key={side}
          testID={`position-paint-${side}`}
          accessibilityRole="button"
          accessibilityLabel={translate(`positions.${side}`)}
          accessibilityState={{ selected: color === side }}
          onPress={() => onChange(side)}
          style={({ pressed }) => [styles.paintSwatch, color === side && styles.paintSwatchActive, pressed && styles.pressed]}
        >
          <CheckerToken player={side} size={26} />
        </Pressable>
      ))}
    </View>
  );
}
