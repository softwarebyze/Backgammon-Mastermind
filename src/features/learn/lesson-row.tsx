import type { TxKeyPath } from '@/lib/i18n';
import type { LessonDefinition } from '@/lib/learn/curriculum';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { HoverPressable } from '@/components/ui/hover-pressable';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { LEARN_INK } from '@/features/learn/learn-ink';
import { translate, useLayoutIsRTL } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  lesson: LessonDefinition;
  completed: boolean;
  /** The lesson the course suggests next: its number and arrow are lit. */
  next?: boolean;
  /** Last in its chapter: no rule under it. */
  last?: boolean;
  onPress: () => void;
};

/**
 * One lesson in a chapter. A finished lesson's number becomes an ivory
 * checker with a tick; every lesson opens whether or not it is done.
 */
export function LessonRow({ lesson, completed, next = false, last = false, onPress }: Props) {
  const layoutIsRTL = useLayoutIsRTL();
  return (
    <HoverPressable
      accessibilityRole="button"
      testID={`learn-lesson-${lesson.id}`}
      accessibilityLabel={completed
        ? `${translate(lesson.titleKey as TxKeyPath)}, ${translate('learn.replay')}`
        : translate(lesson.titleKey as TxKeyPath)}
      accessibilityHint={completed ? translate('learn.replay') : undefined}
      style={({ pressed, hovered }) => [
        styles.lessonRow,
        !last && styles.ruled,
        hovered && styles.hovered,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.badge, next && styles.badgeNext, completed && styles.badgeDone]}>
        {completed
          ? <Feather name="check" size={16} color={GAME_PALETTE.bg} />
          : <Text style={[styles.badgeText, next && styles.badgeTextNext]}>{lesson.order}</Text>}
      </View>
      <View style={styles.lessonText}>
        <Text style={styles.lessonTitle}>
          {translate(lesson.titleKey as TxKeyPath)}
        </Text>
        <Text style={styles.lessonSub}>
          {translate(lesson.subtitleKey as TxKeyPath)}
        </Text>
      </View>
      <Feather
        name={completed ? 'rotate-ccw' : layoutIsRTL ? 'chevron-left' : 'chevron-right'}
        size={completed ? 16 : 18}
        color={next ? GAME_PALETTE.accent : LEARN_INK.muted}
      />
    </HoverPressable>
  );
}

const styles = StyleSheet.create({
  lessonRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ruled: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LEARN_INK.rule,
  },
  badge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: LEARN_INK.rule,
  },
  badgeNext: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: 'rgba(255, 137, 51, 0.12)',
  },
  // A lesson done is a checker home: the ivory of the board's own pieces.
  badgeDone: {
    borderColor: LEARN_INK.ivory,
    backgroundColor: LEARN_INK.ivory,
  },
  badgeText: {
    color: LEARN_INK.muted,
    fontSize: 14,
    ...interFont('bold'),
  },
  badgeTextNext: {
    color: GAME_PALETTE.accent,
  },
  lessonText: {
    flex: 1,
    gap: 2,
  },
  lessonTitle: {
    color: LEARN_INK.ivory,
    fontSize: 16,
    lineHeight: 21,
    ...interFont('semibold'),
  },
  lessonSub: {
    color: LEARN_INK.muted,
    fontSize: 13,
    lineHeight: 18,
    ...interFont('regular'),
  },
  hovered: {
    backgroundColor: 'rgba(236, 228, 212, 0.05)',
  },
  pressed: {
    opacity: 0.8,
  },
});
