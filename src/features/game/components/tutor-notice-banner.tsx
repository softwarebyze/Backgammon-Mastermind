import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { clearTutorNotice, useTutorNotice } from '@/features/game/tutor-store';
import { hapticLight } from '@/lib/haptics';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

const AUTO_DISMISS_MS = 8000;

/**
 * Tutor mode's blunder flag: a dismissible banner naming the engine's
 * preferred move and the equity the played turn gave up. Tapping dismisses;
 * it also auto-dismisses after a few seconds.
 *
 * Demo branch: strings are English-only.
 */
export function TutorNoticeBanner() {
  const notice = useTutorNotice();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!notice) {
      opacity.value = 0;
      return;
    }
    opacity.value = withTiming(1, { duration: 200 });
    const timer = setTimeout(clearTutorNotice, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [notice, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!notice) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss tutor notice"
        testID="tutor-notice"
        onPress={() => {
          hapticLight();
          clearTutorNotice();
        }}
        style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      >
        <Text style={styles.title}>{notice.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{notice.body}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  banner: {
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    maxWidth: 420,
    ...continuousRadius(12),
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    color: GAME_PALETTE.accent,
    fontSize: 15,
    ...interFont('semibold'),
  },
  body: {
    color: GAME_PALETTE.text,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    ...interFont('regular'),
  },
});
