import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import type { BoardPoint } from '@/game/types';
import { CheckerToken } from './CheckerToken';

const MAX_VISIBLE = 5;
const POINT_COLORS = {
  dark: '#8B1A1A',   // deep red triangles
  light: '#D4A843',  // amber/gold triangles
};

interface Props {
  pointIndex: number;
  point: BoardPoint;
  isTop: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  onPress: () => void;
  colWidth: number;
  pointHeight: number;
  checkerSize: number;
}

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

  // How far apart checkers stack from the base of the triangle
  const stackStep = Math.min(checkerSize - 2, (pointHeight - checkerSize) / (MAX_VISIBLE - 1));

  const visibleCount = Math.min(point.count, MAX_VISIBLE);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ width: colWidth, height: pointHeight, position: 'relative' }}
    >
      {/* Triangle */}
      {isTop ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: colWidth / 2,
              borderRightWidth: colWidth / 2,
              borderTopWidth: pointHeight,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: triangleColor,
            }}
          />
        </View>
      ) : (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: colWidth / 2,
              borderRightWidth: colWidth / 2,
              borderBottomWidth: pointHeight,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: triangleColor,
            }}
          />
        </View>
      )}

      {/* Checkers */}
      {point.count > 0 &&
        Array.from({ length: visibleCount }, (_, i) => {
          const offset = i * stackStep;
          const isTopChecker = i === visibleCount - 1;
          return (
            <CheckerToken
              key={i}
              player={point.player!}
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

      {/* Legal target indicator (empty point) */}
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
