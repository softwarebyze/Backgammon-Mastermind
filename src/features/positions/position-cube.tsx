import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game/types';
import type { Position } from '@/lib/positions/position';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { hapticSelection } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { boardCubeLayout, cubeSlotOffset, snapCubeSlot, stepCubeSlot } from './board-cube-layout';
import { BoardPicker } from './position-board-picker';
import { pickerStyles } from './position-picker-styles';
import { styles } from './position-styles';

function cubeLabel(p: Position): string {
  const owner = translate(p.context.cubeOwner ? `positions.${p.context.cubeOwner}` : 'positions.center');
  return `${translate('positions.cube')}: ${2 ** p.context.cubeExponent}. ${translate('positions.cube_owner')}: ${owner}${p.context.crawford ? `. ${translate('positions.crawford')}` : ''}`;
}

/** Extra touch area around the cube, so a small tray cube is still easy to hit. */
const TOUCH_PAD = 12;
const SPRING = { damping: 18, stiffness: 260, mass: 0.6 };
const OWNERS = ['black', null, 'white'] as const;
/** 64 is the highest cube in practice; larger values stay reachable if already set. */
const PICKER_MAX_EXPONENT = 6;

/**
 * The one cube, in the bear-off tray. A tap opens every value and owner at
 * once; a vertical drag moves it between Black (top), the centre and White
 * (bottom). It cannot slide anywhere else.
 */
export function BoardCube({ position: p, dimensions, onChange }: {
  position: Position;
  dimensions: BoardDimensions;
  onChange: (patch: Partial<Position['context']>) => void;
}) {
  const c = p.context;
  const [picking, setPicking] = useState(false);
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
  const open = () => setPicking(true);

  // No doubling in the Crawford game: the cube stays at 1 in the middle and cannot be changed.
  const locked = c.crawford;
  const pan = Gesture.Pan()
    .enabled(!locked)
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
  const tap = Gesture.Tap().enabled(!locked).onEnd(() => {
    runOnJS(open)();
  });

  const moving = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const track = useAnimatedStyle(() => ({ opacity: dragging.value }));
  const up = stepCubeSlot(c.cubeOwner, -1);
  const down = stepCubeSlot(c.cubeOwner, 1);

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.cubeTrack, { left: left + size / 2 - 1, top: top + size / 2 - travel, height: travel * 2 }, track]}>
        {[0, 1, 2].map(i => <View key={i} style={[styles.cubeTrackStop, { top: i * travel - 3 }]} />)}
      </Animated.View>
      <Animated.View style={[styles.boardCube, { left: left - TOUCH_PAD, top: top - TOUCH_PAD }, moving]}>
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
          <View
            testID="position-cube"
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={cubeLabel(p)}
            accessibilityHint={locked ? undefined : translate('positions.cube_hint')}
            accessibilityState={{ disabled: locked }}
            accessibilityActions={locked ? [] : cubeActions(up, down)}
            onAccessibilityAction={(e) => {
              const name = e.nativeEvent.actionName;
              if (name === 'activate')
                open();
              else if (name === 'increment')
                setValue(Math.min(c.maxCube, c.cubeExponent + 1));
              else if (name === 'decrement')
                setValue(Math.max(0, c.cubeExponent - 1));
              else
                moveTo(name === 'up' ? up : down);
            }}
            style={{ padding: TOUCH_PAD }}
          >
            <DoublingCubeFace value={2 ** c.cubeExponent} unavailable={c.crawford} size={size} />
          </View>
        </GestureDetector>
      </Animated.View>
      {picking && !locked && (
        <CubePicker
          exponent={c.cubeExponent}
          maxCube={c.maxCube}
          owner={c.cubeOwner}
          onValue={setValue}
          onOwner={moveTo}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

function cubeActions(up: Player | null | undefined, down: Player | null | undefined) {
  return [
    { name: 'activate' },
    { name: 'increment' },
    { name: 'decrement' },
    ...(up === undefined ? [] : [{ name: 'up', label: ownerLabel(up) }]),
    ...(down === undefined ? [] : [{ name: 'down', label: ownerLabel(down) }]),
  ];
}

function ownerLabel(slot: Player | null): string {
  return `${translate('positions.cube_owner')}: ${translate(slot ? `positions.${slot}` : 'positions.center')}`;
}

/** Every cube value in one row and the three owners below it. */
function CubePicker({ exponent, maxCube, owner, onValue, onOwner, onClose }: {
  exponent: number;
  maxCube: number;
  owner: Player | null;
  onValue: (exponent: number) => void;
  onOwner: (owner: Player | null) => void;
  onClose: () => void;
}) {
  const title = translate('positions.cube');
  return (
    <BoardPicker
      testID="position-cube-picker"
      title={title}
      onClose={onClose}
      action={(
        <Pressable testID="position-cube-done" accessibilityRole="button" hitSlop={8} onPress={onClose} style={({ pressed }) => [styles.cubeDone, pressed && pickerStyles.pressed]}>
          <Text style={styles.cubeDoneText}>{translate('positions.done')}</Text>
        </Pressable>
      )}
    >
      <View style={pickerStyles.grid}>
        {Array.from({ length: Math.min(maxCube, Math.max(PICKER_MAX_EXPONENT, exponent)) + 1 }, (_, value) => (
          <Pressable
            key={value}
            testID={`position-cube-value-${value}`}
            accessibilityRole="button"
            accessibilityLabel={`${title}: ${2 ** value}`}
            accessibilityState={{ selected: exponent === value }}
            onPress={() => onValue(value)}
            style={({ pressed }) => [styles.cubeValue, exponent === value && styles.cubeValueSelected, pressed && pickerStyles.pressed]}
          >
            <Text style={[styles.cubeValueText, exponent === value && styles.cubeValueTextSelected]}>{2 ** value}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.cubeOwnerLabel}>{translate('positions.cube_owner')}</Text>
      <View style={styles.cubeOwners}>
        {OWNERS.map(slot => (
          <Pressable
            key={slot ?? 'center'}
            testID={`position-cube-owner-${slot ?? 'center'}`}
            accessibilityRole="button"
            accessibilityLabel={ownerLabel(slot)}
            accessibilityState={{ selected: owner === slot }}
            onPress={() => onOwner(slot)}
            style={({ pressed }) => [pickerStyles.pill, styles.cubeOwner, owner === slot && pickerStyles.optionSelected, pressed && pickerStyles.pressed]}
          >
            {slot && <CheckerToken player={slot} size={16} />}
            <Text style={pickerStyles.pillText} numberOfLines={1}>{translate(slot ? `positions.${slot}` : 'positions.center')}</Text>
          </Pressable>
        ))}
      </View>
    </BoardPicker>
  );
}
