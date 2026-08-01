import type { Challenge } from '@/lib/learn/challenges';

import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

type Props = {
  challenge: Challenge;
  completed: boolean;
  unlocked: boolean;
  stars: 0 | 1 | 2 | 3;
  isCurrent: boolean;
  onPress: () => void;
};

function StarsDisplay({ stars }: { stars: 0 | 1 | 2 | 3 }) {
  if (stars === 0) {
    return null;
  }
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3].map(s => (
        <Text key={s} style={[styles.miniStar, s > stars && styles.starEmpty]}>
          ★
        </Text>
      ))}
    </View>
  );
}

export function SkillTreeNode({
  challenge,
  completed,
  unlocked,
  stars,
  isCurrent,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !unlocked }}
      accessibilityLabel={`${translate(challenge.titleKey as Parameters<typeof translate>[0])} — ${completed ? translate('learn.a11y_stars', { count: stars }) : unlocked ? translate('learn.a11y_available') : translate('learn.a11y_locked')}`}
      disabled={!unlocked}
      style={({ pressed }) => [
        styles.node,
        completed && styles.nodeCompleted,
        isCurrent && !completed && styles.nodeCurrent,
        !unlocked && styles.nodeLocked,
        pressed && unlocked && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconCol}>
        <View
          style={[
            styles.iconCircle,
            completed && styles.iconCompleted,
            isCurrent && !completed && styles.iconCurrent,
          ]}
        >
          {completed
            ? (
                <Feather name="check" size={18} color={GAME_PALETTE.bg} />
              )
            : (
                <Text style={styles.orderText}>{challenge.order}</Text>
              )}
        </View>
      </View>

      <View style={styles.textCol}>
        <Text style={[styles.title, !unlocked && styles.titleLocked]}>
          {translate(challenge.titleKey as Parameters<typeof translate>[0])}
        </Text>
        <Text style={styles.subtitle}>
          {unlocked
            ? translate(challenge.subtitleKey as Parameters<typeof translate>[0])
            : translate('learn.locked')}
        </Text>
        {completed && <StarsDisplay stars={stars} />}
      </View>

      <Feather
        name={completed ? 'check-circle' : unlocked ? 'chevron-right' : 'lock'}
        size={18}
        color={completed ? '#A0D080' : unlocked ? GAME_PALETTE.accent : GAME_PALETTE.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: GAME_PALETTE.surface,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    ...continuousRadius(14),
  },
  nodeCompleted: {
    borderColor: 'rgba(160, 208, 128, 0.3)',
  },
  nodeCurrent: {
    borderColor: GAME_PALETTE.accent,
  },
  nodeLocked: {
    opacity: 0.5,
  },
  iconCol: {
    width: 36,
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: GAME_PALETTE.accentDim,
    backgroundColor: GAME_PALETTE.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCompleted: {
    backgroundColor: '#A0D080',
    borderColor: '#A0D080',
  },
  iconCurrent: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: 'rgba(212, 168, 67, 0.15)',
  },
  orderText: {
    color: GAME_PALETTE.accent,
    fontSize: 14,
    ...interFont('bold'),
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: GAME_PALETTE.text,
    fontSize: 16,
    ...interFont('bold'),
  },
  titleLocked: {
    color: GAME_PALETTE.textMuted,
  },
  subtitle: {
    color: GAME_PALETTE.textMuted,
    fontSize: 12,
    ...interFont('regular'),
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  miniStar: {
    fontSize: 12,
    color: GAME_PALETTE.accent,
  },
  starEmpty: {
    opacity: 0.3,
  },
  pressed: {
    opacity: 0.88,
  },
});
