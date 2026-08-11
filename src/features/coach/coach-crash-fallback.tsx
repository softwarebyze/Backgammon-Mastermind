import type { FallbackProps } from 'react-error-boundary';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function CoachCrashFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <View style={styles.coachCrash} testID="coach-crash-fallback">
      <Text style={styles.coachCrashText}>
        Coach crashed (WebLLM). Game is still playable.
      </Text>
      <Text style={styles.coachCrashDetail} numberOfLines={3}>{message}</Text>
      <Pressable onPress={resetErrorBoundary} style={styles.coachCrashBtn} testID="coach-crash-retry">
        <Text style={styles.coachCrashBtnText}>Retry coach</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  coachCrash: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#2A1408',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 196, 153, 0.25)',
    gap: 6,
  },
  coachCrashText: {
    color: '#F2EAD3',
    fontSize: 14,
    fontWeight: '600',
  },
  coachCrashDetail: {
    color: '#E8A0A0',
    fontSize: 12,
  },
  coachCrashBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#8B1A1A',
  },
  coachCrashBtnText: {
    color: '#FFF8EE',
    fontSize: 13,
    fontWeight: '600',
  },
});
