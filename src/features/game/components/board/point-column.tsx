import type { BoardPoint, Player } from '@/lib/game/types';
import { Pressable, View } from 'react-native';
import { getPointPalette } from './board-theme';
import { CheckerToken } from './checker-token';
import { PointTriangle } from './point-triangle';

const MAX_VISIBLE = 5;

type CheckersProps = {
  point: BoardPoint;
  isTop: boolean;
  colWidth: number;
  checkerSize: number;
  stackStep: number;
  visibleCount: number;
  showGhost: boolean;
  ghostPlayer: Player | null;
  hintTopChecker: boolean;
};

function PointCheckers({
  point,
  isTop,
  colWidth,
  checkerSize,
  stackStep,
  visibleCount,
  showGhost,
  ghostPlayer,
  hintTopChecker,
}: CheckersProps) {
  if (point.count === 0) {
    return null;
  }

  return (
    <>
      {Array.from({ length: visibleCount }, (_, i) => {
        const offset = i * stackStep;
        const isTopChecker = i === visibleCount - 1;
        return (
          <CheckerToken
            key={i}
            player={point.player as Player}
            size={checkerSize}
            showCount={isTopChecker && point.count > MAX_VISIBLE ? point.count : undefined}
            showMoveHint={hintTopChecker && isTopChecker}
            style={{
              position: 'absolute',
              [isTop ? 'top' : 'bottom']: offset,
              left: (colWidth - checkerSize) / 2,
              zIndex: i + 1,
            }}
          />
        );
      })}
      {showGhost && ghostPlayer && (
        <CheckerToken
          player={ghostPlayer}
          size={checkerSize}
          style={{
            position: 'absolute',
            [isTop ? 'top' : 'bottom']: visibleCount * stackStep,
            left: (colWidth - checkerSize) / 2,
            zIndex: 20,
            opacity: 0.35,
          }}
        />
      )}
    </>
  );
}

type Props = {
  pointIndex: number;
  point: BoardPoint;
  isTop: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isMovableSource: boolean;
  showGhost: boolean;
  ghostPlayer: Player | null;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  colWidth: number;
  pointHeight: number;
  checkerSize: number;
};

export function PointColumn({
  pointIndex,
  point,
  isTop,
  isSelected,
  isLegalTarget,
  isMovableSource,
  showGhost,
  ghostPlayer,
  onPress,
  onPressIn,
  onPressOut,
  colWidth,
  pointHeight,
  checkerSize,
}: Props) {
  let pointState: 'default' | 'selected' | 'legal' = 'default';
  if (isSelected) {
    pointState = 'selected';
  }
  else if (isLegalTarget) {
    pointState = 'legal';
  }
  const palette = getPointPalette(pointIndex, pointState);

  const stackStep = Math.min(checkerSize - 2, (pointHeight - checkerSize) / (MAX_VISIBLE - 1));
  const visibleCount = Math.min(point.count, MAX_VISIBLE);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Point ${pointIndex}${isSelected ? ', selected' : ''}${isLegalTarget ? ', legal move target' : ''}`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: colWidth, height: pointHeight, position: 'relative' }}
    >
      <PointTriangle
        isTop={isTop}
        width={colWidth}
        height={pointHeight}
        palette={palette}
      />

      <PointCheckers
        point={point}
        isTop={isTop}
        colWidth={colWidth}
        checkerSize={checkerSize}
        stackStep={stackStep}
        visibleCount={visibleCount}
        showGhost={showGhost}
        ghostPlayer={ghostPlayer}
        hintTopChecker={isMovableSource}
      />

      {isLegalTarget && point.count === 0 && (
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -8,
            marginTop: -8,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: 'rgba(76, 175, 80, 0.35)',
            borderWidth: 1.5,
            borderColor: 'rgba(76, 175, 80, 0.7)',
            zIndex: 10,
          }}
        />
      )}
    </Pressable>
  );
}
