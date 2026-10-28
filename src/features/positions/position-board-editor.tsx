import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position, PositionLocation } from '@/lib/positions/position';
import { useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { BoardView } from '@/features/game/components/board/board-view';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { translate } from '@/lib/i18n';
import { newPosition, positionGame } from '@/lib/positions/position';
import { positionControlAnchor } from './position-control-anchor';
import { PositionAction } from './position-controls';
import { PositionDice, PositionDiceChoices } from './position-dice';
import { PositionEditor } from './position-editor';
import { styles } from './position-styles';
import { usePositionStackEditor } from './use-position-stack-editor';

export function PositionBoardEditor({ position, dimensions, location, onLocation, onChange }: {
  position: Position;
  dimensions: BoardDimensions;
  location: PositionLocation | null;
  onLocation: (location: PositionLocation | null) => void;
  onChange: (position: Position) => void;
}) {
  const [color, setColor] = useState<Player>('white');
  const [editingDie, setEditingDie] = useState<0 | 1 | null>(null);
  const editor = usePositionStackEditor({ position, color, location, dimensions, onLocation, onChange, onBlocked: (side) => {
    if (side)
      AccessibilityInfo.announceForAccessibility(translate('positions.no_checkers', { player: translate(`positions.${side}`) }));
  }, onTouch: () => setEditingDie(null) });
  const board = { ...positionGame({ ...position, dice: [0, 0], context: newPosition().context }), currentPlayer: location === 'black-bar' ? 'black' : location === 'white-bar' ? 'white' : color, selectedPoint: typeof location === 'number' ? location : location ? 0 : null };
  return (
    <View style={{ gap: 12, alignSelf: 'center', width: dimensions.boardOuterWidth }}>
      <View style={styles.boardToolbar}>
        <PaintColors
          color={color}
          onChange={(side) => {
            setColor(side);
            onLocation(null);
            setEditingDie(null);
          }}
        />
        <PositionDice position={position} editing={editingDie} onEdit={setEditingDie} />
      </View>
      <View testID="position-controls-top" style={styles.pointControlBand}>
        {editingDie !== null
          ? <PositionDiceChoices position={position} onChange={onChange} editing={editingDie} onEdit={setEditingDie} />
          : location !== null && positionControlAnchor(location, dimensions).top
            ? <PositionEditor position={position} location={location} color={color} dimensions={dimensions} onChange={onChange} onLocation={onLocation} />
            : null}
      </View>
      <View style={styles.board}>
        <BoardView state={board} dimensions={dimensions} previewTarget={null} moveAnimation={null} editMode stackEditor={editor} onPointPress={point => editor.onAdjust(point, 1)} onPointPressIn={() => {}} onPointPressOut={() => {}} onBarPress={() => editor.onAdjust(0, 1)} onBearOffPress={() => {}} aidsOverride={{ showPointNumbers: true, showMoveHints: false, showDirectionOverlay: false }} />
      </View>
      <View testID="position-controls-bottom" style={styles.pointControlBand}>
        {location !== null && !positionControlAnchor(location, dimensions).top
          ? <PositionEditor position={position} location={location} color={color} dimensions={dimensions} onChange={onChange} onLocation={onLocation} />
          : null}
      </View>
    </View>
  );
}

function PaintColors({ color, onChange }: { color: Player; onChange: (side: Player) => void }) {
  return (['white', 'black'] as const).map(side => (
    <PositionAction key={side} testID={`position-paint-${side}`} compact icon={<CheckerToken player={side} size={20} />} label={translate(`positions.${side}`)} selected={color === side} onPress={() => onChange(side)} />
  ));
}
