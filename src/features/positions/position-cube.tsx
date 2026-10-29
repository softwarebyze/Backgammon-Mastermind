import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { boardCubeLayout, cubeSlotOffset, nextCubeExponent, snapCubeSlot, stepCubeSlot } from './board-cube-layout';
import { styles } from './position-styles';

function cubeLabel(p: Position): string {
  const owner = translate(p.context.cubeOwner ? `positions.${p.context.cubeOwner}` : 'positions.center');
  return `${translate('positions.cube')}: ${2 ** p.context.cubeExponent}. ${translate('positions.cube_owner')}: ${owner}${p.context.crawford ? `. ${translate('positions.crawford')}` : ''}`;
}

/** Chevron strip above and below the cube; also the room it needs in the tray. */
const CHEVRON = 20;
const SPRING = { damping: 18, stiffness: 260, mass: 0.6 };

/**
 * The one cube, in the bear-off tray. ▲ / ▼ beside it, or a vertical drag,
 * move it between Black (top), the centre and White (bottom); it cannot slide
 * anywhere else. A tap doubles it (64 wraps back to the centred 64).
 */
export function BoardCube({ position: p, dimensions, onChange }: {
  position: Position;
  dimensions: BoardDimensions;
  onChange: (patch: Partial<Position['context']>) => void;
}) {
  const c = p.context;
  const { size, left, top, travel } = boardCubeLayout(dimensions);
  const rest = cubeSlotOffset(c.cubeOwner, travel);
  const offset = useSharedValue(rest);
  const start = useSharedValue(0);
  const dragging = useSharedValue(0);
  useEffect(() => {
    offset.value = withSpring(rest, SPRING);
  }, [offset, rest]);

  const moveTo = (slot: Player | null | undefined) => {
    if (slot === undefined)
      return;
    if (slot === c.cubeOwner) {
      offset.value = withSpring(rest, SPRING);
      return;
    }
    hapticSelection();
    onChange({ cubeOwner: slot });
  };
  const settle = (released: number) => moveTo(snapCubeSlot(released, travel));
  const setValue = (exponent: number) => {
    hapticSelection();
    onChange({ cubeExponent: exponent });
  };
  const double = () => setValue(nextCubeExponent(c.cubeExponent, c.maxCube));

  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .failOffsetX([-24, 24])
    .onStart(() => {
      start.value = offset.value;
      dragging.value = withTiming(1, { duration: 120 });
    })
    .onUpdate((e) => {
      offset.value = Math.max(-travel, Math.min(travel, start.value + e.translationY));
    })
    .onFinalize(() => {
      dragging.value = withTiming(0, { duration: 160 });
      runOnJS(settle)(offset.value);
    });
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(double)();
  });

  const moving = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const track = useAnimatedStyle(() => ({ opacity: dragging.value }));
  const up = stepCubeSlot(c.cubeOwner, -1);
  const down = stepCubeSlot(c.cubeOwner, 1);
  const ownerLabel = (slot: Player | null) => `${translate('positions.cube_owner')}: ${translate(slot ? `positions.${slot}` : 'positions.center')}`;

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.cubeTrack, { left: left + size / 2 - 1, top: top + size / 2 - travel, height: travel * 2 }, track]}>
        {[0, 1, 2].map(i => <View key={i} style={[styles.cubeTrackStop, { top: i * travel - 3 }]} />)}
      </Animated.View>
      <Animated.View style={[styles.boardCube, { left: left - CHEVRON / 2, top: top - CHEVRON, width: size + CHEVRON, height: size + CHEVRON * 2 }, moving]}>
        <CubeChevron symbol="chevron-up" label={up === undefined ? '' : ownerLabel(up)} hidden={up === undefined} onPress={() => moveTo(up)} testID="position-cube-up" />
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
          <View
            testID="position-cube"
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={cubeLabel(p)}
            accessibilityHint={translate('positions.cube_hint')}
            accessibilityActions={[
              { name: 'increment' },
              { name: 'decrement' },
              ...(up === undefined ? [] : [{ name: 'up', label: ownerLabel(up) }]),
              ...(down === undefined ? [] : [{ name: 'down', label: ownerLabel(down) }]),
            ]}
            onAccessibilityAction={(e) => {
              const name = e.nativeEvent.actionName;
              if (name === 'increment')
                setValue(Math.min(c.maxCube, c.cubeExponent + 1));
              else if (name === 'decrement')
                setValue(Math.max(0, c.cubeExponent - 1));
              else
                moveTo(name === 'up' ? up : down);
            }}
            style={{ width: size, height: size }}
          >
            <DoublingCubeFace value={2 ** c.cubeExponent} unavailable={c.crawford} size={size} />
          </View>
        </GestureDetector>
        <CubeChevron symbol="chevron-down" label={down === undefined ? '' : ownerLabel(down)} hidden={down === undefined} onPress={() => moveTo(down)} testID="position-cube-down" />
      </Animated.View>
    </>
  );
}

function CubeChevron({ symbol, label, hidden, onPress, testID }: { symbol: 'chevron-up' | 'chevron-down'; label: string; hidden: boolean; onPress: () => void; testID: string }) {
  if (hidden)
    return <View style={styles.cubeChevron} />;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ left: 12, right: 12, top: 4, bottom: 4 }}
      onPress={onPress}
      style={({ pressed }) => [styles.cubeChevron, pressed && styles.pressed]}
    >
      <Feather name={symbol} size={16} color={GAME_PALETTE.text} accessible={false} />
    </Pressable>
  );
}
