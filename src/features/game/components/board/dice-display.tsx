import type * as React from 'react';
import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { setOpeningTraySlots } from '@/features/game/opening-ceremony-gate';

type Props = {
  dice: [number, number];
  remainingDice: number[];
  playerColor: 'white' | 'black';
  displayStyle?: DiceDisplayStyle;
  /** When false, dice values update instantly (review scrub, etc.). */
  animateRoll?: boolean;
  /** Report die centers in window coords for the opening fly-in. */
  reportTraySlots?: boolean;
};

const DOUBLE_DIE_SLOTS = ['slot-a', 'slot-b', 'slot-c', 'slot-d'] as const;

const DOT_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]],
};

function diceKey(dice: [number, number]): string {
  return `${dice[0]},${dice[1]}`;
}

function hasRolledDice(dice: [number, number]): boolean {
  return dice[0] !== 0 || dice[1] !== 0;
}

/** Gentle settle pulse on a new roll — no flashing random values. */
function useDiceRollAnimation(dice: [number, number], animateRoll: boolean) {
  const lastKey = useRef<string | null>(null);
  const dieScale = useSharedValue(1);

  useEffect(() => {
    const key = diceKey(dice);
    if (!hasRolledDice(dice)) {
      lastKey.current = null;
      dieScale.value = 1;
      return;
    }
    if (lastKey.current === null) {
      lastKey.current = key;
      return;
    }
    if (key === lastKey.current || !animateRoll || !hasRolledDice(dice)) {
      lastKey.current = key;
      return;
    }
    lastKey.current = key;
    dieScale.value = withSequence(
      withTiming(1.08, { duration: 160 }),
      withTiming(1, { duration: 220 }),
    );
  }, [dice, animateRoll, dieScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dieScale.value }],
  }));

  return { containerStyle, showDice: hasRolledDice(dice) };
}

function DieDots({ value, dotColor }: { value: number; dotColor: string }) {
  const layout = DOT_LAYOUTS[value] ?? DOT_LAYOUTS[1]!;
  return (
    <View style={StyleSheet.absoluteFill}>
      {layout.map(([x, y]) => (
        <View
          key={`${x}-${y}`}
          style={{
            position: 'absolute',
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: 7,
            height: 7,
            marginLeft: -3.5,
            marginTop: -3.5,
            borderRadius: 4,
            backgroundColor: dotColor,
          }}
        />
      ))}
    </View>
  );
}

function DieFace({
  value,
  used,
  playerColor,
  displayStyle,
}: {
  value: number;
  used: boolean;
  playerColor: 'white' | 'black';
  displayStyle: DiceDisplayStyle;
}) {
  const isWhite = playerColor === 'white';
  const bg = used
    ? 'rgba(100,80,60,0.4)'
    : isWhite
      ? '#F2EAD3'
      : '#1E1E30';
  const border = used
    ? '#5A4030'
    : isWhite
      ? '#BBA070'
      : '#5050A0';
  const fg = used ? '#7A6050' : isWhite ? '#2A1A08' : '#E0E0FF';

  return (
    <View
      style={[
        styles.die,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: used ? 0.4 : 1,
        },
      ]}
    >
      {displayStyle === 'dots'
        ? <DieDots value={value} dotColor={fg} />
        : (
            <Text style={[styles.dieText, { color: fg }]}>
              {value}
            </Text>
          )}
    </View>
  );
}

function EmptyDiePlaceholder() {
  return <View style={[styles.die, styles.diePlaceholder]} />;
}

function centerFromBox(x: number, y: number, size: { w: number; h: number }) {
  if (size.w <= 0 || size.h <= 0) {
    return null;
  }
  return { x: x + size.w / 2, y: y + size.h / 2 };
}

function DiceFaces({
  dice,
  remainingDice,
  playerColor,
  displayStyle,
  leftRef,
  rightRef,
  onSlotLayout,
}: {
  dice: [number, number];
  remainingDice: number[];
  playerColor: 'white' | 'black';
  displayStyle: DiceDisplayStyle;
  leftRef: React.RefObject<View | null>;
  rightRef: React.RefObject<View | null>;
  onSlotLayout: () => void;
}) {
  const remaining = [...remainingDice];
  const diceStates = dice.map((v) => {
    const idx = remaining.indexOf(v);
    if (idx !== -1) {
      remaining.splice(idx, 1);
      return { value: v, used: false };
    }
    return { value: v, used: true };
  });
  const isDoubles = dice[0] === dice[1];
  const totalRemaining = remainingDice.filter(v => v === dice[0]).length;

  if (isDoubles) {
    return DOUBLE_DIE_SLOTS.map((slot, slotIndex) => (
      <View
        key={slot}
        ref={slotIndex === 0 ? leftRef : rightRef}
        collapsable={false}
        onLayout={onSlotLayout}
      >
        <DieFace
          value={dice[0]}
          used={slotIndex >= totalRemaining}
          playerColor={playerColor}
          displayStyle={displayStyle}
        />
      </View>
    ));
  }

  return (
    <>
      {diceStates[0] && (
        <View ref={leftRef} collapsable={false} onLayout={onSlotLayout}>
          <DieFace
            key="die-left"
            value={diceStates[0].value}
            used={diceStates[0].used}
            playerColor={playerColor}
            displayStyle={displayStyle}
          />
        </View>
      )}
      {diceStates[1] && (
        <View ref={rightRef} collapsable={false} onLayout={onSlotLayout}>
          <DieFace
            key="die-right"
            value={diceStates[1].value}
            used={diceStates[1].used}
            playerColor={playerColor}
            displayStyle={displayStyle}
          />
        </View>
      )}
    </>
  );
}

function DiceDisplayAnimated({
  dice,
  remainingDice,
  playerColor,
  displayStyle = 'numbers',
  animateRoll = true,
  reportTraySlots = false,
}: Props) {
  const { containerStyle, showDice } = useDiceRollAnimation(dice, animateRoll);
  const leftRef = useRef<View>(null);
  const rightRef = useRef<View>(null);
  const dieA = dice[0];
  const dieB = dice[1];

  const publishSlots = useCallback(() => {
    if (!reportTraySlots) {
      return;
    }
    leftRef.current?.measureInWindow((...leftBox: number[]) => {
      const left = centerFromBox(leftBox[0]!, leftBox[1]!, { w: leftBox[2]!, h: leftBox[3]! });
      rightRef.current?.measureInWindow((...rightBox: number[]) => {
        const right = centerFromBox(rightBox[0]!, rightBox[1]!, { w: rightBox[2]!, h: rightBox[3]! });
        if (!left || !right) {
          return;
        }
        setOpeningTraySlots({ left, right });
      });
    });
  }, [reportTraySlots]);

  useEffect(() => {
    if (!reportTraySlots) {
      return;
    }
    const id = requestAnimationFrame(publishSlots);
    return () => cancelAnimationFrame(id);
  }, [publishSlots, reportTraySlots, showDice, dieA, dieB]);

  if (!showDice) {
    return (
      <Animated.View style={[styles.container, containerStyle]} onLayout={publishSlots}>
        <View ref={leftRef} collapsable={false} onLayout={publishSlots}>
          <EmptyDiePlaceholder />
        </View>
        <View ref={rightRef} collapsable={false} onLayout={publishSlots}>
          <EmptyDiePlaceholder />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, containerStyle]} onLayout={publishSlots}>
      <DiceFaces
        dice={dice}
        remainingDice={remainingDice}
        playerColor={playerColor}
        displayStyle={displayStyle}
        leftRef={leftRef}
        rightRef={rightRef}
        onSlotLayout={publishSlots}
      />
    </Animated.View>
  );
}

export function DiceDisplay({
  dice,
  remainingDice,
  playerColor,
  displayStyle = 'numbers',
  animateRoll = true,
  reportTraySlots = false,
}: Props) {
  return (
    <DiceDisplayAnimated
      dice={dice}
      remainingDice={remainingDice}
      playerColor={playerColor}
      displayStyle={displayStyle}
      animateRoll={animateRoll}
      reportTraySlots={reportTraySlots}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  die: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  diePlaceholder: {
    backgroundColor: 'rgba(80,60,40,0.25)',
    borderColor: 'rgba(90,70,50,0.35)',
    opacity: 0.5,
  },
  dieText: {
    fontSize: 22,
    fontWeight: '800',
  },
});
