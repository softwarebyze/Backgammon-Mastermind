import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Position } from '@/lib/positions/position';
import { Pressable, View } from 'react-native';
import { boardDiceSide, boardDieGap, boardDieSize, boardHalfFrame } from '@/features/game/components/board/board-dice-layout';
import { DieFace, EmptyDiePlaceholder } from '@/features/game/components/board/dice-display';
import { playingSurfaceOffset } from '@/features/game/components/board/playing-surface-offset';
import { translate } from '@/lib/i18n';

/** 1 → 6, then blank ("roll when play starts"), then 1 again. */
function nextDieValue(value: number): number {
  return value >= 6 ? 0 : value + 1;
}

/**
 * The editor's dice sit on the board in the roller's half, exactly where a
 * game draws them. Tapping a die steps its value, so nothing covers the board.
 */
export function PositionBoardDice({ position, dimensions, onChange }: {
  position: Position;
  dimensions: BoardDimensions;
  onChange: (p: Position) => void;
}) {
  const size = boardDieSize(dimensions.checkerSize, 6 * dimensions.colWidth);
  const half = boardHalfFrame(dimensions, boardDiceSide(position.currentPlayer));
  const surface = playingSurfaceOffset(dimensions.boardFrameWidth, true);
  const setDie = (index: 0 | 1) => {
    const dice: [number, number] = [...position.dice];
    dice[index] = nextDieValue(dice[index]);
    onChange({ ...position, dice });
  };
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: surface.left + half.left, top: surface.top, width: half.width, height: dimensions.boardHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: boardDieGap(size), zIndex: 30 }}
    >
      {([0, 1] as const).map(index => (
        <Pressable
          key={index}
          testID={`position-die-${index}`}
          accessibilityRole="adjustable"
          accessibilityLabel={`${translate('positions.dice')} ${index + 1}: ${position.dice[index] ? position.dice[index] : translate('positions.roll_later')}`}
          accessibilityActions={[{ name: 'increment' }]}
          onAccessibilityAction={() => setDie(index)}
          hitSlop={6}
          onPress={() => setDie(index)}
        >
          {position.dice[index] > 0
            ? <DieFace value={position.dice[index]} used={false} playerColor={position.currentPlayer} displayStyle="dots" size={size} />
            : <EmptyDiePlaceholder playerColor={position.currentPlayer} size={size} />}
        </Pressable>
      ))}
    </View>
  );
}
