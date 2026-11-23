import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  BEAR_OFF_COUNT_HEIGHT,
  BEAR_OFF_MAX_CHECKERS,
  bearOffHalfHeight,
  bearOffSlabOffset,
  bearOffSlotTopInSection,
  bearOffStackLayout,
  bearOffTokenSize,
} from '@/features/game/bear-off-layout';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { BOARD_THEME } from './board-theme';

type Props = {
  cubeFootprint?: number;
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
  cubeFootprint?: number;
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

function mix(a: string, b: string, t: number): string {
  const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map(i => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A borne-off checker standing on edge, seen from above: the slab colour,
 * shaded across its width like a cylinder at half a checker's contrast, with
 * a one-pixel rim and a faint top highlight.
 */
export function BearOffSlab({ player, width, thickness, style }: SlabProps) {
  const slab = BOARD_THEME.slab[player];
  const checker = BOARD_THEME.checker[player];
  const edge = mix(slab.fill, checker.shadow, 0.5);
  const centre = mix(slab.fill, checker.highlight, 0.5);
  const id = `bear-off-slab-${React.useId().replace(/:/g, '')}`;
  const radius = Math.min(thickness / 2, 2);
  return (
    <View testID="bear-off-slab" style={[{ width, height: thickness }, style]}>
      <Svg width={width} height={thickness}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={edge} />
            <Stop offset="0.3" stopColor={slab.fill} />
            <Stop offset="0.5" stopColor={centre} />
            <Stop offset="0.7" stopColor={slab.fill} />
            <Stop offset="1" stopColor={edge} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={thickness} rx={radius} fill={`url(#${id})`} />
        <Rect x={0.5} y={0.5} width={width - 1} height={Math.max(0, thickness - 1)} rx={radius} fill="none" stroke={player === 'black' ? slab.rim : slab.separator} strokeWidth={1} strokeOpacity={player === 'black' ? 0.8 : 0.6} />
        {thickness >= 4 && <Rect x={radius} y={0.5} width={width - 2 * radius} height={1} fill="#FFFFFF" fillOpacity={player === 'black' ? 0.1 : 0.35} />}
      </Svg>
    </View>
  );
}

function BearOffStack({
  cubeFootprint,
  count,
  player,
  halfHeight,
  width,
  checkerSize,
  middleHeight,
  isLegalTarget,
  isTargetSide,
}: StackProps) {
  const visible = Math.min(count, BEAR_OFF_MAX_CHECKERS);
  const slot = {
    cubeFootprint,
    halfHeight,
    tokenSize: bearOffTokenSize(checkerSize),
    middleHeight,
    player,
  };
  const layout = bearOffStackLayout(slot);
  // Inside the tray's 1px left border; an even margin keeps edges on whole pixels.
  const innerWidth = Math.round(width) - 1;
  const slabWidth = Math.max(8, innerWidth - 6);
  const left = (innerWidth - slabWidth) / 2;
  const showTarget = isLegalTarget && isTargetSide;
  // An empty tray shows the outline of five checkers where they will land.
  const emptyLength = bearOffSlabOffset(layout, 4) + layout.thickness;
  const emptyTop = player === 'black'
    ? layout.start
    : halfHeight - layout.start - emptyLength;
  // The count follows the newest checker toward the hinge.
  const stackEnd = layout.start + (visible > 0 ? bearOffSlabOffset(layout, visible - 1) + layout.thickness : 0) + 1;
  const countTop = player === 'black' ? stackEnd : halfHeight - stackEnd - BEAR_OFF_COUNT_HEIGHT;

  return (
    <View
      style={{
        height: halfHeight,
        width: innerWidth,
        overflow: 'hidden',
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
            left,
            width: slabWidth,
            height: emptyLength,
            borderRadius: 2,
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
            left,
            top: bearOffSlotTopInSection({ ...slot, slotIndex }),
          }}
        />
      ))}

      {count > 0 && (
        <Text
          testID={`bear-off-count-${player}`}
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={{
            ...interFont('bold'),
            position: 'absolute',
            left: 0,
            width: innerWidth,
            top: countTop,
            height: BEAR_OFF_COUNT_HEIGHT,
            fontSize: 10,
            lineHeight: BEAR_OFF_COUNT_HEIGHT,
            textAlign: 'center',
            fontVariant: ['tabular-nums'],
            color: '#E8D9B8',
          }}
        >
          {visible}
        </Text>
      )}
    </View>
  );
}

function trayLabel(white: number, black: number): string {
  const off = translate('game.status.off_short');
  return `${translate('game.controls.bear_off_a11y')}. ${translate('positions.white')}: ${white} ${off}. ${translate('positions.black')}: ${black} ${off}`;
}

export function BearOffArea({
  cubeFootprint,
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
      accessibilityLabel={trayLabel(whiteBorneOff, blackBorneOff)}
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
        cubeFootprint={cubeFootprint}
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
        cubeFootprint={cubeFootprint}
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
