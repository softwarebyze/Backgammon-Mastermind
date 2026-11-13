import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { useId } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  BEAR_OFF_MAX_CHECKERS,
  bearOffHalfHeight,
  bearOffSlotTopInSection,
  bearOffStackLayout,
  bearOffTokenSize,
} from '@/features/game/bear-off-layout';
import { translate } from '@/lib/i18n';
import { BOARD_THEME } from './board-theme';

type Props = {
  cubeClearance?: number;
  whiteBorneOff: number;
  blackBorneOff: number;
  isLegalTarget: boolean;
  currentPlayer: Player;
  onPress: () => void;
  width: number;
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
};

type StackProps = {
  cubeClearance: number;
  count: number;
  player: Player;
  halfHeight: number;
  width: number;
  checkerSize: number;
  middleHeight: number;
  isLegalTarget: boolean;
  isTargetSide: boolean;
};

type SlabProps = {
  player: Player;
  width: number;
  thickness: number;
  style?: object;
};

/** Edge-on disc in the tray, XG-style, using the same checker colors as the board. */
export function BearOffSlab({ player, width, thickness, style }: SlabProps) {
  const uid = useId().replace(/:/g, '');
  const isWhite = player === 'white';
  const colors = isWhite ? BOARD_THEME.checker.white : BOARD_THEME.checker.black;
  const faceId = `bearoff-face-${uid}`;
  const bodyId = `bearoff-body-${uid}`;
  const faceRy = Math.min(thickness * 0.35, width * 0.22);
  const faceCy = faceRy + 0.5;
  const bodyTop = faceCy;
  const bodyHeight = Math.max(0.75, thickness - faceCy - 0.5);
  const rx = Math.min(2, width / 6);

  return (
    <View testID="bear-off-slab" style={[{ width, height: thickness }, style]}>
      <Svg width={width} height={thickness}>
        <Defs>
          <LinearGradient id={bodyId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.highlight} />
            <Stop offset="45%" stopColor={colors.mid} />
            <Stop offset="100%" stopColor={colors.shadow} />
          </LinearGradient>
          <LinearGradient id={faceId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.highlight} />
            <Stop offset="70%" stopColor={colors.mid} />
            <Stop offset="100%" stopColor={colors.shadow} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0.5}
          y={bodyTop}
          width={width - 1}
          height={bodyHeight}
          rx={rx}
          fill={`url(#${bodyId})`}
          stroke={colors.rim}
          strokeWidth={0.6}
        />
        <Ellipse
          cx={width / 2}
          cy={faceCy}
          rx={(width - 1) / 2}
          ry={faceRy}
          fill={`url(#${faceId})`}
          stroke={colors.rim}
          strokeWidth={0.7}
        />
        <Ellipse
          cx={width / 2}
          cy={faceCy}
          rx={(width - 1) * 0.28}
          ry={faceRy * 0.45}
          fill="none"
          stroke={isWhite ? 'rgba(255,255,255,0.55)' : 'rgba(140,140,210,0.4)'}
          strokeWidth={0.7}
        />
      </Svg>
    </View>
  );
}

function BearOffStack({
  cubeClearance,
  count,
  player,
  halfHeight,
  width,
  checkerSize,
  middleHeight,
  isLegalTarget,
  isTargetSide,
}: StackProps) {
  const tokenSize = bearOffTokenSize(checkerSize);
  const visible = Math.min(count, BEAR_OFF_MAX_CHECKERS);
  const layout = bearOffStackLayout({
    halfHeight,
    tokenSize,
    count: Math.max(visible, 1),
    clearance: cubeClearance,
    bearOffWidth: width,
    middleHeight,
  });
  const slabWidth = Math.max(8, width - 6);
  const showTarget = isLegalTarget && isTargetSide;
  const emptyTop = bearOffSlotTopInSection({
    clearance: cubeClearance,
    halfHeight,
    tokenSize,
    visibleCount: 1,
    slotIndex: 0,
    player,
    bearOffWidth: width,
    middleHeight,
  });

  return (
    <View
      style={{
        height: halfHeight,
        width,
        overflow: 'hidden',
        alignItems: 'center',
        borderWidth: showTarget ? 2 : 0,
        borderColor: '#4CAF50',
        borderRadius: 6,
      }}
    >
      {count === 0 && (
        <View
          testID="bear-off-empty-slot"
          style={{
            position: 'absolute',
            top: emptyTop,
            left: (width - slabWidth) / 2,
            width: slabWidth,
            height: layout.thickness,
            borderRadius: Math.min(layout.thickness / 2, slabWidth / 2),
            borderWidth: 1,
            borderColor: showTarget ? '#4CAF50' : BOARD_THEME.bearOff.border,
            borderStyle: 'dashed',
            backgroundColor: showTarget ? 'rgba(76, 175, 80, 0.25)' : 'rgba(0,0,0,0.15)',
          }}
        />
      )}

      {Array.from({ length: visible }, (_, slotIndex) => (
        <BearOffSlab
          key={slotIndex}
          player={player}
          width={slabWidth}
          thickness={layout.thickness}
          style={{
            position: 'absolute',
            left: (width - slabWidth) / 2,
            top: bearOffSlotTopInSection({
              clearance: cubeClearance,
              halfHeight,
              tokenSize,
              visibleCount: visible,
              slotIndex,
              player,
              bearOffWidth: width,
              middleHeight,
            }),
            zIndex: slotIndex + 1,
          }}
        />
      ))}
    </View>
  );
}

export function BearOffArea({
  cubeClearance = 0,
  whiteBorneOff,
  blackBorneOff,
  isLegalTarget,
  currentPlayer,
  onPress,
  width,
  boardHeight,
  middleHeight,
  checkerSize,
}: Props) {
  const halfHeight = bearOffHalfHeight(boardHeight, middleHeight);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translate('game.controls.bear_off_a11y')}
      onPress={(e) => {
        e?.stopPropagation?.();
        onPress();
      }}
      style={{
        width,
        height: boardHeight,
        backgroundColor: BOARD_THEME.bearOff.surface,
        borderLeftWidth: 1,
        borderColor: BOARD_THEME.bearOff.border,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      }}
    >
      <BearOffStack
        cubeClearance={cubeClearance}
        count={blackBorneOff}
        player="black"
        halfHeight={halfHeight}
        width={width}
        checkerSize={checkerSize}
        middleHeight={middleHeight}
        isLegalTarget={isLegalTarget}
        isTargetSide={currentPlayer === 'black'}
      />

      <View
        style={{
          height: middleHeight,
          backgroundColor: BOARD_THEME.bar.groove,
          width,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: 'rgba(0,0,0,0.35)',
          zIndex: 40,
        }}
      />

      <BearOffStack
        cubeClearance={cubeClearance}
        count={whiteBorneOff}
        player="white"
        halfHeight={halfHeight}
        width={width}
        checkerSize={checkerSize}
        middleHeight={middleHeight}
        isLegalTarget={isLegalTarget}
        isTargetSide={currentPlayer === 'white'}
      />
    </Pressable>
  );
}
