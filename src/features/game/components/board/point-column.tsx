import type { BoardPoint, Player } from '@/lib/game/types';
import { TouchableOpacity, View } from 'react-native';
import { CheckerToken } from './checker-token';

const MAX_VISIBLE = 5;
const POINT_COLORS = {
  dark: '#8B1A1A',
  light: '#D4A843',
};

type TriangleProps = {
  isTop: boolean;
  colWidth: number;
  pointHeight: number;
  color: string;
};

function PointTriangle({ isTop, colWidth, pointHeight, color }: TriangleProps) {
  const halfWidth = colWidth / 2;
  const borderStyle = isTop
    ? {
        borderTopWidth: pointHeight,
        borderTopColor: color,
      }
    : {
        borderBottomWidth: pointHeight,
        borderBottomColor: color,
      };

  return (
    <View
      style={{
        position: 'absolute',
        [isTop ? 'top' : 'bottom']: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: halfWidth,
          borderRightWidth: halfWidth,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          ...borderStyle,
        }}
      />
    </View>
  );
}

type CheckersProps = {
  point: BoardPoint;
  isTop: boolean;
  colWidth: number;
  checkerSize: number;
  stackStep: number;
  visibleCount: number;
};

function PointCheckers({
  point,
  isTop,
  colWidth,
  checkerSize,
  stackStep,
  visibleCount,
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
            style={{
              position: 'absolute',
              [isTop ? 'top' : 'bottom']: offset,
              left: (colWidth - checkerSize) / 2,
              zIndex: i + 1,
            }}
          />
        );
      })}
    </>
  );
}

type Props = {
  pointIndex: number;
  point: BoardPoint;
  isTop: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  onPress: () => void;
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
  onPress,
  colWidth,
  pointHeight,
  checkerSize,
}: Props) {
  const isDark = pointIndex % 2 === 0;
  const baseColor = isDark ? POINT_COLORS.dark : POINT_COLORS.light;
  const triangleColor = isSelected
    ? '#FFD700'
    : isLegalTarget
      ? '#4CAF50'
      : baseColor;

  const stackStep = Math.min(checkerSize - 2, (pointHeight - checkerSize) / (MAX_VISIBLE - 1));
  const visibleCount = Math.min(point.count, MAX_VISIBLE);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Point ${pointIndex}${isSelected ? ', selected' : ''}${isLegalTarget ? ', legal move target' : ''}`}
      onPress={onPress}
      activeOpacity={0.75}
      style={{ width: colWidth, height: pointHeight, position: 'relative' }}
    >
      <PointTriangle
        isTop={isTop}
        colWidth={colWidth}
        pointHeight={pointHeight}
        color={triangleColor}
      />

      <PointCheckers
        point={point}
        isTop={isTop}
        colWidth={colWidth}
        checkerSize={checkerSize}
        stackStep={stackStep}
        visibleCount={visibleCount}
      />

      {isLegalTarget && point.count === 0 && (
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            marginLeft: -12,
            marginTop: -12,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: 'rgba(76, 175, 80, 0.5)',
            borderWidth: 2,
            borderColor: '#4CAF50',
            zIndex: 10,
          }}
        />
      )}
    </TouchableOpacity>
  );
}
