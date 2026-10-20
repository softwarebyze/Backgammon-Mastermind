import type { TxKeyPath } from '@/lib/i18n';
import type { LessonDefinition } from '@/lib/learn/curriculum';
import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { lessonVisual } from '@/features/learn/lesson-visuals';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  lesson: LessonDefinition;
  completed: boolean;
  unlocked: boolean;
  onPress: () => void;
};

export function LessonRow({ lesson, completed, unlocked, onPress }: Props) {
  const visual = lessonVisual(lesson.id);

  return (
    <Pressable
      testID={`learn-lesson-row-${lesson.id}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !unlocked }}
      accessibilityLabel={completed
        ? `${translate(lesson.titleKey as TxKeyPath)}, ${translate('learn.replay')}`
        : translate(lesson.titleKey as TxKeyPath)}
      accessibilityHint={!unlocked
        ? translate('learn.locked')
        : completed
          ? translate('learn.replay')
          : undefined}
      disabled={!unlocked}
      style={({ pressed }) => [
        styles.lessonRow,
        !unlocked && styles.lessonLocked,
        pressed && unlocked && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconChip,
          { backgroundColor: `${visual.tint}22`, borderColor: `${visual.tint}55` },
          !unlocked && styles.iconChipLocked,
        ]}
      >
        <Feather name={visual.icon} size={18} color={visual.tint} />
      </View>

      <View style={styles.lessonText}>
        <Text style={[styles.lessonTitle, !unlocked && styles.lessonTitleLocked]}>
          {translate(lesson.titleKey as TxKeyPath)}
        </Text>
        <Text style={styles.lessonSub}>{translate(lesson.subtitleKey as TxKeyPath)}</Text>
      </View>

      {completed
        ? (
            <View style={styles.stateChip}>
              <Feather name="check" size={12} color="#4ADE80" />
              <Text style={[styles.stateLabel, styles.stateLabelDone]}>
                {translate('learn.replay')}
              </Text>
            </View>
          )
        : unlocked
          ? (
              <View style={styles.stateChip}>
                <Text style={styles.stateLabel}>{translate('learn.start')}</Text>
                <Feather name="chevron-right" size={16} color={GAME_PALETTE.accent} />
              </View>
            )
          : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(16),
  },
  lessonLocked: {
    backgroundColor: 'rgba(42, 20, 8, 0.55)',
  },
  iconChip: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconChipLocked: {
    opacity: 0.55,
  },
  lessonText: {
    flex: 1,
    gap: 3,
  },
  lessonTitle: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('bold'),
  },
  lessonTitleLocked: {
    color: GAME_PALETTE.textMuted,
  },
  lessonSub: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 16,
    ...interFont('regular'),
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stateLabel: {
    color: GAME_PALETTE.accent,
    fontSize: 12,
    ...interFont('semibold'),
  },
  stateLabelDone: {
    color: '#4ADE80',
  },
  pressed: {
    opacity: 0.88,
  },
});
