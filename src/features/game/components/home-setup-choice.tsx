import type { LayoutChangeEvent, TextStyle } from 'react-native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { HOME_INK } from './home-ink';
import {
  measureSegmentWordWidth,
  SEGMENT_LABEL_MIN_SCALE,
  SEGMENT_LABEL_SIZE,
  segmentLabelFontSize,
} from './segment-label-font-size';

type Option<T> = { value: T; label: string; accessibilityLabel?: string; testID: string };

const OPTION_X_PADDING = 6;
/** Last-resort floor if a laid-out label still overflows after the measured size. */
const DOM_FIT_MIN_PX = 5;

/**
 * A segmented control on a wooden track. The chosen option is an ivory tile,
 * like a checker; the screen keeps its amber for the one Play button.
 */
export function HomeSetupChoice<T extends string | number>({ label, value, options, onChange }: {
  /** Names the group for screen readers; the options speak for themselves on screen. */
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(option => (
        <ChoiceOption
          key={option.value}
          option={option}
          selected={value === option.value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

function ChoiceOption<T extends string | number>({ option, selected, onPress }: {
  option: Option<T>;
  selected: boolean;
  onPress: () => void;
}) {
  const { fontSize, textRef, handleLayout } = useSegmentLabelFit(option.label);
  const nativeFit = Platform.OS !== 'web'
    ? { numberOfLines: 2 as const, adjustsFontSizeToFit: true, minimumFontScale: SEGMENT_LABEL_MIN_SCALE }
    : null;

  return (
    <HoverPressable
      testID={option.testID}
      accessibilityRole="radio"
      accessibilityLabel={option.accessibilityLabel ?? option.label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      onLayout={handleLayout}
      style={({ pressed, hovered }) => [
        styles.option,
        hovered && !selected && styles.hovered,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        ref={textRef}
        style={[
          styles.text,
          selected && styles.selectedText,
          fontSize !== SEGMENT_LABEL_SIZE && {
            fontSize,
            lineHeight: Math.round(fontSize * 18 / SEGMENT_LABEL_SIZE),
          },
          Platform.OS === 'web' ? styles.noMidWordBreak : null,
        ]}
        {...nativeFit}
      >
        {option.label}
      </Text>
    </HoverPressable>
  );
}

/**
 * Web-only shrink-to-fit for a segment label. Native uses adjustsFontSizeToFit.
 * Remeasures after Inter loads, and shrinks from the canvas word width against
 * the pill's content box — not scrollWidth, which line-clamp can hide.
 */
function useSegmentLabelFit(label: string) {
  const [innerWidth, setInnerWidth] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);
  const [overflowSize, setOverflowSize] = useState<number | null>(null);
  const [fitKey, setFitKey] = useState('');
  const textRef = useRef<Text>(null);
  const nextFitKey = `${label}|${innerWidth}|${fontsReady}`;
  if (fitKey !== nextFitKey) {
    setFitKey(nextFitKey);
    if (overflowSize != null) {
      setOverflowSize(null);
    }
  }

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !document.fonts) {
      return;
    }
    let cancelled = false;
    const markReady = () => {
      if (cancelled) {
        return;
      }
      setFontsReady(true);
    };
    void document.fonts.ready.then(markReady);
    document.fonts.addEventListener('loadingdone', markReady);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener('loadingdone', markReady);
    };
  }, []);

  const estimated = segmentLabelFontSize({
    label,
    innerWidth,
    measure: measureSegmentWordWidth,
  });
  const fontSize = overflowSize ?? estimated;

  useLayoutEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    const el = textRef.current as unknown as HTMLElement | null;
    if (!el) {
      return;
    }
    const fit = () => {
      const parent = el.parentElement;
      if (!parent) {
        return;
      }
      const cs = getComputedStyle(parent);
      const available = parent.clientWidth
        - (Number.parseFloat(cs.paddingLeft) || 0)
        - (Number.parseFloat(cs.paddingRight) || 0)
        - 1;
      const needed = Math.max(
        ...label.split(/\s+/).filter(Boolean).map(word => measureSegmentWordWidth(word, fontSize)),
      );
      if (available <= 0 || needed <= available) {
        return;
      }
      const next = Math.max(
        DOM_FIT_MIN_PX,
        Math.floor(fontSize * (available / needed) * 10) / 10,
      );
      if (next < fontSize) {
        setOverflowSize(next);
      }
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    const raf = requestAnimationFrame(fit);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [fontSize, label, innerWidth, fontsReady]);

  const handleLayout = (event: LayoutChangeEvent) => {
    if (Platform.OS !== 'web') {
      return;
    }
    const next = Math.max(0, Math.floor(event.nativeEvent.layout.width - OPTION_X_PADDING * 2));
    setInnerWidth(prev => (prev === next ? prev : next));
  };

  return { fontSize, textRef, handleLayout };
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: HOME_INK.hairline,
  },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: OPTION_X_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  // Long labels ("Gegen Computer" at 320) wrap to a second line instead of losing their end.
  text: { color: HOME_INK.muted, fontSize: SEGMENT_LABEL_SIZE, lineHeight: 18, textAlign: 'center', ...interFont('semibold') },
  // Web only: RN Web defaults can break a word mid-letter, and line-clamp
  // ellipsis turns a 0.25px overflow into "Medi…". Never ellipsize; shrink
  // instead, and wrap only at spaces.
  noMidWordBreak: {
    wordBreak: 'normal',
    overflowWrap: 'normal',
    textOverflow: 'clip',
  } as TextStyle,
  selected: {
    backgroundColor: HOME_INK.ivory,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  selectedText: { color: GAME_PALETTE.bg },
  hovered: { backgroundColor: 'rgba(236, 228, 212, 0.08)' },
  pressed: { opacity: 0.8 },
});
