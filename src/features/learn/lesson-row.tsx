import type { TxKeyPath } from '@/lib/i18n';
import type { LessonDefinition } from '@/lib/learn/curriculum';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/scaled-text';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  lesson: LessonDefinition;
  completed: boolean;
  onPress: () => void;
};

export function LessonRow({ lesson, completed, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={`learn-lesson-${lesson.id}`}
      accessibilityLabel={completed
        ? `${translate(lesson.titleKey as TxKeyPath)}, ${translate('learn.replay')}`
        : translate(lesson.titleKey as TxKeyPath)}
      accessibilityHint={completed ? translate('learn.replay') : undefined}
      style={({ pressed }) => [
        styles.lessonRow,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.badge, completed && styles.badgeDone]}>
        {completed
          ? <Feather name="check" size={16} color={GAME_PALETTE.bg} />
          : <Text style={styles.badgeText}>{lesson.order}</Text>}
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
        name={completed ? 'refresh-cw' : 'chevron-right'}
        size={18}
        color={GAME_PALETTE.accent}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(14),
  },
  badge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.accentDim,
    ...continuousRadius(14),
  },
  badgeDone: {
    backgroundColor: '#A0D080',
    borderColor: '#A0D080',
  },
  badgeText: {
    color: GAME_PALETTE.accent,
    fontSize: 13,
    ...interFont('bold'),
  },
  lessonText: {
    flex: 1,
    gap: 2,
  },
  lessonTitle: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('bold'),
  },
  lessonSub: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    ...interFont('regular'),
  },
  pressed: {
    opacity: 0.88,
  },
});
